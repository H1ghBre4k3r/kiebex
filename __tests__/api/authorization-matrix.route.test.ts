import { beforeEach, describe, expect, it, jest } from "@jest/globals";

type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: "user" | "moderator" | "admin";
};

type ReportRecord = {
  id: string;
  status: "open" | "dismissed" | "actioned";
  contentType: string;
  contentId: string;
  reason: string;
  reporter: { displayName: string } | null;
};

const authUser: AuthUser = {
  id: "user-1",
  email: "user@example.com",
  displayName: "User One",
  role: "user",
};

const moderatorUser: AuthUser = {
  id: "moderator-1",
  email: "moderator@example.com",
  displayName: "Moderator One",
  role: "moderator",
};

const adminUser: AuthUser = {
  id: "admin-1",
  email: "admin@example.com",
  displayName: "Admin One",
  role: "admin",
};

const mockedRequireAuthUser = jest.fn<() => Promise<AuthUser>>();
const mockedRequireModeratorUser = jest.fn<() => Promise<AuthUser>>();
const mockedRequireAdminUser = jest.fn<() => Promise<AuthUser>>();
const mockedGetBeerOffersPage = jest.fn<() => Promise<{ offers: unknown[]; total: number }>>();
const mockedGetLocationReviewPermission =
  jest.fn<() => Promise<"allowed" | "missing" | "forbidden">>();
const mockedGetLocationReviews = jest.fn<() => Promise<unknown[]>>();
const mockedCreateLocation =
  jest.fn<
    (input: {
      name: string;
      locationType: string;
      district: string;
      address: string;
      createdById: string;
      status: string;
    }) => Promise<{ id: string; name: string }>
  >();
const mockedCreateReview =
  jest.fn<
    (input: {
      locationId: string;
      userId: string;
      rating: number;
      title?: string;
      body?: string;
    }) => Promise<{ id: string; locationId: string; userId: string }>
  >();
const mockedHasUserReportedContent = jest.fn<() => Promise<boolean>>();
const mockedCreateReport =
  jest.fn<
    (input: {
      reporterId: string;
      contentType: string;
      contentId: string;
      reason: string;
      note?: string;
    }) => Promise<{ id: string; contentId: string }>
  >();
const mockedGetLocationContributionPermission =
  jest.fn<() => Promise<"allowed" | "missing" | "forbidden">>();
const mockedGetVariantContributionPermission =
  jest.fn<() => Promise<"allowed" | "missing" | "forbidden">>();
const mockedCreateOfferOrPriceUpdateProposal = jest.fn<
  () => Promise<
    | {
        outcome: "offer";
        offer: { id: string; locationId: string; variantId: string };
      }
    | {
        outcome: "price_update";
        offer: { id: string };
        proposal: { id: string };
      }
    | { outcome: "existing_offer_not_approved" }
    | { outcome: "same_price" }
  >
>();
const mockedGetPendingLocationSubmissions = jest.fn<() => Promise<unknown[]>>();
const mockedGetPendingBeerBrandSubmissions = jest.fn<() => Promise<unknown[]>>();
const mockedGetPendingBeerVariantSubmissions = jest.fn<() => Promise<unknown[]>>();
const mockedGetPendingBeerOfferSubmissions = jest.fn<() => Promise<unknown[]>>();
const mockedGetPendingPriceUpdateProposals = jest.fn<() => Promise<unknown[]>>();
const mockedGetOpenReports = jest.fn<() => Promise<unknown[]>>();
const mockedGetReportById = jest.fn<() => Promise<ReportRecord | null>>();
const mockedResolveReport = jest.fn<() => Promise<{ id: string; status: string } | null>>();
const mockedModerateBeerOfferSubmission = jest.fn<
  () => Promise<
    | {
        outcome: "updated";
        offer: {
          id: string;
          brand: string;
          variant: string;
          style: string;
          sizeMl: number;
          serving: string;
          priceEur: number;
          location: { name: string };
        };
      }
    | { outcome: "missing" }
    | { outcome: "location_not_approved" }
    | { outcome: "variant_not_approved" }
  >
