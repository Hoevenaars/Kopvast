import assert from "node:assert/strict";
import test from "node:test";
import { isCredentialLocked } from "./credentials";

test("blokkade geldt alleen zolang locked_until in de toekomst ligt", () => {
  assert.equal(isCredentialLocked(null), false);
  assert.equal(
    isCredentialLocked({
      email: "contact@kopvast.nl",
      password_hash: "scrypt$x",
      password_updated_at: new Date().toISOString(),
      failed_attempts: 5,
      locked_until: new Date(Date.now() - 1000).toISOString(),
    }),
    false
  );
  assert.equal(
    isCredentialLocked({
      email: "contact@kopvast.nl",
      password_hash: "scrypt$x",
      password_updated_at: new Date().toISOString(),
      failed_attempts: 5,
      locked_until: new Date(Date.now() + 60_000).toISOString(),
    }),
    true
  );
});
