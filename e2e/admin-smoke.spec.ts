import { expect, test, type Page } from "@playwright/test";
import {
  E2E_ADMIN_DISPLAY_NAME,
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_ENTITY_PREFIX,
  E2E_ADMIN_MANAGED_DISPLAY_NAME,
  E2E_ADMIN_MANAGED_EMAIL,
  E2E_ADMIN_PASSWORD,
} from "./global-setup";

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("/");
}

test("admin management pages support core smoke actions across styles, brands, variants, locations, and users", async ({
  page,
}, testInfo) => {
  const suffix = `${testInfo.workerIndex}-${Date.now()}`;
  const styleName = `${E2E_ADMIN_ENTITY_PREFIX} Style ${suffix}`;
  const brandName = `${E2E_ADMIN_ENTITY_PREFIX} Brand ${suffix}`;
  const variantName = `${E2E_ADMIN_ENTITY_PREFIX} Variant ${suffix}`;
  const locationName = `${E2E_ADMIN_ENTITY_PREFIX} Location ${suffix}`;
  const locationDistrict = `${E2E_ADMIN_ENTITY_PREFIX} District ${suffix}`;
  const locationAddress = `${suffix} Admin Smoke Street 1`;

  await signIn(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Site navigation" })).toContainText(
    E2E_ADMIN_DISPLAY_NAME,
  );

  await page.goto("/admin/styles");
  await expect(page.getByRole("heading", { name: "Style Management" })).toBeVisible();
  await page.fill("#new-style-name", styleName);
  await page.getByRole("button", { name: "Create Style" }).click();
  await expect(page.getByText(`Style "${styleName}" created.`)).toBeVisible();
  await page.fill("#search-styles", styleName);
  await expect(page.locator("li").filter({ hasText: styleName }).first()).toBeVisible();

  await page.goto("/admin/brands");
  await expect(page.getByRole("heading", { name: "Brand Management" })).toBeVisible();
  await page.fill("#new-brand-name", brandName);
  await page.getByRole("button", { name: "Create Brand" }).click();
  await expect(page.getByText(`Brand "${brandName}" created.`)).toBeVisible();
  await page.fill("#search-brands", brandName);
  await expect(page.locator("li").filter({ hasText: brandName }).first()).toBeVisible();

  await page.goto("/admin/variants");
  await expect(page.getByRole("heading", { name: "Variant Management" })).toBeVisible();
  await page.fill("#new-variant-name", variantName);
  await page.selectOption("#new-variant-brand", { label: brandName });
  await page.selectOption("#new-variant-style", { label: styleName });
  await page.getByRole("button", { name: "Create Variant" }).click();
  await expect(page.getByText(`Variant "${variantName}" created.`)).toBeVisible();
  await page.fill("#search-variants", variantName);
  await expect(page.locator("li").filter({ hasText: variantName }).first()).toBeVisible();

  await page.goto("/admin/locations");
  await expect(page.getByRole("heading", { name: "Location Management" })).toBeVisible();
  await page.fill("#new-loc-name", locationName);
  await page.selectOption("#new-loc-type", "bar");
  await page.fill("#new-loc-district", locationDistrict);
  await page.fill("#new-loc-address", locationAddress);
  await page.getByRole("button", { name: "Create Location" }).click();
  await expect(page.getByText(`Location "${locationName}" created.`)).toBeVisible();
  await page.fill("#search-locations", locationName);
  await expect(page.locator("li").filter({ hasText: locationName }).first()).toBeVisible();

  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
  await page.fill("#search-users", E2E_ADMIN_MANAGED_EMAIL);

  let managedUserRow = page.locator("li").filter({ hasText: E2E_ADMIN_MANAGED_EMAIL }).first();
  await expect(managedUserRow).toBeVisible();
  await managedUserRow.locator("button[aria-expanded]").click();
  await managedUserRow.getByRole("button", { name: "Verify Email" }).click();
  await expect(page.getByText("User email verified.")).toBeVisible();

  await page.fill("#search-users", E2E_ADMIN_MANAGED_EMAIL);
  managedUserRow = page.locator("li").filter({ hasText: E2E_ADMIN_MANAGED_EMAIL }).first();
  await expect(managedUserRow).toContainText("verified");
  await managedUserRow.locator("button[aria-expanded]").click();
  await managedUserRow.locator(`select[id^="role-"]`).selectOption("moderator");
  await managedUserRow.getByRole("button", { name: "Save Role" }).click();
  await expect(page.getByText("User role updated.")).toBeVisible();

  await page.fill("#search-users", E2E_ADMIN_MANAGED_EMAIL);
  managedUserRow = page.locator("li").filter({ hasText: E2E_ADMIN_MANAGED_EMAIL }).first();
  await expect(managedUserRow).toContainText(E2E_ADMIN_MANAGED_DISPLAY_NAME);
  await expect(managedUserRow).toContainText("moderator");
});
