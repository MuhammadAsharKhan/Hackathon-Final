import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEmployeeDays,
  computeCheckInStatus,
  computeCheckOutStatus,
} from "../src/services/attendanceCalc.js";
import { zonedToUtc } from "../src/utils/dates.js";

const settings = {
  timezone: "Asia/Karachi",
  officeStart: "09:00",
  graceMinutes: 15,
  halfDayHours: 5,
  weekendDays: [0, 6],
};

const employee = { joinDate: "2026-10-01", exitDate: null };
const holidaySet = new Set(["2026-10-22"]);

const record = (date, { checkIn, checkOut, status, workedMinutes = 0 }) => ({
  date,
  checkIn: checkIn ? new Date(checkIn) : null,
  checkOut: checkOut ? new Date(checkOut) : null,
  status,
  workedMinutes,
});

const buildDays = ({ employeeOverride, from, to, records = [], leaveDates = [], today }) => {
  const recordMap = new Map(records.map((entry) => [entry.date, entry]));

  return buildEmployeeDays({
    employee: { ...employee, ...employeeOverride },
    from,
    to,
    settings,
    holidaySet,
    records: recordMap,
    approvedLeaveDates: new Set(leaveDates),
    today,
  });
};

const dayFor = (days, date) => days.find((day) => day.date === date);

test("a date before the joining date is not employed", () => {
  const days = buildDays({
    employeeOverride: { joinDate: "2026-10-05" },
    from: "2026-10-01",
    to: "2026-10-05",
    today: "2026-10-24",
  });

  assert.equal(dayFor(days, "2026-10-04").status, "not_employed");
  assert.equal(dayFor(days, "2026-10-05").status, "absent");
});

test("a date after the exit date is not employed", () => {
  const days = buildDays({
    employeeOverride: { exitDate: "2026-10-08" },
    from: "2026-10-07",
    to: "2026-10-09",
    today: "2026-10-24",
  });

  assert.equal(dayFor(days, "2026-10-08").status, "absent");
  assert.equal(dayFor(days, "2026-10-09").status, "not_employed");
});

test("a date after today is future", () => {
  const days = buildDays({
    from: "2026-10-23",
    to: "2026-10-27",
    today: "2026-10-24",
  });

  assert.equal(dayFor(days, "2026-10-23").status, "absent");
  assert.equal(dayFor(days, "2026-10-26").status, "future");
  assert.equal(dayFor(days, "2026-10-26").isWorkingDay, true);
});

test("weekends and holidays are off days", () => {
  const days = buildDays({
    from: "2026-10-22",
    to: "2026-10-25",
    today: "2026-10-24",
  });

  assert.equal(dayFor(days, "2026-10-22").status, "off");
  assert.equal(dayFor(days, "2026-10-22").isWorkingDay, false);
  assert.equal(dayFor(days, "2026-10-24").status, "off");
  // Sunday is after today, so the future rule comes first.
  assert.equal(dayFor(days, "2026-10-25").status, "future");
  assert.equal(dayFor(days, "2026-10-25").isWorkingDay, false);
});

test("a record on a weekend is returned but the day stays off", () => {
  const days = buildDays({
    from: "2026-10-23",
    to: "2026-10-24",
    today: "2026-10-24",
    records: [
      record("2026-10-24", {
        checkIn: zonedToUtc("2026-10-24", "09:00", "Asia/Karachi"),
        checkOut: zonedToUtc("2026-10-24", "18:00", "Asia/Karachi"),
        status: "present",
        workedMinutes: 540,
      }),
    ],
  });

  const saturday = dayFor(days, "2026-10-24");
  assert.equal(saturday.status, "off");
  assert.ok(saturday.record);
  assert.equal(saturday.record.workedMinutes, 540);
});

test("approved leave turns a working day into on_leave", () => {
  const days = buildDays({
    from: "2026-10-20",
    to: "2026-10-20",
    today: "2026-10-24",
    leaveDates: ["2026-10-20"],
  });

  assert.equal(dayFor(days, "2026-10-20").status, "on_leave");
});

