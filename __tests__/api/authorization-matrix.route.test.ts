import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockedRequireAuthUser = jest.fn<() => Promise<{ id: string; displayName: string }>>();
const mockedRequireModeratorUser =
  jest.fn<() => Promise<{ id: string; displayName: string; role: string }>>();
const mockedRequireAdminUser =
  jest.fn<() => Promise<{ id: string; displayName: string; role: string }>>();
const mockedGetBeerOffersPage = jest.fn<() => Promise<{ offers: unknown[]; total: number }>>();
const mockedRequestEmailChange =
  jest.fn<
    (
      userId: string,
      newEmail: string,
      currentPassword: string,
    ) => Promise<{ ok: true; token: string } | { ok: false; code: string }>
  >();
const mockedSendEmailChangeVerificationEmail = jest.fn<() => Promise<void>>();
const mockedGetPendingLocationSubmissions = jest.fn<() => Promise<unknown[]>>();
const mockedGetPendingBeerBrandSubmissions = jest.fn<() => Promise<unknown[]>>();
const mockedGetPendingBeerVariantSubmissions = jest.fn<() => Promise<unknown[]>>();
const mockedGetPendingBeerOfferSubmissions = jest.fn<() => Promise<unknown[]>>();
const mockedGetPendingPriceUpdateProposals = jest.fn<() => Promise<unknown[]>>();
const mockedGetUsersForAdmin = jest.fn<() => Promise<unknown[]>>();

jest.mock("@/lib/auth", () => {
  class UnauthorizedError extends Error {
    constructor(message = "Authentication required.") {
      super(message);
      this.name = "UnauthorizedError";
    }
  }

  class ForbiddenError extends Error {
    constructor(message = "Insufficient permissions.") {
      super(message);
      this.name = "ForbiddenError";
    }
  }

  return {
    UnauthorizedError,
    ForbiddenError,
    requireAuthUser: mockedRequireAuthUser,
    requireModeratorUser: mockedRequireModeratorUser,
    requireAdminUser: mockedRequireAdminUser,
    requestEmailChange: mockedRequestEmailChange,
  };
});

jest.mock("@/lib/query", () => ({
  BEER_OFFERS_PAGE_SIZE: 20,
  createOfferOrPriceUpdateProposal: jest.fn(),
  getBeerOffersPage: mockedGetBeerOffersPage,
  getLocationContributionPermission: jest.fn(),
  getVariantContributionPermission: jest.fn(),
  getPendingLocationSubmissions: mockedGetPendingLocationSubmissions,
  getPendingBeerBrandSubmissions: mockedGetPendingBeerBrandSubmissions,
  getPendingBeerVariantSubmissions: mockedGetPendingBeerVariantSubmissions,
  getPendingBeerOfferSubmissions: mockedGetPendingBeerOfferSubmissions,
  getPendingPriceUpdateProposals: mockedGetPendingPriceUpdateProposals,
  getUsersForAdmin: mockedGetUsersForAdmin,
}));

jest.mock("@/lib/email", () => ({
  sendEmailChangeVerificationEmail: mockedSendEmailChangeVerificationEmail,
}));

jest.mock("@/lib/verification", () => ({
  buildVerificationUrl: jest.fn(() => "http://localhost/verify-email?token=test-token"),
}));

describe("API authorization matrix", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows public directory access without authentication", async () => {
    mockedGetBeerOffersPage.mockResolvedValueOnce({ offers: [], total: 0 });

    const { GET } = await import("@/app/api/v1/beers/route");
    const response = await GET(new Request("http://localhost/api/v1/beers"));

    expect(response.status).toBe(200);
    expect(mockedRequireAuthUser).not.toHaveBeenCalled();
  });

  it("rejects anonymous access to authenticated routes", async () => {
    const auth = await import("@/lib/auth");
    mockedRequireAuthUser.mockRejectedValueOnce(new auth.UnauthorizedError());

    const { POST } = await import("@/app/api/v1/auth/change-email/route");
    const response = await POST(
      new Request("http://localhost/api/v1/auth/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newEmail: "new@example.com",
          currentPassword: "password123",
        }),
      }),
    );
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects anonymous moderator access", async () => {
    const auth = await import("@/lib/auth");
    mockedRequireModeratorUser.mockRejectedValueOnce(new auth.UnauthorizedError());

    const { GET } = await import("@/app/api/v1/moderation/submissions/route");
    const response = await GET();
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects non-moderators from moderator routes", async () => {
    const auth = await import("@/lib/auth");
    mockedRequireModeratorUser.mockRejectedValueOnce(new auth.ForbiddenError());

    const { GET } = await import("@/app/api/v1/moderation/submissions/route");
    const response = await GET();
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("allows moderators to access moderator routes", async () => {
    mockedRequireModeratorUser.mockResolvedValueOnce({
      id: "moderator-1",
      displayName: "Moderator",
      role: "moderator",
    });
    mockedGetPendingLocationSubmissions.mockResolvedValueOnce([]);
    mockedGetPendingBeerBrandSubmissions.mockResolvedValueOnce([]);
    mockedGetPendingBeerVariantSubmissions.mockResolvedValueOnce([]);
    mockedGetPendingBeerOfferSubmissions.mockResolvedValueOnce([]);
    mockedGetPendingPriceUpdateProposals.mockResolvedValueOnce([]);

    const { GET } = await import("@/app/api/v1/moderation/submissions/route");
    const response = await GET();

    expect(response.status).toBe(200);
  });

  it("rejects anonymous admin access", async () => {
    const auth = await import("@/lib/auth");
    mockedRequireAdminUser.mockRejectedValueOnce(new auth.UnauthorizedError());

    const { GET } = await import("@/app/api/v1/admin/users/route");
    const response = await GET();
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects non-admins from admin routes", async () => {
    const auth = await import("@/lib/auth");
    mockedRequireAdminUser.mockRejectedValueOnce(new auth.ForbiddenError());

    const { GET } = await import("@/app/api/v1/admin/users/route");
    const response = await GET();
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("allows admins to access admin routes", async () => {
    mockedRequireAdminUser.mockResolvedValueOnce({
      id: "admin-1",
      displayName: "Admin",
      role: "admin",
    });
    mockedGetUsersForAdmin.mockResolvedValueOnce([]);

    const { GET } = await import("@/app/api/v1/admin/users/route");
    const response = await GET();

    expect(response.status).toBe(200);
    expect(mockedGetUsersForAdmin).toHaveBeenCalledTimes(1);
  });
});
