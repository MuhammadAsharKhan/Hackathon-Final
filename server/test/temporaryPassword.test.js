import test from "node:test";
import assert from "node:assert/strict";
import { createTemporaryPassword } from "../src/utils/temporaryPassword.js";

test("temporary passwords are ten letters and digits with both kinds", () => {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const password = createTemporaryPassword();

    assert.equal(password.length, 10);
    assert.match(password, /^[A-Za-z0-9]+$/);
    assert.match(password, /[A-Za-z]/);
    assert.match(password, /[0-9]/);
  }
});

test("temporary passwords differ between accounts", () => {
  const passwords = new Set();
  for (let attempt = 0; attempt < 50; attempt += 1) {
    passwords.add(createTemporaryPassword());
  }

  assert.equal(passwords.size, 50);
});
