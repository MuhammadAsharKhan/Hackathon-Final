import test from "node:test";
import assert from "node:assert/strict";
import {
  computeCheckInStatus,
  evaluateCameraLocation,
} from "../src/services/attendanceCalc.js";
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

const nearOffice = { lat: 24.8609, lng: 67.0011, accuracy: 20, faceCount: 1 };

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

test("camera check-in inside the radius is accepted", () => {
  const verdict = evaluateCameraLocation({ settings, ...nearOffice });

  assert.equal(verdict.allowed, true);
  assert.ok(verdict.distanceMeters > 0 && verdict.distanceMeters < 150);
});

test("camera check-in is rejected outside the radius", () => {
  const verdict = evaluateCameraLocation({
    settings,
    ...nearOffice,
    lat: 24.87,
    lng: 67.01,
  });

  assert.equal(verdict.allowed, false);
  assert.match(verdict.reason, /outside the 150 meter radius/);
});

test("camera check-in needs exactly one face", () => {
  const none = evaluateCameraLocation({ settings, ...nearOffice, faceCount: 0 });
  const two = evaluateCameraLocation({ settings, ...nearOffice, faceCount: 2 });

  assert.equal(none.allowed, false);
  assert.equal(two.allowed, false);
  assert.match(two.reason, /exactly one face/);
});

test("camera check-in needs an accuracy of 100 meters or better", () => {
  const verdict = evaluateCameraLocation({ settings, ...nearOffice, accuracy: 150 });

  assert.equal(verdict.allowed, false);
  assert.match(verdict.reason, /100 meters or better/);
});

test("camera check-in needs a location", () => {
  const verdict = evaluateCameraLocation({
    settings,
    faceCount: 1,
    accuracy: 10,
  });

  assert.equal(verdict.allowed, false);
  assert.match(verdict.reason, /needs a location/);
});

test("camera check-in needs the office location in settings", () => {
  const verdict = evaluateCameraLocation({
    settings: { ...settings, officeLat: null, officeLng: null },
    ...nearOffice,
  });

  assert.equal(verdict.allowed, false);
  assert.match(verdict.reason, /office location is not set/);
});
