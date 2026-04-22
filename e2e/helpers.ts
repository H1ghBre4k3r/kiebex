import { expect, type Page, type TestInfo } from "@playwright/test";

export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("/");
}

export async function signOut(page: Page): Promise<void> {
  const nav = page.getByRole("navigation", { name: "Site navigation" });
  await nav.getByRole("button", { name: "Sign Out" }).click();
  await expect(nav.getByRole("link", { name: "Sign In" })).toBeVisible();
}

export function createE2ETestSuffix(testInfo: TestInfo): string {
  return `${testInfo.workerIndex}-${Date.now()}`;
}
