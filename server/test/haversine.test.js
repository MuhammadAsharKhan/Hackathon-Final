import test from "node:test";
import assert from "node:assert/strict";
import { distanceMeters } from "../src/utils/haversine.js";

test("distanceMeters is zero for the same point", () => {
  assert.equal(distanceMeters(24.8607, 67.0011, 24.8607, 67.0011), 0);
});

test("distanceMeters measures about 150 meters of latitude", () => {
  // 0.00135 degrees of latitude is about 150 meters on a 6371 km sphere.
  const distance = distanceMeters(24.8607, 67.0011, 24.861998, 67.0011);
  assert.ok(distance > 140 && distance < 160, `unexpected distance ${distance}`);
});

test("distanceMeters handles longitude at the equator", () => {
  const distance = distanceMeters(0, 0, 0, 0.001);
  assert.ok(distance > 110 && distance < 112, `unexpected distance ${distance}`);
});

test("distanceMeters is symmetric", () => {
  const there = distanceMeters(24.86, 67.0, 24.87, 67.01);
  const back = distanceMeters(24.87, 67.01, 24.86, 67.0);
  assert.ok(Math.abs(there - back) < 0.001);
});
