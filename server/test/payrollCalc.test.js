import test from "node:test";
import assert from "node:assert/strict";
import { annualTax, calculatePayslip, grossOf } from "../src/services/payrollCalc.js";

const settings = {
  timezone: "Asia/Karachi",
  officeStart: "09:00",
  graceMinutes: 15,
  halfDayHours: 5,
  weekendDays: [0, 6],
};

// October 2026 has 22 working days with a Saturday and Sunday weekend.
const month = "2026-10";
const today = "2026-11-05";

const employee = {
  joinDate: "2026-01-01",
  exitDate: null,
  basicSalary: 100000,
  hraPercent: 40,
  medicalPercent: 10,
};

const day = (date, status, extra = {}) => ({
  date,
  status,
  isWorkingDay: true,
  ...extra,
});

const buildDays = (monthStart = "2026-10-01", monthEnd = "2026-10-31") => {
  const days = [];
  const start = new Date(`${monthStart}T00:00:00Z`);

  for (let index = 0; index < 31; index += 1) {
    const cursor = new Date(start.getTime() + index * 86400000);
    const date = cursor.toISOString().slice(0, 10);
    if (date < monthStart || date > monthEnd) continue;
    const weekday = cursor.getUTCDay();
    days.push(
      day(date, weekday === 0 || weekday === 6 ? "off" : "present", {
        isWorkingDay: weekday !== 0 && weekday !== 6,
      })
    );
  }

  return days;
};

const withStatus = (days, overrides) =>
  days.map((entry) => {
    const match = overrides.find((item) => item.date === entry.date);
    return match ? { ...entry, status: match.status, leavePaid: match.leavePaid } : entry;
  });

test("the worked example from the specification gives 119545.45", () => {
  const days = withStatus(buildDays(), [
    { date: "2026-10-05", status: "absent" },
    { date: "2026-10-06", status: "on_leave", leavePaid: false },
    { date: "2026-10-07", status: "half_day" },
    { date: "2026-10-08", status: "half_day" },
  ]);

  const payslip = calculatePayslip({ employee, month, settings, holidaySet: new Set(), days, today });

  assert.equal(payslip.gross, 150000);
  assert.equal(payslip.workingDays, 22);
  assert.equal(payslip.eligibleDays, 22);
  assert.equal(payslip.perDay, 6818.18);
  assert.equal(payslip.absentDays, 1);
  assert.equal(payslip.unpaidDays, 1);
  assert.equal(payslip.halfDays, 2);
  assert.equal(payslip.attendanceDeduction, 20454.55);
  assert.equal(payslip.annualTax, 120000);
  assert.equal(payslip.tax, 10000);
  assert.equal(payslip.netPay, 119545.45);
});

test("gross is basic times one plus the percentages", () => {
  assert.equal(grossOf(100000), 150000);
  assert.equal(grossOf(50000, 30, 10), 70000);
  assert.equal(grossOf(100000, 0, 0), 100000);
});

test("every tax slab boundary and one rupee above it", () => {
  assert.equal(annualTax(600000), 0);
  assert.equal(annualTax(600001), 0.05);
  assert.equal(annualTax(1200000), 30000);
  assert.equal(annualTax(1200001), 30000.15);
  assert.equal(annualTax(2400000), 210000);
  assert.equal(annualTax(2400001), 210000.25);
  assert.equal(annualTax(3600000), 510000);
  assert.equal(annualTax(3600001), 510000.35);
});

test("a mid month joiner only earns the working days that remain", () => {
  const joiner = { ...employee, joinDate: "2026-10-19" };
  const days = buildDays();

  const payslip = calculatePayslip({
    employee: joiner,
    month,
    settings,
    holidaySet: new Set(),
    days,
    today,
  });

  // 19 October is a Monday, so 19 to 30 October is 10 working days.
  assert.equal(payslip.eligibleDays, 10);
  assert.equal(payslip.workingDays, 22);
  assert.equal(payslip.earnedGross, 68181.82);
  assert.equal(payslip.tax, 4545.45);
  assert.ok(payslip.netPay > 0);
});

test("a mid month leaver earns up to the exit date only", () => {
  const leaver = { ...employee, exitDate: "2026-10-15" };
  const days = buildDays();

  const payslip = calculatePayslip({
    employee: leaver,
    month,
    settings,
    holidaySet: new Set(),
    days,
    today,
  });

  // 1 to 15 October is 11 working days; the exit date itself is not employed.
  assert.equal(payslip.eligibleDays, 11);
  assert.equal(payslip.earnedGross, 75000);
});

test("a month with no absences pays gross minus tax", () => {
  const days = buildDays();

  const payslip = calculatePayslip({
    employee,
    month,
    settings,
    holidaySet: new Set(),
    days,
    today,
  });

  assert.equal(payslip.attendanceDeduction, 0);
  assert.equal(payslip.netPay, Math.round((150000 - payslip.tax) * 100) / 100);
  assert.equal(payslip.netPay, 140000);
});

test("days after today never count as absent", () => {
  const days = buildDays();

  const payslip = calculatePayslip({
    employee,
    month,
    settings,
    holidaySet: new Set(),
    days,
    today: "2026-10-14",
  });

  // Only 1 to 14 October is counted, and none of those days is absent.
  assert.equal(payslip.absentDays, 0);
  assert.equal(payslip.attendanceDeduction, 0);
});

test("a month of absences still never gives a negative net", () => {
  const days = withStatus(
    buildDays(),
    buildDays()
      .filter((entry) => entry.isWorkingDay)
      .map((entry) => ({ date: entry.date, status: "absent" }))
  );

  const payslip = calculatePayslip({
    employee,
    month,
    settings,
    holidaySet: new Set(),
    days,
    today,
  });

  assert.equal(payslip.absentDays, 22);
  assert.equal(payslip.attendanceDeduction, 150000);
  assert.equal(payslip.netPay, 0);
});

test("holidays shorten the working days of the month", () => {
  const days = buildDays().map((entry) =>
    entry.date === "2026-10-14" || entry.date === "2026-10-15"
      ? { ...entry, status: "off", isWorkingDay: false }
      : entry
  );

  const payslip = calculatePayslip({
    employee,
    month,
    settings,
    holidaySet: new Set(["2026-10-14", "2026-10-15"]),
    days,
    today,
  });

  assert.equal(payslip.workingDays, 20);
  assert.equal(payslip.perDay, 7500);
});

test("half days cost half a day each", () => {
  const days = withStatus(buildDays(), [
    { date: "2026-10-05", status: "half_day" },
    { date: "2026-10-06", status: "half_day" },
  ]);

  const payslip = calculatePayslip({
    employee,
    month,
    settings,
    holidaySet: new Set(),
    days,
    today,
  });

  // Two half days cost one full day between them.
  assert.equal(payslip.attendanceDeduction, 6818.18);
  assert.equal(payslip.netPay, 133181.82);
});
