import { expect, test, type Page } from "@playwright/test";
import {
  E2E_AUTH_EMAIL,
  E2E_AUTH_PASSWORD,
  E2E_MODERATOR_EMAIL,
  E2E_MODERATOR_PASSWORD,
} from "./global-setup";

const TEST_SIZE_ML = "777";
const TEST_PRICE_CENTS = "49999";
const TEST_PRICE_LABEL = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
}).format(Number(TEST_PRICE_CENTS) / 100);

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("/");
}

async function signOut(page: Page): Promise<void> {
  const nav = page.getByRole("navigation", { name: "Site navigation" });
  await nav.getByRole("button", { name: "Sign Out" }).click();
  await expect(nav.getByRole("link", { name: "Sign In" })).toBeVisible();
}

test("contributor can submit an offer and moderator can approve it into the public directory", async ({
  page,
}) => {
  await signIn(page, E2E_AUTH_EMAIL, E2E_AUTH_PASSWORD);

  await page.goto("/contribute");
  await expect(page.getByRole("heading", { name: "Contribute" })).toBeVisible();

  const brandName =
    (await page.locator("#offer-brand-id option:checked").textContent())?.trim() ?? "";
  const variantLabel =
    (await page.locator("#offer-variant-id option:checked").textContent())?.trim() ?? "";
  const variantName = variantLabel.split(" (")[0] ?? "";
  const locationId = await page.locator("#offer-location-id").inputValue();

  await page.fill("#offer-size-ml", TEST_SIZE_ML);
  await page.selectOption("#offer-serving", "can");
  await page.fill("#offer-price-cents", TEST_PRICE_CENTS);
  await page.getByRole("button", { name: "Submit Offer / Price Update" }).click();

  await expect(page.getByRole("status")).toContainText("Offer submission created for moderation.");

  await signOut(page);
  await signIn(page, E2E_MODERATOR_EMAIL, E2E_MODERATOR_PASSWORD);

  await page.goto("/moderation");
  await expect(page.getByRole("heading", { name: "Moderation Queue" })).toBeVisible();

  await page.getByRole("button", { name: /Offers \(/ }).click();

  const pendingOfferItem = page
    .locator("li")
    .filter({ hasText: `${brandName} ${variantName}` })
    .filter({ hasText: `${TEST_SIZE_ML} ml` })
    .filter({ hasText: TEST_PRICE_LABEL })
    .first();

  await expect(pendingOfferItem).toBeVisible();
  await pendingOfferItem.getByRole("button", { name: "Approve" }).click();
  await expect(page.locator('p[role="status"]')).toContainText("offer approved.");

  await signOut(page);

  await page.goto(`/?locationId=${encodeURIComponent(locationId)}&sort=price_desc`);

  const publicOfferItem = page
    .locator('[aria-labelledby="results-heading"] li')
    .filter({ hasText: `${brandName} ${variantName}` })
    .filter({ hasText: `${TEST_SIZE_ML} ml` })
    .filter({ hasText: TEST_PRICE_LABEL })
    .first();

  await expect(publicOfferItem).toBeVisible();
});

test("contributor can submit a location and later use it as an approved offer target", async ({
  page,
}, testInfo) => {
  const suffix = `${testInfo.workerIndex}-${Date.now()}`;
  const locationName = `E2E Harbor Pub ${suffix}`;
  const district = `Test District ${suffix}`;
  const address = `${suffix} Teststrasse 42`;

  await signIn(page, E2E_AUTH_EMAIL, E2E_AUTH_PASSWORD);

  await page.goto("/contribute");
  await page.getByRole("tab", { name: "New Location" }).click();

  await page.fill("#location-name", locationName);
  await page.selectOption("#location-type", "pub");
  await page.fill("#location-district", district);
  await page.fill("#location-address", address);
  await page.getByRole("button", { name: "Submit Location" }).click();

  await expect(page.getByRole("status")).toContainText("Location submitted for moderation.");

  await signOut(page);
  await signIn(page, E2E_MODERATOR_EMAIL, E2E_MODERATOR_PASSWORD);

  await page.goto("/moderation");
  await expect(page.getByRole("heading", { name: "Moderation Queue" })).toBeVisible();

  await page.getByRole("button", { name: /Locations \(/ }).click();

  const pendingLocationItem = page
    .locator("li")
    .filter({ hasText: locationName })
    .filter({ hasText: address })
    .filter({ hasText: district })
    .first();

  await expect(pendingLocationItem).toBeVisible();
  await pendingLocationItem.getByRole("button", { name: "Approve" }).click();
  await expect(page.locator('p[role="status"]')).toContainText("location approved.");

  await signOut(page);
  await signIn(page, E2E_AUTH_EMAIL, E2E_AUTH_PASSWORD);

  await page.goto("/contribute");

  const approvedLocationOption = page.locator("#offer-location-id option", {
    hasText: `${locationName} - Pub (Approved)`,
  });

  await expect(approvedLocationOption).toHaveCount(1);
});