>();
const mockedLogModerationAction = jest.fn<() => Promise<void>>();
const mockedGetUsersForAdmin = jest.fn<() => Promise<unknown[]>>();
const mockedUpdateUserRoleByAdmin =
  jest.fn<
    (input: {
      targetUserId: string;
      role: string;
      actingAdminId: string;
    }) => Promise<
      | { outcome: "updated"; user: { id: string; role: string } }
      | { outcome: "not_found" }
      | { outcome: "cannot_demote_last_admin" }
    >
  >();
const mockedCreateBeerOffer =
  jest.fn<
    () => Promise<{ id: string; brand: string; variant: string; sizeMl: number; priceEur: number }>
  >();

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
  };
});

jest.mock("@/lib/query", () => ({
  BEER_OFFERS_PAGE_SIZE: 20,
  createLocation: mockedCreateLocation,
  createReview: mockedCreateReview,
  getLocationReviewPermission: mockedGetLocationReviewPermission,
  getLocationReviews: mockedGetLocationReviews,
  hasUserReportedContent: mockedHasUserReportedContent,
  createReport: mockedCreateReport,
  getLocationContributionPermission: mockedGetLocationContributionPermission,
  getVariantContributionPermission: mockedGetVariantContributionPermission,
  createOfferOrPriceUpdateProposal: mockedCreateOfferOrPriceUpdateProposal,
  getBeerOffersPage: mockedGetBeerOffersPage,
  getPendingLocationSubmissions: mockedGetPendingLocationSubmissions,
  getPendingBeerBrandSubmissions: mockedGetPendingBeerBrandSubmissions,
  getPendingBeerVariantSubmissions: mockedGetPendingBeerVariantSubmissions,
  getPendingBeerOfferSubmissions: mockedGetPendingBeerOfferSubmissions,
  getPendingPriceUpdateProposals: mockedGetPendingPriceUpdateProposals,
  getOpenReports: mockedGetOpenReports,
  getReportById: mockedGetReportById,
  resolveReport: mockedResolveReport,
  moderateBeerOfferSubmission: mockedModerateBeerOfferSubmission,
  logModerationAction: mockedLogModerationAction,
  getUsersForAdmin: mockedGetUsersForAdmin,
  updateUserRoleByAdmin: mockedUpdateUserRoleByAdmin,
  createBeerOffer: mockedCreateBeerOffer,
}));

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function expectUnauthorized(
  run: () => Promise<Response>,
): Promise<{ status: string; error: { code: string; message: string } }> {
  const response = await run();
  const body = await parseJson<{ status: string; error: { code: string; message: string } }>(
    response,
  );

  expect(response.status).toBe(401);
  expect(body.status).toBe("error");
  expect(body.error.code).toBe("UNAUTHORIZED");

  return body;
}

async function expectForbidden(
  run: () => Promise<Response>,
): Promise<{ status: string; error: { code: string; message: string } }> {
  const response = await run();
  const body = await parseJson<{ status: string; error: { code: string; message: string } }>(
    response,
  );

  expect(response.status).toBe(403);
  expect(body.status).toBe("error");
  expect(body.error.code).toBe("FORBIDDEN");

  return body;
}

