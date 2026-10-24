import test from "node:test";
import assert from "node:assert/strict";
import { round2 } from "../src/utils/money.js";

test("round2 keeps two decimals", () => {
  assert.equal(round2(6818.181818), 6818.18);
  assert.equal(round2(20454.5454), 20454.55);
  assert.equal(round2(119545.4545), 119545.45);
  assert.equal(round2(0.1 + 0.2), 0.3);
});

test("round2 leaves exact amounts alone", () => {
  assert.equal(round2(150000), 150000);
  assert.equal(round2(0), 0);
  assert.equal(round2(10000.5), 10000.5);
});