test("a working day without a record is absent", () => {
  const days = buildDays({
    from: "2026-10-19",
    to: "2026-10-19",
    today: "2026-10-24",
  });

  assert.equal(dayFor(days, "2026-10-19").status, "absent");
});

test("a present and a late record keep their stored status", () => {
  const days = buildDays({
    from: "2026-10-19",
    to: "2026-10-20",
    today: "2026-10-24",
    records: [
      record("2026-10-19", {
        checkIn: zonedToUtc("2026-10-19", "09:00", "Asia/Karachi"),
        checkOut: zonedToUtc("2026-10-19", "18:00", "Asia/Karachi"),
        status: "present",
        workedMinutes: 540,
      }),
      record("2026-10-20", {
        checkIn: zonedToUtc("2026-10-20", "09:30", "Asia/Karachi"),
        checkOut: zonedToUtc("2026-10-20", "18:00", "Asia/Karachi"),
        status: "late",
        workedMinutes: 510,
      }),
    ],
  });

  assert.equal(dayFor(days, "2026-10-19").status, "present");
  assert.equal(dayFor(days, "2026-10-20").status, "late");
});

test("09:15 is not late and 09:16 is", () => {
  const settingsWithGrace = { ...settings };

  assert.equal(
    computeCheckInStatus(
      zonedToUtc("2026-10-19", "09:15", "Asia/Karachi"),
      settingsWithGrace
    ),
    "present"
  );
  assert.equal(
    computeCheckInStatus(
      zonedToUtc("2026-10-19", "09:16", "Asia/Karachi"),
      settingsWithGrace
    ),
    "late"
  );
});

test("a short day is a half day at 4h59m and present at 5h00m", () => {
  const checkIn = zonedToUtc("2026-10-19", "09:00", "Asia/Karachi");

  const shortDay = computeCheckOutStatus(
    { checkIn, status: "present" },
    new Date(checkIn.getTime() + (4 * 60 + 59) * 60000),
    settings
  );
  assert.equal(shortDay.workedMinutes, 299);
  assert.equal(shortDay.status, "half_day");

  const fullDay = computeCheckOutStatus(
    { checkIn, status: "present" },
    new Date(checkIn.getTime() + 5 * 60 * 60000),
    settings
  );
  assert.equal(fullDay.workedMinutes, 300);
  assert.equal(fullDay.status, "present");
});

test("half day overrides late at check-out", () => {
  const checkIn = zonedToUtc("2026-10-19", "09:30", "Asia/Karachi");

  const result = computeCheckOutStatus(
    { checkIn, status: "late" },
    new Date(checkIn.getTime() + 60 * 60000),
    settings
  );

  assert.equal(result.status, "half_day");

  const longerDay = computeCheckOutStatus(
    { checkIn, status: "late" },
    new Date(checkIn.getTime() + 9 * 60 * 60000),
    settings
  );
  assert.equal(longerDay.status, "late");
});

test("a missing checkout is flagged yesterday but not today", () => {
  const days = buildDays({
    from: "2026-10-23",
    to: "2026-10-24",
    today: "2026-10-24",
    records: [
      record("2026-10-23", {
        checkIn: zonedToUtc("2026-10-23", "09:00", "Asia/Karachi"),
        status: "present",
      }),
      record("2026-10-24", {
        checkIn: zonedToUtc("2026-10-24", "09:00", "Asia/Karachi"),
        status: "present",
      }),
    ],
  });

  // 2026-10-23 is a Friday, 2026-10-24 a Saturday.
  assert.equal(dayFor(days, "2026-10-23").status, "missing_checkout");
  assert.equal(dayFor(days, "2026-10-24").status, "off");
});

test("today without a checkout keeps its stored status", () => {
  const days = buildDays({
    from: "2026-10-20",
    to: "2026-10-20",
    today: "2026-10-20",
    records: [
      record("2026-10-20", {
        checkIn: zonedToUtc("2026-10-20", "09:20", "Asia/Karachi"),
        status: "late",
      }),
    ],
  });

  assert.equal(dayFor(days, "2026-10-20").status, "late");
});
