import { expect, test } from "@playwright/test";

test("public directory supports filtering, sorting, clearing, and pagination", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Kiel Beer Index" })).toBeVisible();

  // Sort: click the "Price: High to Low" radio and verify URL + checked state
  await page.locator('label[for="sort-price_desc"]').click();
  await expect(page).toHaveURL(/sort=price_desc/);
  await expect(page.getByRole("radio", { name: "Price: High to Low" })).toBeChecked();
  await expect(page.getByText("Highest price in current result")).toBeVisible();

  // Filter: navigate to a URL with an active brand filter and verify chip
  await page.goto("/?sort=price_desc&brandId=brand-becks");
  await expect(page.getByRole("checkbox", { name: "Becks" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page).toHaveURL(/brandId=brand-becks/);
  await expect(page.getByLabel("Active filters")).toContainText("Brand: Becks");

  // Clear all active filters
  await page.getByRole("link", { name: "Clear all ×" }).click();
  await expect(page).toHaveURL(/\/$/);

  // Pagination
  const pagination = page.getByRole("navigation", { name: "Offer pages" });
  await expect(pagination).toBeVisible();

  const nextLink = pagination.getByRole("link", { name: /Next/i });
  await nextLink.click();

  await expect(page).toHaveURL(/page=2/);
  await expect(pagination).toContainText("Page 2 of");
});

// Prove that filtering works with JavaScript completely disabled.
// This test verifies the hydration race is gone: links navigate via plain HTML.
test.describe("JS-disabled directory filtering", () => {
  test.use({ javaScriptEnabled: false });

  test("sort and brand filter links work without JavaScript", async ({ page }) => {
    await page.goto("/");

    // Sort: select radio then submit the form (no JS → auto-submit script doesn't run,
    // so the <noscript> "Apply sort" button must be clicked explicitly).
    await page.locator('label[for="sort-price_desc"]').click();
    await page.getByRole("button", { name: /apply sort/i }).click();
    await expect(page).toHaveURL(/sort=price_desc/);
    await expect(page.getByRole("radio", { name: "Price: High to Low" })).toBeChecked();

    // Brand filter: click a brand checkbox link — should toggle via <a> href
    await page.getByRole("checkbox", { name: "Becks" }).click();
    await expect(page).toHaveURL(/brandId=/);
    await expect(page.getByLabel("Active filters")).toContainText("Brand: Becks");
    await expect(page.getByRole("checkbox", { name: "Becks" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});
