import { describe, expect, it, beforeEach, afterEach } from "@jest/globals";
import { buildPasswordResetUrl, buildVerificationUrl } from "@/lib/verification";

function makeRequest(url: string): Request {
  return new Request(url);
}

describe("buildVerificationUrl", () => {
  beforeEach(() => {
    process.env.APP_URL = "https://kiel-beer.example.com";
  });

  afterEach(() => {
    delete process.env.APP_URL;
  });

  it("builds a verification URL using APP_URL", () => {
    const url = buildVerificationUrl(makeRequest("https://ignored.com"), "tok123");
    expect(url).toBe(
      "https://kiel-beer.example.com/api/v1/auth/verify-email?token=tok123",
    );
  });

  it("falls back to the request origin when APP_URL is not set", () => {
    delete process.env.APP_URL;
    const url = buildVerificationUrl(makeRequest("https://fallback.example.com/anything"), "abc");
    expect(url).toBe("https://fallback.example.com/api/v1/auth/verify-email?token=abc");
  });
});

describe("buildPasswordResetUrl", () => {
  beforeEach(() => {
    process.env.APP_URL = "https://kiel-beer.example.com";
  });

  afterEach(() => {
    delete process.env.APP_URL;
  });

  it("builds a password reset URL using APP_URL", () => {
    const url = buildPasswordResetUrl(makeRequest("https://ignored.com"), "resetToken");
    expect(url).toBe("https://kiel-beer.example.com/reset-password?token=resetToken");
  });

  it("falls back to the request origin when APP_URL is not set", () => {
    delete process.env.APP_URL;
    const url = buildPasswordResetUrl(makeRequest("https://fallback.example.com/page"), "xyz");
    expect(url).toBe("https://fallback.example.com/reset-password?token=xyz");
  });
});
