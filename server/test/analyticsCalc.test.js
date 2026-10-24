import test from "node:test";
import assert from "node:assert/strict";
import {
  absenteeismOf,
  attendanceRateOf,
  attritionRate,
  countHeadcount,
  emptyAttendanceCounts,
  expectedDaysOf,
  isEmployedOn,
  latePercentOf,
  meanOf,
  tenureBucketOf,
} from "../src/services/analyticsCalc.js";

test("an employee counts from the join date until the day before the exit", () => {
  const employee = { joinDate: "2026-03-01", exitDate: "2026-09-30" };

  assert.equal(isEmployedOn(employee, "2026-02-28"), false);
  assert.equal(isEmployedOn(employee, "2026-03-01"), true);
  assert.equal(isEmployedOn(employee, "2026-09-29"), true);
  assert.equal(isEmployedOn(employee, "2026-09-30"), false);
});

test("headcount counts only the employees employed on the date", () => {
  const employees = [
    { joinDate: "2026-01-01", exitDate: null },
    { joinDate: "2026-01-01", exitDate: "2026-06-15" },
    { joinDate: "2026-08-01", exitDate: null },
  ];

  assert.equal(countHeadcount(employees, "2026-05-01"), 2);
  assert.equal(countHeadcount(employees, "2026-07-01"), 1);
  assert.equal(countHeadcount(employees, "2026-09-01"), 2);
});

test("attrition is exits over the average of both headcounts", () => {
  assert.equal(attritionRate(1, 10, 10), 10);
  assert.equal(attritionRate(2, 10, 14), 16.67);
  assert.equal(attritionRate(0, 0, 0), 0);
  assert.equal(attritionRate(1, 0, 0), 0);
});

test("attendance rate counts half days as a half", () => {
  const counts = {
    ...emptyAttendanceCounts(),
    present: 6,
    late: 1,
    half_day: 2,
    absent: 1,
    missing_checkout: 1,
  };

  // attended = 6 + 1 + 1 + 1 = 9, base = 11
  assert.equal(attendanceRateOf(counts), 0.8182);
  assert.equal(attendanceRateOf(emptyAttendanceCounts()), 0);
});

test("on-leave days stay out of the attendance rate", () => {
  const counts = { ...emptyAttendanceCounts(), present: 2, on_leave: 8 };

  assert.equal(attendanceRateOf(counts), 1);
});

test("late percent is late over present plus late", () => {
  const counts = { ...emptyAttendanceCounts(), present: 3, late: 1 };

  assert.equal(latePercentOf(counts), 0.25);
  assert.equal(latePercentOf(emptyAttendanceCounts()), 0);
});

test("expected days and absenteeism include on-leave days", () => {
  const counts = {
    ...emptyAttendanceCounts(),
    present: 5,
    absent: 2,
    on_leave: 1,
    off: 4,
  };

  assert.equal(expectedDaysOf(counts), 8);
  assert.equal(absenteeismOf(counts), 0.25);
  assert.equal(absenteeismOf(emptyAttendanceCounts()), 0);
});

test("tenure buckets split at one and three years", () => {
  assert.equal(tenureBucketOf("2026-01-01", "2026-06-01"), "under_1");
  assert.equal(tenureBucketOf("2025-01-01", "2026-06-01"), "one_to_three");
  assert.equal(tenureBucketOf("2023-01-01", "2026-06-01"), "over_three");
  assert.equal(tenureBucketOf("2022-06-01", "2026-06-01"), "over_three");
});

test("meanOf rounds to two decimals and handles an empty list", () => {
  assert.equal(meanOf([100000, 150000]), 125000);
  assert.equal(meanOf([1, 2, 2]), 1.67);
  assert.equal(meanOf([]), 0);
});
