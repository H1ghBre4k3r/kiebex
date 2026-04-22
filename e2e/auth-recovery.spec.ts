import { expect, test, type APIRequestContext } from "@playwright/test";
import {
  E2E_CHANGE_EMAIL_DISPLAY_NAME,
  E2E_CHANGE_EMAIL_EMAIL,
  E2E_CHANGE_EMAIL_NEW_EMAIL,
  E2E_CHANGE_EMAIL_PASSWORD,
  E2E_REGISTER_FLOW_DISPLAY_NAME,
  E2E_REGISTER_FLOW_EMAIL,
  E2E_REGISTER_FLOW_NEW_PASSWORD,
  E2E_REGISTER_FLOW_PASSWORD,
} from "./global-setup";
import { signIn, signOut } from "./helpers";

async function createAuthLink(
  request: APIRequestContext,
  kind: "verification" | "change_email_verification" | "password_reset",
  email: string,
): Promise<string> {
  const deadline = Date.now() + 15000;

  while (Date.now() < deadline) {
    const response = await request.post("/api/v1/test/auth-links", {
      data: { kind, email },
    });

    if (response.ok()) {
      const body = (await response.json()) as { data?: { url?: string } };
      const url = body.data?.url;

      expect(url).toBeTruthy();
      return url as string;
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }

  throw new Error(`Timed out creating ${kind} auth link for ${email}.`);
}

test("user can register, verify email, request a password reset, and sign in with the new password", async ({
  page,
  request,
}) => {
  await page.goto("/register");
  await page.fill("#register-display-name", E2E_REGISTER_FLOW_DISPLAY_NAME);
  await page.fill("#register-email", E2E_REGISTER_FLOW_EMAIL);
  await page.fill("#register-password", E2E_REGISTER_FLOW_PASSWORD);
  await page.getByRole("button", { name: "Create Account" }).click();

  const verificationUrl = await createAuthLink(request, "verification", E2E_REGISTER_FLOW_EMAIL);
  await page.goto(verificationUrl);
  await page.waitForURL("/");

  const nav = page.getByRole("navigation", { name: "Site navigation" });
  await expect(nav.getByText(E2E_REGISTER_FLOW_DISPLAY_NAME)).toBeVisible();

  await signOut(page);

  await page.goto("/forgot-password");
  await page.fill("#forgot-email", E2E_REGISTER_FLOW_EMAIL);
  await page.getByRole("button", { name: "Send Reset Link" }).click();

  const resetUrl = await createAuthLink(request, "password_reset", E2E_REGISTER_FLOW_EMAIL);
  await page.goto(resetUrl);
  await expect(page.getByRole("heading", { name: "Set New Password" })).toBeVisible();

  await page.fill("#reset-password", E2E_REGISTER_FLOW_NEW_PASSWORD);
  await page.getByRole("button", { name: "Set New Password" }).click();
  await expect(page.getByRole("status")).toContainText(/Your password has been reset/i);
  await page.getByRole("link", { name: "Sign in now" }).click();

  await signIn(page, E2E_REGISTER_FLOW_EMAIL, E2E_REGISTER_FLOW_NEW_PASSWORD);
  await expect(nav.getByText(E2E_REGISTER_FLOW_DISPLAY_NAME)).toBeVisible();
});

test("user can request and verify an email change", async ({ page, request }) => {
  await signIn(page, E2E_CHANGE_EMAIL_EMAIL, E2E_CHANGE_EMAIL_PASSWORD);
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Your Profile" })).toBeVisible();
  await expect(page.locator("#profile-display-name")).toHaveValue(E2E_CHANGE_EMAIL_DISPLAY_NAME);

  await page.fill("#profile-new-email", E2E_CHANGE_EMAIL_NEW_EMAIL);
  await page.fill("#profile-email-password", E2E_CHANGE_EMAIL_PASSWORD);
  await page.getByRole("button", { name: "Send Verification Email" }).click();

  await expect(page.getByRole("status")).toContainText(E2E_CHANGE_EMAIL_NEW_EMAIL);

  const verificationUrl = await createAuthLink(
    request,
    "change_email_verification",
    E2E_CHANGE_EMAIL_NEW_EMAIL,
  );

  await page.goto(verificationUrl);
  await page.waitForURL("/");

  await page.goto("/profile");
  const changeEmailSection = page.locator("section", {
    has: page.getByRole("heading", { name: "Change Email" }),
  });
  await expect(changeEmailSection.getByText(E2E_CHANGE_EMAIL_NEW_EMAIL)).toBeVisible();

  await signOut(page);
  await signIn(page, E2E_CHANGE_EMAIL_NEW_EMAIL, E2E_CHANGE_EMAIL_PASSWORD);
  await expect(
    page
      .getByRole("navigation", { name: "Site navigation" })
      .getByText(E2E_CHANGE_EMAIL_DISPLAY_NAME),
  ).toBeVisible();
});
