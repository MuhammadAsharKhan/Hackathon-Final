import test from "node:test";
import assert from "node:assert/strict";
import { evaluateCameraLocation } from "../src/services/attendanceCalc.js";
import { assertSourceAllowsLocation } from "../src/services/attendanceService.js";
import { compareDescriptors } from "../src/services/faceMatch.js";
import {
  checkInSchema,
  checkOutSchema,
  faceEnrollSchema,
} from "../src/validators/attendance.validators.js";
import { distanceMeters } from "../src/utils/haversine.js";

const settings = {
  timezone: "Asia/Karachi",
  officeLat: 24.8607,
  officeLng: 67.0011,
  radiusMeters: 150,
};

// A point about 100 m north of the office, so the distance is a real number
// rather than something the test has to guess.
const nearOffice = { lat: 24.8616, lng: 67.0011, accuracy: 20, faceCount: 1 };

const distanceFromOffice = () =>
  distanceMeters(settings.officeLat, settings.officeLng, nearOffice.lat, nearOffice.lng);

test("camera check-in on the radius line is accepted", () => {
  const verdict = evaluateCameraLocation({
    settings: { ...settings, radiusMeters: distanceFromOffice() },
    ...nearOffice,
  });

  assert.equal(verdict.allowed, true);
  assert.equal(verdict.reason, null);
});

test("camera check-in one metre outside the radius is rejected with both numbers", () => {
  const distance = distanceFromOffice();
  const verdict = evaluateCameraLocation({
    settings: { ...settings, radiusMeters: distance - 1 },
    ...nearOffice,
  });

  assert.equal(verdict.allowed, false);
  assert.match(verdict.reason, /You are \d+ m from the office, the allowed distance is \d+ m/);
  assert.equal(verdict.field, "location");
  assert.ok(verdict.distanceMeters >= distance - 0.001);
});

test("accuracy of exactly 100 m is accepted", () => {
  const verdict = evaluateCameraLocation({ settings, ...nearOffice, accuracy: 100 });

  assert.equal(verdict.allowed, true);
});

test("accuracy of 100.01 m is rejected", () => {
  const verdict = evaluateCameraLocation({ settings, ...nearOffice, accuracy: 100.01 });

  assert.equal(verdict.allowed, false);
  assert.equal(verdict.reason, "Location accuracy is 100 m, it must be 100 m or better");
  assert.equal(verdict.field, "location");
});

test("a missing accuracy is rejected", () => {
  const verdict = evaluateCameraLocation({ settings, ...nearOffice, accuracy: undefined });

  assert.equal(verdict.allowed, false);
  assert.match(verdict.reason, /must be 100 m or better/);
});

test("zero faces, two faces and a string face count are rejected", () => {
  for (const faceCount of [0, 2, "1"]) {
    const verdict = evaluateCameraLocation({ settings, ...nearOffice, faceCount });
    assert.equal(verdict.allowed, false);
    assert.equal(verdict.reason, "Exactly one face must be visible");
  }
});

test("an office location that is not set is rejected", () => {
  const verdict = evaluateCameraLocation({
    settings: { ...settings, officeLat: null, officeLng: null },
    ...nearOffice,
  });

  assert.equal(verdict.allowed, false);
  assert.equal(verdict.reason, "The company office location is not set. Ask your Admin");
  assert.equal(verdict.field, "location");
});

test("a web check-in never rejects on location", () => {
  assert.doesNotThrow(() =>
    assertSourceAllowsLocation(settings, { source: "web", faceCount: 0, accuracy: 500 })
  );
  assert.doesNotThrow(() => assertSourceAllowsLocation(settings, {}));
});

test("a camera check-in outside the radius throws 422 with an errors item", () => {
  assert.throws(
    () =>
      assertSourceAllowsLocation(
        { ...settings, radiusMeters: 10 },
        { source: "camera", ...nearOffice }
      ),
    (error) => {
      assert.equal(error.statusCode, 422);
      assert.match(error.message, /You are/);
      assert.equal(error.errors[0].field, "location");
      return true;
    }
  );
});

test("the validator accepts a complete camera body", () => {
  const result = checkInSchema.safeParse({
    source: "camera",
    faceCount: 1,
    lat: 24.8616,
    lng: 67.0011,
    accuracy: 12,
  });

  assert.equal(result.success, true);
});

test("the validator rejects invalid numbers and unknown sources", () => {
  const base = {
    source: "camera",
    faceCount: 1,
    lat: 24.8616,
    lng: 67.0011,
    accuracy: 12,
  };
  const invalid = [
    { ...base, faceCount: 11 },
    { ...base, faceCount: -1 },
    { ...base, faceCount: 1.5 },
    { ...base, faceCount: "1" },
    { ...base, lat: 91 },
    { ...base, lng: -181 },
    { ...base, accuracy: -1 },
    { ...base, accuracy: 100001 },
    { ...base, accuracy: "12" },
    { ...base, accuracy: Number.NaN },
    { ...base, source: "mobile" },
  ];

  for (const body of invalid) {
    assert.equal(checkInSchema.safeParse(body).success, false, JSON.stringify(body));
  }
});

test("the validator rejects half a coordinate pair", () => {
  assert.equal(checkInSchema.safeParse({ lat: 24.8616 }).success, false);
  assert.equal(checkOutSchema.safeParse({ lng: 67.0011 }).success, false);
});

const descriptorOf = (fill) => Array.from({ length: 128 }, () => fill);

test("identical descriptors match with a distance of zero", () => {
  const result = compareDescriptors(descriptorOf(0.1), descriptorOf(0.1));

  assert.equal(result.ok, true);
  assert.equal(result.distance, 0);
  assert.equal(result.matched, true);
});

test("close descriptors match and far descriptors do not", () => {
  const close = compareDescriptors(descriptorOf(0.1), descriptorOf(0.11));
  const far = compareDescriptors(descriptorOf(0), descriptorOf(1));

  assert.equal(close.matched, true);
  assert.equal(far.matched, false);
});

test("a wrong length or a NaN descriptor cannot be compared", () => {
  assert.equal(compareDescriptors([0.1, 0.2], descriptorOf(0.1)).ok, false);

  const withNaN = descriptorOf(0.1);
  withNaN[7] = Number.NaN;
  assert.equal(compareDescriptors(descriptorOf(0.1), withNaN).ok, false);
});

test("the enrolment validator wants 128 numbers between -2 and 2", () => {
  assert.equal(faceEnrollSchema.safeParse({ descriptor: descriptorOf(0.2) }).success, true);
  assert.equal(faceEnrollSchema.safeParse({ descriptor: descriptorOf(0.2).slice(0, 127) }).success, false);
  assert.equal(faceEnrollSchema.safeParse({ descriptor: descriptorOf(5) }).success, false);
  assert.equal(
    faceEnrollSchema.safeParse({ descriptor: descriptorOf(0.2).map(() => "0.2") }).success,
    false
  );
});

test("the check-out validator accepts the same optional camera fields", () => {
  const result = checkOutSchema.safeParse({
    source: "camera",
    faceCount: 2,
    lat: 10,
    lng: 20,
    accuracy: 40,
  });

  assert.equal(result.success, true);
});
