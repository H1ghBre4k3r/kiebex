import { expect, test } from "@playwright/test";

test("home page renders and location detail navigation works", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Kiel Beer Index" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: /Offers \(/ })).toBeVisible();

  const firstLocationLink = page.locator('[aria-labelledby="results-heading"] li a').first();

  await expect(firstLocationLink).toBeVisible();
  await firstLocationLink.click();

  await expect(page).toHaveURL(/\/locations\//);
  await expect(page.getByRole("link", { name: /Back to all offers/i })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: /Offers/ })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: /Reviews/ })).toBeVisible();
});
