import "server-only";

export function buildVerificationUrl(request: Request, token: string): string {
  const baseUrl = process.env.APP_URL ?? new URL(request.url).origin;
  const verificationUrl = new URL("/api/v1/auth/verify-email", baseUrl);

  verificationUrl.searchParams.set("token", token);

  return verificationUrl.toString();
}
