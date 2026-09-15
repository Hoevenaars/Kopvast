import assert from "node:assert/strict";
import test from "node:test";
import { validatePassword } from "./password-rules";
import { hashPassword, verifyPassword } from "./passwords";

test("wijst te korte, voorspelbare of e-mailachtige wachtwoorden af", () => {
  assert.equal(validatePassword("kort1").ok, false);
  assert.equal(validatePassword("alleenletters").ok, false);
  assert.equal(validatePassword("wachtwoord123").ok, false);
  assert.equal(validatePassword("contactkopvast1", "contact@kopvast.nl").ok, false);
  assert.equal(validatePassword("SterkAtelier9x").ok, true);
});

test("hasht wachtwoorden met scrypt en vergelijkt timing-safe", async () => {
  const password = "SterkAtelier9x";
  const stored = await hashPassword(password);
  assert.match(stored, /^scrypt\$/);
  assert.equal(stored.includes(password), false);
  assert.equal(await verifyPassword(password, stored), true);
  assert.equal(await verifyPassword("foutwachtwoord1", stored), false);
  assert.equal(await verifyPassword(password, "niet-een-hash"), false);
  const again = await hashPassword(password);
  assert.notEqual(again, stored);
});
