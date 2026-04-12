import "server-only";

export function buildVerificationUrl(request: Request, token: string): string {
  const appUrl = process.env.APP_URL;

  if (!appUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[verification] APP_URL must be set in production. " +
          "Refusing to derive base URL from the request to prevent host header injection.",
      );
    }
    console.warn(
      "[verification] APP_URL is not set; falling back to request origin. " +
        "Set APP_URL in production to ensure correct verification links.",
    );
  }

  const baseUrl = appUrl ?? new URL(request.url).origin;
  const verificationUrl = new URL("/api/v1/auth/verify-email", baseUrl);

  verificationUrl.searchParams.set("token", token);

  return verificationUrl.toString();
}
