import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  countWorkingDays,
  eachDay,
  isWorkingDay,
  listWorkingDays,
  localDateOf,
  localMinutesOfDay,
  monthBounds,
  todayIn,
  weekdayOf,
  zonedToUtc,
} from "../src/utils/dates.js";

const KARACHI = "Asia/Karachi";
const settings = { weekendDays: [0, 6] };

test("todayIn reads the company date, not the server date", () => {
  const lateEveningUtc = new Date("2026-03-10T19:30:00Z");
  assert.equal(todayIn(KARACHI, lateEveningUtc), "2026-03-11");

  const morningUtc = new Date("2026-03-10T04:00:00Z");
  assert.equal(todayIn(KARACHI, morningUtc), "2026-03-10");
});

test("localDateOf and localMinutesOfDay use the company timezone", () => {
  const instant = new Date("2026-03-10T04:15:00Z");
  assert.equal(localDateOf(instant, KARACHI), "2026-03-10");
  assert.equal(localMinutesOfDay(instant, KARACHI), 9 * 60 + 15);
});

test("zonedToUtc converts both ways across the Karachi offset", () => {
  const startOfDay = zonedToUtc("2026-03-11", "09:00", KARACHI);
  assert.equal(startOfDay.toISOString(), "2026-03-11T04:00:00.000Z");

  const graceEnd = zonedToUtc("2026-01-15", "09:15", KARACHI);
  assert.equal(graceEnd.toISOString(), "2026-01-15T04:15:00.000Z");

  const afternoon = zonedToUtc("2026-07-01", "14:45", KARACHI);
  assert.equal(localDateOf(afternoon, KARACHI), "2026-07-01");
  assert.equal(localMinutesOfDay(afternoon, KARACHI), 14 * 60 + 45);
});

test("addDays crosses month and year ends", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(addDays("2024-03-01", -1), "2024-02-29");
  assert.equal(addDays("2026-10-24", 0), "2026-10-24");
});

test("eachDay lists every day between two dates", () => {
  assert.deepEqual(eachDay("2026-02-27", "2026-03-02"), [
    "2026-02-27",
    "2026-02-28",
    "2026-03-01",
    "2026-03-02",
  ]);
  assert.deepEqual(eachDay("2026-03-02", "2026-03-01"), []);
});

test("weekdayOf returns 0 for Sunday", () => {
  assert.equal(weekdayOf("2026-10-25"), 0);
  assert.equal(weekdayOf("2026-10-24"), 6);
  assert.equal(weekdayOf("2026-10-23"), 5);
});

test("isWorkingDay skips weekends and holidays", () => {
  const holidaySet = new Set(["2026-10-23"]);

  assert.equal(isWorkingDay("2026-10-23", settings, holidaySet), false);
  assert.equal(isWorkingDay("2026-10-24", settings, holidaySet), false);
  assert.equal(isWorkingDay("2026-10-25", settings, holidaySet), false);
  assert.equal(isWorkingDay("2026-10-22", settings, holidaySet), true);
  assert.equal(isWorkingDay("2026-10-23", settings, new Set()), true);
});

test("listWorkingDays and countWorkingDays use the settings calendar", () => {
  const holidaySet = new Set(["2026-10-22"]);
  const week = listWorkingDays("2026-10-19", "2026-10-25", settings, holidaySet);

  assert.deepEqual(week, [
    "2026-10-19",
    "2026-10-20",
    "2026-10-21",
    "2026-10-23",
  ]);
  assert.equal(countWorkingDays("2026-10-01", "2026-10-31", settings, holidaySet), 21);
});

test("countWorkingDays handles a weekend that is only Friday", () => {
  const fridayOff = { weekendDays: [5] };
  assert.equal(
    countWorkingDays("2026-10-19", "2026-10-25", fridayOff, new Set()),
    6
  );
});

test("monthBounds returns the first and last day of a month", () => {
  assert.deepEqual(monthBounds("2026-02"), {
    start: "2026-02-01",
    end: "2026-02-28",
  });
  assert.deepEqual(monthBounds("2024-02"), {
    start: "2024-02-01",
    end: "2024-02-29",
  });
  assert.deepEqual(monthBounds("2026-12"), {
    start: "2026-12-01",
    end: "2026-12-31",
  });
});
