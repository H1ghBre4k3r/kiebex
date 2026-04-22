import { expect, test } from "@playwright/test";
import {
  E2E_AUTH_DISPLAY_NAME,
  E2E_AUTH_EMAIL,
  E2E_AUTH_PASSWORD,
  E2E_UNVERIFIED_EMAIL,
  E2E_UNVERIFIED_PASSWORD,
} from "./global-setup";
import { getCapturedAuthLink } from "./helpers";

test.describe("auth lifecycle", () => {
  test("sign in with valid credentials shows user in nav and sign out returns to guest state", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();

    await page.fill("#login-email", E2E_AUTH_EMAIL);
    await page.fill("#login-password", E2E_AUTH_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();

    // After successful login the app redirects to the home page.
    await page.waitForURL("/");

    const nav = page.getByRole("navigation", { name: "Site navigation" });
    await expect(nav.getByText(E2E_AUTH_DISPLAY_NAME)).toBeVisible();
    await expect(nav.getByRole("button", { name: "Sign Out" })).toBeVisible();
    // Guest-only links must not be visible when authenticated.
    await expect(nav.getByRole("link", { name: "Sign In" })).not.toBeVisible();

    // Sign out.
    await nav.getByRole("button", { name: "Sign Out" }).click();

    // After sign-out the page reloads and returns to guest state.
    await expect(nav.getByRole("link", { name: "Sign In" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Sign Out" })).not.toBeVisible();
  });

  test("login with unverified email can recover via resend verification", async ({
    page,
    request,
  }) => {
    await page.goto("/login");

    await page.fill("#login-email", E2E_UNVERIFIED_EMAIL);
    await page.fill("#login-password", E2E_UNVERIFIED_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();

    const alert = page.locator('p[role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/not been verified/i);

    // A "Resend Verification Email" affordance should appear.
    await expect(page.getByRole("button", { name: /resend verification/i })).toBeVisible();

    // User should still be on the login page — no redirect occurred.
    await expect(page).toHaveURL(/\/login/);

    await page.getByRole("button", { name: /resend verification/i }).click();
    await expect(page.getByRole("status")).toContainText(/verification email resent/i);

    const verificationUrl = await getCapturedAuthLink(
      request,
      "verification",
      E2E_UNVERIFIED_EMAIL,
    );
    await page.goto(verificationUrl);
    await page.waitForURL("/");

    const nav = page.getByRole("navigation", { name: "Site navigation" });
    await expect(nav.getByRole("button", { name: "Sign Out" })).toBeVisible();
  });

  test("login with wrong password shows an error and stays on login page", async ({ page }) => {
    await page.goto("/login");

    await page.fill("#login-email", E2E_AUTH_EMAIL);
    await page.fill("#login-password", "definitely-wrong-password");
    await page.getByRole("button", { name: "Sign In" }).click();

    const alert = page.locator('p[role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/email or password is incorrect/i);
    await expect(page).toHaveURL(/\/login/);
  });
});
