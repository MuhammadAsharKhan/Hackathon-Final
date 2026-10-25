import test from "node:test";
import assert from "node:assert/strict";
import { computeCheckInStatus } from "../src/services/attendanceCalc.js";
import { localDateOf, todayIn } from "../src/utils/dates.js";

const settings = {
  timezone: "Asia/Karachi",
  officeStart: "09:00",
  graceMinutes: 15,
  halfDayHours: 5,
  weekendDays: [0, 6],
  officeLat: 24.8607,
  officeLng: 67.0011,
  radiusMeters: 150,
};


test("03:50 UTC is 08:50 in Karachi and not late", () => {
  const instant = new Date("2026-10-19T03:50:00Z");

  assert.equal(localDateOf(instant, "Asia/Karachi"), "2026-10-19");
  assert.equal(computeCheckInStatus(instant, settings), "present");
});

test("04:16 UTC is 09:16 in Karachi and late", () => {
  const instant = new Date("2026-10-19T04:16:00Z");

  assert.equal(computeCheckInStatus(instant, settings), "late");
});

test("a 20:00 UTC check-in belongs to the next local date", () => {
  const instant = new Date("2026-10-20T20:00:00Z");

  assert.equal(localDateOf(instant, "Asia/Karachi"), "2026-10-21");
  assert.equal(todayIn("Asia/Karachi", instant), "2026-10-21");
});

