import test from "node:test";
import assert from "node:assert/strict";
import {
  availableToRequest,
  countLeaveDays,
  exceedsQuota,
  overlapsAny,
  rangesOverlap,
  remainingDays,
} from "../src/services/leaveCalc.js";

const settings = { weekendDays: [0, 6] };

test("leave days skip the weekend", () => {
  // Thursday 22 October to Monday 26 October 2026.
  assert.equal(countLeaveDays("2026-10-22", "2026-10-26", settings, new Set()), 3);
});

test("leave days skip a holiday too", () => {
  const holidaySet = new Set(["2026-10-23"]);

  // Friday is a holiday, so Thursday and Monday remain.
  assert.equal(countLeaveDays("2026-10-22", "2026-10-26", settings, holidaySet), 2);
});

test("a range made of weekend days has no leave days", () => {
  assert.equal(countLeaveDays("2026-10-24", "2026-10-25", settings, new Set()), 0);
});

test("ranges overlap when they touch", () => {
  assert.equal(rangesOverlap("2026-10-20", "2026-10-22", "2026-10-22", "2026-10-23"), true);
  assert.equal(rangesOverlap("2026-10-20", "2026-10-22", "2026-10-23", "2026-10-24"), false);
  assert.equal(overlapsAny("2026-10-20", "2026-10-22", []), false);
  assert.equal(
    overlapsAny("2026-10-20", "2026-10-22", [
      { startDate: "2026-10-21", endDate: "2026-10-25" },
    ]),
    true
  );
});

test("remaining is quota minus approved and pending", () => {
  assert.equal(remainingDays(14, 3, 2), 9);
  assert.equal(remainingDays(14, 0, 0), 14);
  assert.equal(remainingDays(null, 40, 10), null);
});

test("a request over the remaining balance exceeds the quota", () => {
  assert.equal(exceedsQuota(14, 3, 2, 10), true);
  assert.equal(exceedsQuota(14, 3, 2, 9), false);
  assert.equal(exceedsQuota(null, 100, 100, 100), false);
});

test("available days never goes below zero", () => {
  assert.equal(availableToRequest(10, 12, 0), 0);
  assert.equal(availableToRequest(10, 4, 1), 5);
  assert.equal(availableToRequest(null, 4, 1), Number.POSITIVE_INFINITY);
});