describe("API authorization matrix", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("public routes", () => {
    it("allows anonymous access to the public offer directory", async () => {
      mockedGetBeerOffersPage.mockResolvedValueOnce({ offers: [], total: 0 });

      const { GET } = await import("@/app/api/v1/beers/route");
      const response = await GET(new Request("http://localhost/api/v1/beers"));
      const body = await parseJson<{
        status: string;
        data: { offers: unknown[]; pagination: { page: number; total: number } };
      }>(response);

      expect(response.status).toBe(200);
      expect(body.status).toBe("ok");
      expect(body.data.offers).toEqual([]);
      expect(body.data.pagination.page).toBe(1);
      expect(mockedRequireAuthUser).not.toHaveBeenCalled();
    });

    it("allows anonymous access to public review listings", async () => {
      mockedGetLocationReviewPermission.mockResolvedValueOnce("allowed");
      mockedGetLocationReviews.mockResolvedValueOnce([{ id: "review-1" }]);

      const { GET } = await import("@/app/api/v1/reviews/route");
      const response = await GET(new Request("http://localhost/api/v1/reviews?locationId=loc-1"));
      const body = await parseJson<{
        status: string;
        data: { locationId: string; count: number; reviews: Array<{ id: string }> };
      }>(response);

      expect(response.status).toBe(200);
      expect(body.status).toBe("ok");
      expect(body.data.locationId).toBe("loc-1");
      expect(body.data.count).toBe(1);
      expect(mockedRequireAuthUser).not.toHaveBeenCalled();
    });
  });

  describe("authenticated routes", () => {
    it.each([
      {
        name: "GET /auth/me",
        run: async () => {
          const { GET } = await import("@/app/api/v1/auth/me/route");
          return GET();
        },
      },
      {
        name: "POST /locations",
        run: async () => {
          const { POST } = await import("@/app/api/v1/locations/route");
          return POST(
            new Request("http://localhost/api/v1/locations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: "Test Pub",
                locationType: "pub",
                district: "Mitte",
                address: "Street 1",
              }),
            }),
          );
        },
      },
      {
        name: "POST /reviews",
        run: async () => {
          const { POST } = await import("@/app/api/v1/reviews/route");
          return POST(
            new Request("http://localhost/api/v1/reviews", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                locationId: "loc-1",
                rating: 4,
                title: "Solid",
                body: "Nice",
              }),
            }),
          );
        },
      },
      {
        name: "POST /reports",
        run: async () => {
          const { POST } = await import("@/app/api/v1/reports/route");
          return POST(
            new Request("http://localhost/api/v1/reports", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contentType: "review",
                contentId: "review-1",
                reason: "offensive",
                note: "Bad content",
              }),
            }),
          );
        },
      },
      {
        name: "POST /beers",
        run: async () => {
          const { POST } = await import("@/app/api/v1/beers/route");
          return POST(
            new Request("http://localhost/api/v1/beers", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                variantId: "variant-1",
                sizeMl: 500,
                serving: "tap",
                priceCents: 499,
                locationId: "loc-1",
              }),
            }),
          );
        },
      },
    ])("rejects anonymous access to $name", async ({ run }) => {
      const auth = await import("@/lib/auth");
      mockedRequireAuthUser.mockRejectedValueOnce(new auth.UnauthorizedError());

      await expectUnauthorized(run);
    });

    it("allows authenticated access to GET /auth/me", async () => {
      mockedRequireAuthUser.mockResolvedValueOnce(authUser);

      const { GET } = await import("@/app/api/v1/auth/me/route");
      const response = await GET();
      const body = await parseJson<{ status: string; data: { user: AuthUser } }>(response);

      expect(response.status).toBe(200);
      expect(body.status).toBe("ok");
      expect(body.data.user.id).toBe(authUser.id);
    });

    it("allows authenticated users to submit locations", async () => {
      mockedRequireAuthUser.mockResolvedValueOnce(authUser);
      mockedCreateLocation.mockResolvedValueOnce({ id: "loc-1", name: "Test Pub" });

      const { POST } = await import("@/app/api/v1/locations/route");
      const response = await POST(
        new Request("http://localhost/api/v1/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test Pub",
            locationType: "pub",
            district: "Mitte",
            address: "Street 1",
          }),
        }),
      );
      const body = await parseJson<{ status: string; data: { location: { id: string } } }>(
        response,
      );

      expect(response.status).toBe(201);
      expect(body.status).toBe("ok");
      expect(body.data.location.id).toBe("loc-1");
      expect(mockedCreateLocation).toHaveBeenCalledWith(
        expect.objectContaining({ createdById: authUser.id, status: "pending" }),
      );
    });

    it("allows authenticated users to submit reviews", async () => {
      mockedRequireAuthUser.mockResolvedValueOnce(authUser);
      mockedGetLocationReviewPermission.mockResolvedValueOnce("allowed");
      mockedCreateReview.mockResolvedValueOnce({
        id: "review-1",
        locationId: "loc-1",
        userId: authUser.id,
      });

      const { POST } = await import("@/app/api/v1/reviews/route");
      const response = await POST(
        new Request("http://localhost/api/v1/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locationId: "loc-1", rating: 4, title: "Solid", body: "Nice" }),
        }),
      );
      const body = await parseJson<{ status: string; data: { review: { id: string } } }>(response);

      expect(response.status).toBe(201);
      expect(body.status).toBe("ok");
      expect(body.data.review.id).toBe("review-1");
      expect(mockedCreateReview).toHaveBeenCalledWith(
        expect.objectContaining({ locationId: "loc-1", userId: authUser.id, rating: 4 }),
      );
    });

    it("allows authenticated users to submit reports", async () => {
      mockedRequireAuthUser.mockResolvedValueOnce(authUser);
      mockedHasUserReportedContent.mockResolvedValueOnce(false);
      mockedCreateReport.mockResolvedValueOnce({ id: "report-1", contentId: "review-1" });

      const { POST } = await import("@/app/api/v1/reports/route");
      const response = await POST(
        new Request("http://localhost/api/v1/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentType: "review",
            contentId: "review-1",
            reason: "offensive",
            note: "Bad content",
          }),
        }),
      );
      const body = await parseJson<{ status: string; data: { report: { id: string } } }>(response);

      expect(response.status).toBe(201);
      expect(body.status).toBe("ok");
      expect(body.data.report.id).toBe("report-1");
      expect(mockedCreateReport).toHaveBeenCalledWith(
        expect.objectContaining({ reporterId: authUser.id, contentId: "review-1" }),
      );
    });

    it("allows authenticated users to submit offers or price updates", async () => {
      mockedRequireAuthUser.mockResolvedValueOnce(authUser);
      mockedGetLocationContributionPermission.mockResolvedValueOnce("allowed");
      mockedGetVariantContributionPermission.mockResolvedValueOnce("allowed");
      mockedCreateOfferOrPriceUpdateProposal.mockResolvedValueOnce({
        outcome: "offer",
        offer: { id: "offer-1", locationId: "loc-1", variantId: "variant-1" },
      });

      const { POST } = await import("@/app/api/v1/beers/route");
      const response = await POST(
        new Request("http://localhost/api/v1/beers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variantId: "variant-1",
            sizeMl: 500,
            serving: "tap",
            priceCents: 499,
            locationId: "loc-1",
          }),
        }),
      );
      const body = await parseJson<{
        status: string;
        data: { outcome: string; offer: { id: string } };
      }>(response);

      expect(response.status).toBe(201);
      expect(body.status).toBe("ok");
      expect(body.data.outcome).toBe("offer_submission_created");
      expect(body.data.offer.id).toBe("offer-1");
    });
  });

  describe("moderator routes", () => {
    const moderatorCases = [
      {
        name: "GET /moderation/submissions",
        run: async () => {
          const { GET } = await import("@/app/api/v1/moderation/submissions/route");
          return GET();
        },
      },
      {
        name: "GET /moderation/reports",
        run: async () => {
          const { GET } = await import("@/app/api/v1/moderation/reports/route");
          return GET();
        },
      },
      {
        name: "PATCH /moderation/reports/:id",
        run: async () => {
          const { PATCH } = await import("@/app/api/v1/moderation/reports/[reportId]/route");
          return PATCH(
            new Request("http://localhost/api/v1/moderation/reports/report-1", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ decision: "dismissed" }),
            }),
            { params: Promise.resolve({ reportId: "report-1" }) },
          );
        },
      },
      {
        name: "PATCH /moderation/offers/:id",
        run: async () => {
          const { PATCH } = await import("@/app/api/v1/moderation/offers/[offerId]/route");
          return PATCH(
            new Request("http://localhost/api/v1/moderation/offers/offer-1", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "approved" }),
            }),
            { params: Promise.resolve({ offerId: "offer-1" }) },
          );
        },
      },
    ];

    it.each(moderatorCases)("rejects anonymous access to $name", async ({ run }) => {
      const auth = await import("@/lib/auth");
      mockedRequireModeratorUser.mockRejectedValueOnce(new auth.UnauthorizedError());

      const body = await expectUnauthorized(run);
      expect(body.error.message).toBe("Authentication required.");
    });

    it.each(moderatorCases)("rejects non-moderators from $name", async ({ run }) => {
      const auth = await import("@/lib/auth");
      mockedRequireModeratorUser.mockRejectedValueOnce(new auth.ForbiddenError());

      const body = await expectForbidden(run);
      expect(body.error.message).toBe("Moderator permissions required.");
    });

    it("allows moderators to access moderation submissions", async () => {
      mockedRequireModeratorUser.mockResolvedValueOnce(moderatorUser);
      mockedGetPendingLocationSubmissions.mockResolvedValueOnce([{ id: "loc-1" }]);
      mockedGetPendingBeerBrandSubmissions.mockResolvedValueOnce([{ id: "brand-1" }]);
      mockedGetPendingBeerVariantSubmissions.mockResolvedValueOnce([{ id: "variant-1" }]);
      mockedGetPendingBeerOfferSubmissions.mockResolvedValueOnce([{ id: "offer-1" }]);
      mockedGetPendingPriceUpdateProposals.mockResolvedValueOnce([{ id: "proposal-1" }]);

      const { GET } = await import("@/app/api/v1/moderation/submissions/route");
      const response = await GET();
      const body = await parseJson<{
        status: string;
        data: { counts: { locations: number; brands: number; variants: number; offers: number } };
      }>(response);

      expect(response.status).toBe(200);
      expect(body.status).toBe("ok");
      expect(body.data.counts.locations).toBe(1);
      expect(body.data.counts.brands).toBe(1);
      expect(body.data.counts.variants).toBe(1);
      expect(body.data.counts.offers).toBe(1);
    });

    it("allows moderators to access open reports", async () => {
      mockedRequireModeratorUser.mockResolvedValueOnce(moderatorUser);
      mockedGetOpenReports.mockResolvedValueOnce([{ id: "report-1" }]);

      const { GET } = await import("@/app/api/v1/moderation/reports/route");
      const response = await GET();
      const body = await parseJson<{ status: string; data: { reports: Array<{ id: string }> } }>(
        response,
      );

      expect(response.status).toBe(200);
      expect(body.status).toBe("ok");
      expect(body.data.reports[0]?.id).toBe("report-1");
    });

    it("allows moderators to resolve reports", async () => {
      mockedRequireModeratorUser.mockResolvedValueOnce(moderatorUser);
      mockedGetReportById.mockResolvedValueOnce({
        id: "report-1",
        status: "open",
        contentType: "review",
        contentId: "review-1",
        reason: "offensive",
        reporter: { displayName: "Reporter" },
      });
      mockedResolveReport.mockResolvedValueOnce({ id: "report-1", status: "dismissed" });
      mockedLogModerationAction.mockResolvedValueOnce();

      const { PATCH } = await import("@/app/api/v1/moderation/reports/[reportId]/route");
      const response = await PATCH(
        new Request("http://localhost/api/v1/moderation/reports/report-1", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision: "dismissed" }),
        }),
        { params: Promise.resolve({ reportId: "report-1" }) },
      );
      const body = await parseJson<{
        status: string;
        data: { report: { id: string; status: string } };
      }>(response);

      expect(response.status).toBe(200);
      expect(body.status).toBe("ok");
      expect(body.data.report.status).toBe("dismissed");
      expect(mockedLogModerationAction).toHaveBeenCalledTimes(1);
    });

    it("allows moderators to approve offer submissions", async () => {
      mockedRequireModeratorUser.mockResolvedValueOnce(moderatorUser);
      mockedModerateBeerOfferSubmission.mockResolvedValueOnce({
        outcome: "updated",
        offer: {
          id: "offer-1",
          brand: "Brand",
          variant: "Variant",
          style: "Pils",
          sizeMl: 500,
          serving: "tap",
          priceEur: 4.99,
          location: { name: "Pub 1" },
        },
      });
      mockedLogModerationAction.mockResolvedValueOnce();

      const { PATCH } = await import("@/app/api/v1/moderation/offers/[offerId]/route");
      const response = await PATCH(
        new Request("http://localhost/api/v1/moderation/offers/offer-1", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        }),
        { params: Promise.resolve({ offerId: "offer-1" }) },
      );
      const body = await parseJson<{ status: string; data: { offer: { id: string } } }>(response);

      expect(response.status).toBe(200);
      expect(body.status).toBe("ok");
      expect(body.data.offer.id).toBe("offer-1");
      expect(mockedLogModerationAction).toHaveBeenCalledTimes(1);
    });
  });

  describe("admin routes", () => {
    const adminCases = [
      {
        name: "GET /admin/users",
        run: async () => {
          const { GET } = await import("@/app/api/v1/admin/users/route");
          return GET();
        },
      },
      {
        name: "PATCH /admin/users/:id/role",
        run: async () => {
          const { PATCH } = await import("@/app/api/v1/admin/users/[userId]/role/route");
          return PATCH(
            new Request("http://localhost/api/v1/admin/users/user-1/role", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ role: "moderator" }),
            }),
            { params: Promise.resolve({ userId: "user-1" }) },
          );
        },
      },
      {
        name: "POST /admin/offers",
        run: async () => {
          const { POST } = await import("@/app/api/v1/admin/offers/route");
          return POST(
            new Request("http://localhost/api/v1/admin/offers", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                variantId: "variant-1",
                locationId: "loc-1",
                sizeMl: 500,
                serving: "tap",
                priceCents: 555,
              }),
            }),
          );
        },
      },
    ];

    it.each(adminCases)("rejects anonymous access to $name", async ({ run }) => {
      const auth = await import("@/lib/auth");
      mockedRequireAdminUser.mockRejectedValueOnce(new auth.UnauthorizedError());

      const body = await expectUnauthorized(run);
      expect(body.error.message).toBe("Authentication required.");
    });

    it.each(adminCases)("rejects non-admins from $name", async ({ run }) => {
      const auth = await import("@/lib/auth");
      mockedRequireAdminUser.mockRejectedValueOnce(new auth.ForbiddenError());

      const body = await expectForbidden(run);
      expect(body.error.message).toBe("Admin permissions required.");
    });

    it("allows admins to access user management lists", async () => {
      mockedRequireAdminUser.mockResolvedValueOnce(adminUser);
      mockedGetUsersForAdmin.mockResolvedValueOnce([{ id: "user-1" }]);

      const { GET } = await import("@/app/api/v1/admin/users/route");
      const response = await GET();
      const body = await parseJson<{ status: string; data: { users: Array<{ id: string }> } }>(
        response,
      );

      expect(response.status).toBe(200);
      expect(body.status).toBe("ok");
      expect(body.data.users[0]?.id).toBe("user-1");
    });

    it("allows admins to update roles", async () => {
      mockedRequireAdminUser.mockResolvedValueOnce(adminUser);
      mockedUpdateUserRoleByAdmin.mockResolvedValueOnce({
        outcome: "updated",
        user: { id: "user-1", role: "moderator" },
      });

      const { PATCH } = await import("@/app/api/v1/admin/users/[userId]/role/route");
      const response = await PATCH(
        new Request("http://localhost/api/v1/admin/users/user-1/role", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "moderator" }),
        }),
        { params: Promise.resolve({ userId: "user-1" }) },
      );
      const body = await parseJson<{
        status: string;
        data: { user: { id: string; role: string } };
      }>(response);

      expect(response.status).toBe(200);
      expect(body.status).toBe("ok");
      expect(body.data.user.role).toBe("moderator");
      expect(mockedUpdateUserRoleByAdmin).toHaveBeenCalledWith({
        targetUserId: "user-1",
        role: "moderator",
        actingAdminId: adminUser.id,
      });
    });

    it("allows admins to create approved offers", async () => {
      mockedRequireAdminUser.mockResolvedValueOnce(adminUser);
      mockedCreateBeerOffer.mockResolvedValueOnce({
        id: "offer-1",
        brand: "Brand",
        variant: "Variant",
        sizeMl: 500,
        priceEur: 5.55,
      });
      mockedLogModerationAction.mockResolvedValueOnce();

      const { POST } = await import("@/app/api/v1/admin/offers/route");
      const response = await POST(
        new Request("http://localhost/api/v1/admin/offers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variantId: "variant-1",
            locationId: "loc-1",
            sizeMl: 500,
            serving: "tap",
            priceCents: 555,
          }),
        }),
      );
      const body = await parseJson<{ status: string; data: { offer: { id: string } } }>(response);

      expect(response.status).toBe(201);
      expect(body.status).toBe("ok");
      expect(body.data.offer.id).toBe("offer-1");
      expect(mockedLogModerationAction).toHaveBeenCalledTimes(1);
    });
  });
});
