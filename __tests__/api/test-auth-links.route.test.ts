import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { captureTestEmail, clearCapturedTestEmails } from "@/lib/test-email";

describe("POST /api/v1/test/auth-links", () => {
  const originalE2ETestMode = process.env.E2E_TEST_MODE;

  beforeEach(() => {
    process.env.E2E_TEST_MODE = "true";
    clearCapturedTestEmails();
  });

  afterEach(() => {
    clearCapturedTestEmails();

    if (originalE2ETestMode === undefined) {
      delete process.env.E2E_TEST_MODE;
      return;
    }

    process.env.E2E_TEST_MODE = originalE2ETestMode;
  });

  it("returns the latest captured verification email", async () => {
    captureTestEmail({
      kind: "verification",
      to: "user@example.com",
      subject: "Older verification email",
      text: "older",
      html: "<p>older</p>",
      actionUrl: "http://localhost/api/v1/auth/verify-email?token=older",
    });
    captureTestEmail({
      kind: "verification",
      to: "user@example.com",
      subject: "Latest verification email",
      text: "latest",
      html: "<p>latest</p>",
      actionUrl: "http://localhost/api/v1/auth/verify-email?token=latest",
    });

    const { POST } = await import("@/app/api/v1/test/auth-links/route");
    const response = await POST(
      new Request("http://localhost/api/v1/test/auth-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "verification", email: "USER@example.com" }),
      }),
    );
    const body = (await response.json()) as {
      status: string;
      data: {
        url: string;
        email: {
          kind: string;
          to: string;
          subject: string;
        };
      };
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.data.url).toBe("http://localhost/api/v1/auth/verify-email?token=latest");
    expect(body.data.email.kind).toBe("verification");
    expect(body.data.email.to).toBe("user@example.com");
    expect(body.data.email.subject).toBe("Latest verification email");
  });

  it("returns captured change-email verification emails", async () => {
    captureTestEmail({
      kind: "change_email_verification",
      to: "new-email@example.com",
      subject: "Confirm your new Kiel Beer Index email address",
      text: "confirm",
      html: "<p>confirm</p>",
      actionUrl: "http://localhost/api/v1/auth/verify-email?token=change-email",
    });

    const { POST } = await import("@/app/api/v1/test/auth-links/route");
    const response = await POST(
      new Request("http://localhost/api/v1/test/auth-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "change_email_verification",
          email: "new-email@example.com",
        }),
      }),
    );
    const body = (await response.json()) as {
      status: string;
      data: { url: string; email: { kind: string; subject: string } };
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.data.url).toBe("http://localhost/api/v1/auth/verify-email?token=change-email");
    expect(body.data.email.kind).toBe("change_email_verification");
    expect(body.data.email.subject).toMatch(/confirm your new/i);
  });

  it("returns 404 when no captured auth email exists", async () => {
    const { POST } = await import("@/app/api/v1/test/auth-links/route");
    const response = await POST(
      new Request("http://localhost/api/v1/test/auth-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "verification", email: "missing@example.com" }),
      }),
    );
    const body = (await response.json()) as { status: string; error: { code: string } };

    expect(response.status).toBe(404);
    expect(body.status).toBe("error");
    expect(body.error.code).toBe("AUTH_EMAIL_NOT_FOUND");
  });
});
