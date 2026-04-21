import { expect, test } from "@playwright/test";

test("public directory supports filtering, sorting, clearing, and pagination", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Kiel Beer Index" })).toBeVisible();

  await page.goto("/?sort=price_desc");
  await expect(page.getByRole("radio", { name: "Price: High to Low" })).toBeChecked();
  await expect(page.getByText("Highest price in current result")).toBeVisible();

  await page.goto("/?sort=price_desc&brandId=brand-becks");
  await expect(page.getByRole("checkbox", { name: "Becks" })).toBeChecked();
  await expect(page).toHaveURL(/brandId=brand-becks/);
  await expect(page.getByLabel("Active filters")).toContainText("Brand: Becks");

  await page.getByRole("link", { name: "Clear all ×" }).click();
  await expect(page).toHaveURL(/\/$/);

  const pagination = page.getByRole("navigation", { name: "Offer pages" });
  await expect(pagination).toBeVisible();

  const nextLink = pagination.getByRole("link", { name: /Next/i });
  await nextLink.click();

  await expect(page).toHaveURL(/page=2/);
  await expect(pagination).toContainText("Page 2 of");
});
