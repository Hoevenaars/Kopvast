import assert from "node:assert/strict";
import test from "node:test";
import { adminNavigation, customerNavigation, isNavActive, navigationFor } from "./app-nav";
import { destinationForRole, workspaceRoutes } from "./product";

test("klant en admin hebben een eigen navigatie op /klant en /admin", () => {
  assert.equal(destinationForRole("customer"), "/klant");
  assert.equal(workspaceRoutes.adminOnboarding, "/admin/onboarding");
  assert.equal(workspaceRoutes.consoleOnboarding, "/klant/onboarding");
  assert.equal(navigationFor("customer")[0]?.href, "/klant");
  assert.equal(navigationFor("admin")[0]?.href, "/admin");
  assert.ok(customerNavigation.some((item) => item.href === "/klant/wijzigingen"));
  assert.ok(customerNavigation.some((item) => item.href === "/klant/paginas"));
  assert.ok(customerNavigation.some((item) => item.href === "/klant/goedkeuringen"));
  assert.ok(adminNavigation.some((item) => item.href === "/admin/aanvragen"));
  assert.ok(!adminNavigation.some((item) => item.href === "/admin/leads"));
  assert.ok(customerNavigation.some((item) => item.href === "/klant/onboarding"));
  assert.ok(adminNavigation.some((item) => item.href === "/admin/onboarding"));
  assert.ok(adminNavigation.some((item) => item.href === "/admin/opdrachten"));
  assert.ok(adminNavigation.some((item) => item.href === "/admin/gebruikers"));
  assert.ok(adminNavigation.some((item) => item.href === "/admin/automations"));
  assert.ok(adminNavigation.some((item) => item.href === "/admin/taken"));
  assert.ok(adminNavigation.some((item) => item.href === "/admin/acquisitie"));
  assert.ok(adminNavigation.some((item) => item.href === "/admin/facturatie"));
  assert.ok(adminNavigation.some((item) => item.href === "/admin/productie"));
  assert.ok(adminNavigation.some((item) => item.href === "/admin/websites"));
  assert.ok(adminNavigation.some((item) => item.href === "/admin/beheer"));
  assert.ok(adminNavigation.some((item) => item.href === "/admin/support"));
  assert.ok(customerNavigation.some((item) => item.href === "/klant/support"));
  assert.ok(!adminNavigation.some((item) => item.href === "/admin/prospects"));
});

test("actief menu-item volgt het pad zonder de root altijd te markeren", () => {
  assert.equal(isNavActive("/admin", "/admin"), true);
  assert.equal(isNavActive("/admin/acquisitie", "/admin"), false);
  assert.equal(isNavActive("/admin/acquisitie", "/admin/acquisitie"), true);
  assert.equal(isNavActive("/admin/acquisitie/nieuw", "/admin/acquisitie"), true);
  assert.equal(isNavActive("/admin/aanvragen/abc", "/admin/aanvragen"), true);
  assert.equal(isNavActive("/klant/wijzigingen", "/klant"), false);
  assert.equal(isNavActive("/klant/wijzigingen", "/klant/wijzigingen"), true);
  assert.equal(isNavActive("/admin/opdrachten/abc/onboarding", "/admin/onboarding"), true);
  assert.equal(isNavActive("/admin/opdrachten/abc/onboarding", "/admin/opdrachten"), false);
  assert.equal(isNavActive("/admin/opdrachten/abc", "/admin/opdrachten"), true);
  assert.equal(isNavActive("/klant/onboarding", "/klant/onboarding"), true);
});
