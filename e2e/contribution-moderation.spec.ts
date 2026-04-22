import { expect, test } from "@playwright/test";
import {
  E2E_AUTH_EMAIL,
  E2E_AUTH_PASSWORD,
  E2E_AUTH_DISPLAY_NAME,
  E2E_MODERATOR_EMAIL,
  E2E_MODERATOR_PASSWORD,
  E2E_MODERATOR_DISPLAY_NAME,
  E2E_REPORTER_EMAIL,
  E2E_REPORTER_PASSWORD,
  E2E_REPORTER_DISPLAY_NAME,
} from "./global-setup";
import { createE2ETestSuffix, signIn, signOut } from "./helpers";

const TEST_SIZE_ML = "777";
const TEST_PRICE_CENTS = "49999";
const TEST_PRICE_LABEL = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
}).format(Number(TEST_PRICE_CENTS) / 100);

const EDITED_TEST_PRICE_EUR = "123.45";
const EDITED_TEST_PRICE_LABEL = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
}).format(Number(EDITED_TEST_PRICE_EUR));

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
  const suffix = createE2ETestSuffix(testInfo);
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

test("moderator can edit and reject a pending location submission", async ({ page }, testInfo) => {
  const suffix = createE2ETestSuffix(testInfo);
  const locationName = `E2E Reject Location ${suffix}`;
  const district = `Reject District ${suffix}`;
  const address = `${suffix} Rejectstrasse 42`;
  const updatedDistrict = `Edited District ${suffix}`;
  const updatedAddress = `${suffix} Editedstrasse 99`;

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
  await page.getByRole("button", { name: /Locations \(/ }).click();

  const pendingLocationItem = page
    .locator("li")
    .filter({ hasText: locationName })
    .filter({ hasText: address })
    .filter({ hasText: district });

  await expect(pendingLocationItem).toHaveCount(1);
  await pendingLocationItem.getByRole("button", { name: "Edit" }).click();
  await pendingLocationItem.locator('input[placeholder="' + district + '"]').fill(updatedDistrict);
  await pendingLocationItem.locator('input[placeholder="' + address + '"]').fill(updatedAddress);
  await pendingLocationItem.getByRole("button", { name: "Save" }).click();

  await expect(page.locator('p[role="status"]')).toContainText("Location updated.");

  const editedLocationItem = page
    .locator("li")
    .filter({ hasText: locationName })
    .filter({ hasText: updatedAddress })
    .filter({ hasText: updatedDistrict });

  await expect(editedLocationItem).toHaveCount(1);
  await editedLocationItem.getByRole("button", { name: "Reject" }).click();
  await expect(page.locator('p[role="status"]')).toContainText("location rejected.");
  await expect(editedLocationItem).toHaveCount(0);

  await signOut(page);
  await signIn(page, E2E_AUTH_EMAIL, E2E_AUTH_PASSWORD);

  await page.goto("/contribute");
  await expect(
    page.locator("#offer-location-id option", { hasText: `${locationName} - Pub (Pending)` }),
  ).toHaveCount(0);
});

test("authenticated user can submit a brand and variant and use the pending variant in the offer form", async ({
  page,
}, testInfo) => {
  const suffix = createE2ETestSuffix(testInfo);
  const brandName = `E2E Brand ${suffix}`;
  const variantName = `E2E Variant ${suffix}`;

  await signIn(page, E2E_AUTH_EMAIL, E2E_AUTH_PASSWORD);

  await page.goto("/contribute");
  await expect(page.getByRole("heading", { name: "Contribute" })).toBeVisible();

  await page.getByRole("tab", { name: "New Brand" }).click();
  await page.fill("#brand-name", brandName);
  await page.getByRole("button", { name: "Submit Brand" }).click();

  await expect(page.getByRole("status")).toContainText("Beer brand submitted for moderation.");

  await page.getByRole("tab", { name: "New Variant" }).click();
  await expect(
    page.locator("#variant-brand-id option", { hasText: `${brandName} (Pending)` }),
  ).toHaveCount(1);

  const selectedStyleLabel =
    (await page.locator("#variant-style-id option:checked").textContent())?.trim() ?? "";

  await page.fill("#variant-name", variantName);
  await page.selectOption("#variant-brand-id", { label: `${brandName} (Pending)` });
  await page.getByRole("button", { name: "Submit Variant" }).click();

  await expect(page.getByRole("status")).toContainText("Beer variant submitted for moderation.");

  await page.getByRole("tab", { name: "Submit Offer" }).click();
  await page.selectOption("#offer-brand-id", { label: brandName });
  await expect(
    page
      .locator("#offer-variant-id option")
      .filter({ hasText: `${variantName} (${selectedStyleLabel}, Pending)` }),
  ).toHaveCount(1);
});

test("authenticated user can create, edit, and report a review that a moderator resolves", async ({
  page,
}, testInfo) => {
  const suffix = createE2ETestSuffix(testInfo);
  const initialTitle = `E2E Review ${suffix}`;
  const initialBody = `Initial review body ${suffix}`;
  const updatedTitle = `Updated E2E Review ${suffix}`;
  const updatedBody = `Updated review body ${suffix}`;
  const reportNote = `Review report note ${suffix}`;

  await page.goto("/");
  const firstLocationLink = page.locator('[aria-labelledby="results-heading"] li a').first();
  const locationPath = new URL((await firstLocationLink.getAttribute("href")) ?? "/", page.url())
    .pathname;

  await signIn(page, E2E_AUTH_EMAIL, E2E_AUTH_PASSWORD);

  await page.goto(locationPath);
  await expect(page.getByRole("heading", { level: 2, name: /Reviews/ })).toBeVisible();

  await page.selectOption("#review-rating", "4");
  await page.fill("#review-title", initialTitle);
  await page.fill("#review-body", initialBody);
  await page.getByRole("button", { name: "Submit Review" }).click();

  await expect(page.getByRole("status")).toContainText("Review submitted.");

  const ownReviewItem = page
    .locator('li[id^="review-"]')
    .filter({ hasText: initialTitle })
    .filter({ hasText: E2E_AUTH_DISPLAY_NAME })
    .first();

  await expect(ownReviewItem).toBeVisible();
  const ownReviewId = await ownReviewItem.getAttribute("id");
  await ownReviewItem.getByRole("button", { name: "Edit" }).click();

  const editableReviewItem = page.locator(`#${ownReviewId}`);
  await editableReviewItem.locator('select[id^="edit-rating-"]').selectOption("2");
  await editableReviewItem.locator('input[id^="edit-title-"]').fill(updatedTitle);
  await editableReviewItem.locator('textarea[id^="edit-body-"]').fill(updatedBody);
  await editableReviewItem.getByRole("button", { name: "Save" }).click();

  const updatedReviewItem = page
    .locator('li[id^="review-"]')
    .filter({ hasText: updatedTitle })
    .filter({ hasText: updatedBody })
    .filter({ hasText: E2E_AUTH_DISPLAY_NAME })
    .first();

  await expect(updatedReviewItem).toBeVisible();
  await expect(updatedReviewItem).toContainText("2/5");

  await signOut(page);
  await signIn(page, E2E_REPORTER_EMAIL, E2E_REPORTER_PASSWORD);

  await page.goto(locationPath);

  const reportableReviewItem = page
    .locator('li[id^="review-"]')
    .filter({ hasText: updatedTitle })
    .filter({ hasText: updatedBody })
    .filter({ hasText: E2E_AUTH_DISPLAY_NAME })
    .first();

  await expect(reportableReviewItem).toBeVisible();
  await reportableReviewItem.getByRole("button", { name: "Report" }).click();
  await reportableReviewItem.locator('select[id^="report-reason-"]').selectOption("offensive");
  await reportableReviewItem.locator('textarea[id^="report-note-"]').fill(reportNote);
  await reportableReviewItem.getByRole("button", { name: "Submit Report" }).click();
  await expect(reportableReviewItem).toContainText("Report submitted.");

  await signOut(page);
  await signIn(page, E2E_MODERATOR_EMAIL, E2E_MODERATOR_PASSWORD);

  await page.goto("/moderation");
  await page.getByRole("tab", { name: /Reports \(/ }).click();
  await page.getByRole("button", { name: /Open Reports \(/ }).click();

  const openReportItem = page
    .locator("li")
    .filter({ hasText: updatedTitle })
    .filter({ hasText: updatedBody })
    .filter({ hasText: reportNote })
    .filter({ hasText: E2E_REPORTER_DISPLAY_NAME })
    .first();

  await expect(openReportItem).toBeVisible();
  await openReportItem.getByRole("button", { name: "Mark Actioned" }).click();
  await expect(page.locator('p[role="status"]')).toContainText("Report marked as actioned.");

  await page.getByRole("button", { name: /Resolved Reports \(/ }).click();

  const resolvedReportItem = page
    .locator("li")
    .filter({ hasText: updatedTitle })
    .filter({ hasText: updatedBody })
    .filter({ hasText: "ACTIONED" })
    .filter({ hasText: E2E_MODERATOR_DISPLAY_NAME })
    .first();

  await expect(resolvedReportItem).toBeVisible();
});

test("moderator can edit and delete a pending offer submission", async ({ page }) => {
  await signIn(page, E2E_AUTH_EMAIL, E2E_AUTH_PASSWORD);

  await page.goto("/contribute");
  await expect(page.getByRole("heading", { name: "Contribute" })).toBeVisible();

  const brandName =
    (await page.locator("#offer-brand-id option:checked").textContent())?.trim() ?? "";
  const variantLabel =
    (await page.locator("#offer-variant-id option:checked").textContent())?.trim() ?? "";
  const variantName = variantLabel.split(" (")[0] ?? "";
  const offerSizeMl = "888";
  const offerPriceCents = "43210";
  const offerPriceLabel = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(offerPriceCents) / 100);

  await page.fill("#offer-size-ml", offerSizeMl);
  await page.selectOption("#offer-serving", "bottle");
  await page.fill("#offer-price-cents", offerPriceCents);
  await page.getByRole("button", { name: "Submit Offer / Price Update" }).click();
  await expect(page.getByRole("status")).toContainText("Offer submission created for moderation.");

  await signOut(page);
  await signIn(page, E2E_MODERATOR_EMAIL, E2E_MODERATOR_PASSWORD);

  await page.goto("/moderation");
  await page.getByRole("button", { name: /Offers \(/ }).click();

  const pendingOfferItem = page
    .locator("li")
    .filter({ hasText: `${brandName} ${variantName}` })
    .filter({ hasText: `${offerSizeMl} ml` })
    .filter({ hasText: offerPriceLabel });

  await expect(pendingOfferItem).toHaveCount(1);
  await pendingOfferItem.getByRole("button", { name: "Edit Price" }).click();
  await pendingOfferItem.locator('input[placeholder="432.10"]').fill(EDITED_TEST_PRICE_EUR);
  await pendingOfferItem.getByRole("button", { name: "Save" }).click();

  await expect(page.locator('p[role="status"]')).toContainText("Offer price updated.");

  const editedOfferItem = page
    .locator("li")
    .filter({ hasText: `${brandName} ${variantName}` })
    .filter({ hasText: `${offerSizeMl} ml` })
    .filter({ hasText: EDITED_TEST_PRICE_LABEL });

  await expect(editedOfferItem).toHaveCount(1);
  await editedOfferItem.getByRole("button", { name: "Delete" }).click();
  await editedOfferItem.getByRole("button", { name: "Confirm Delete" }).click();
  await expect(page.locator('p[role="status"]')).toContainText("offer deleted.");
  await expect(editedOfferItem).toHaveCount(0);
});
