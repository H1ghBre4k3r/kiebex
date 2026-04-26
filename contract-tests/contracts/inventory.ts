import { assert, assertEqual, assertObject, assertString } from "../assert";
import { fixtureCookies, fixtureIds } from "../fixtures";
import type { ContractCase, ContractRequest } from "../types";
import {
  assertArrayField,
  assertIsoStringField,
  assertJsonError,
  assertJsonErrorOneOf,
  assertJsonOk,
  assertValidationDetails,
  invalidBodyContract,
  publicOkContract,
  unauthorizedContract,
} from "./helpers";

const JSON_HEADERS = { "content-type": "application/json" };

function request(method: ContractRequest["method"], path: string): ContractRequest {
  return { method, path };
}

function requestWithBody(
  method: Exclude<ContractRequest["method"], "GET" | "DELETE">,
  path: string,
  body: unknown,
): ContractRequest {
  return { method, path, headers: JSON_HEADERS, body };
}

function authedRequest(
  method: ContractRequest["method"],
  path: string,
  cookie: string,
): ContractRequest {
  return { method, path, headers: { cookie } };
}

function authedRequestWithBody(
  method: Exclude<ContractRequest["method"], "GET" | "DELETE">,
  path: string,
  cookie: string,
  body: unknown,
): ContractRequest {
  return { method, path, headers: { ...JSON_HEADERS, cookie }, body };
}

function invalidQueryContract(name: string, path: string): ContractCase {
  return {
    name,
    request: request("GET", path),
    assert(response) {
      const error = assertJsonError(response, 400, "INVALID_QUERY");
      assertValidationDetails(error);
    },
  };
}

function notFoundContract(name: string, path: string, code: string): ContractCase {
  return {
    name,
    request: request("GET", path),
    assert(response) {
      assertJsonError(response, 404, code);
    },
  };
}

function authRouteContract(
  name: string,
  method: ContractRequest["method"],
  path: string,
): ContractCase {
  return unauthorizedContract(name, request(method, path));
}

export const publicCatalogContracts: ContractCase[] = [
  {
    name: "GET /api/v1/metrics returns Prometheus text",
    request: request("GET", "/api/v1/metrics"),
    assert(response) {
      assertEqual(response.status, 200, "Expected metrics endpoint to return 200.");
      assertString(response.body, "Expected Prometheus metrics text body.");
      assert(response.body.includes("# HELP"), "Expected Prometheus HELP lines.");
      assertEqual(
        response.headers["cache-control"],
        "no-cache",
        "Expected no-cache metrics header.",
      );
    },
  },
  publicOkContract(
    "GET /api/v1/beers returns paginated offer directory",
    request("GET", "/api/v1/beers?page=not-a-number&unknown=ignored"),
    (data) => {
      assertObject(data.filters, "Expected filters object.");
      assertObject(data.pagination, "Expected pagination object.");
      assertEqual(data.pagination.page, 1, "Expected invalid page to fall back to page 1.");
      assertEqual(data.pagination.pageSize, 20, "Expected stable beer page size.");
      assertArrayField(data, "offers");
    },
  ),
  invalidQueryContract(
    "GET /api/v1/beers rejects invalid filters",
    "/api/v1/beers?sizeMl=-1&serving=draft",
  ),
  publicOkContract(
    "GET /api/v1/beer-styles returns compact styles",
    request("GET", "/api/v1/beer-styles"),
    (data) => {
      assertEqual(typeof data.count, "number", "Expected style count number.");
      const styles = assertArrayField(data, "styles");
      for (const style of styles) {
        assertObject(style, "Expected style object.");
        assertString(style.id, "Expected style id string.");
        assertString(style.name, "Expected style name string.");
        assertEqual(style.createdAt, undefined, "Expected public style to omit createdAt.");
        assertEqual(style.updatedAt, undefined, "Expected public style to omit updatedAt.");
      }
    },
  ),
  publicOkContract(
    "GET /api/v1/beer-brands returns approved compact brands",
    request("GET", "/api/v1/beer-brands"),
    (data) => {
      assertEqual(typeof data.count, "number", "Expected brand count number.");
      const brands = assertArrayField(data, "brands");
      for (const brand of brands) {
        assertObject(brand, "Expected brand object.");
        assertString(brand.id, "Expected brand id string.");
        assertString(brand.name, "Expected brand name string.");
        assertEqual(brand.status, "approved", "Expected only approved public brands.");
        assertEqual(brand.createdAt, undefined, "Expected public brand to omit createdAt.");
        assertEqual(brand.updatedAt, undefined, "Expected public brand to omit updatedAt.");
      }
    },
  ),
  publicOkContract(
    "GET /api/v1/beer-variants returns approved compact variants",
    request("GET", "/api/v1/beer-variants?brandId=%20raw-brand%20"),
    (data) => {
      assertEqual(
        data.brandId,
        " raw-brand ",
        "Expected raw brandId filter value to be preserved.",
      );
      assertEqual(typeof data.count, "number", "Expected variant count number.");
      const variants = assertArrayField(data, "variants");
      for (const variant of variants) {
        assertObject(variant, "Expected variant object.");
        assertString(variant.id, "Expected variant id string.");
        assertString(variant.name, "Expected variant name string.");
        assertString(variant.brandId, "Expected variant brandId string.");
        assertString(variant.styleId, "Expected variant styleId string.");
        assertEqual(variant.status, "approved", "Expected only approved public variants.");
        assertEqual(variant.createdAt, undefined, "Expected public variant to omit createdAt.");
        assertEqual(variant.updatedAt, undefined, "Expected public variant to omit updatedAt.");
      }
    },
  ),
  notFoundContract(
    "GET /api/v1/locations/:locationId hides missing locations",
    "/api/v1/locations/__contract_missing_location__",
    "LOCATION_NOT_FOUND",
  ),
  invalidQueryContract("GET /api/v1/reviews requires locationId", "/api/v1/reviews"),
];

export const contributionContracts: ContractCase[] = [
  authRouteContract("POST /api/v1/locations requires authentication", "POST", "/api/v1/locations"),
  authRouteContract(
    "POST /api/v1/beer-brands requires authentication",
    "POST",
    "/api/v1/beer-brands",
  ),
  authRouteContract(
    "POST /api/v1/beer-variants requires authentication",
    "POST",
    "/api/v1/beer-variants",
  ),
  authRouteContract("POST /api/v1/beers requires authentication", "POST", "/api/v1/beers"),
  authRouteContract("POST /api/v1/reviews requires authentication", "POST", "/api/v1/reviews"),
  authRouteContract(
    "PATCH /api/v1/reviews/:reviewId requires authentication",
    "PATCH",
    "/api/v1/reviews/__contract_review__",
  ),
  authRouteContract(
    "DELETE /api/v1/reviews/:reviewId requires authentication",
    "DELETE",
    "/api/v1/reviews/__contract_review__",
  ),
  authRouteContract("POST /api/v1/reports requires authentication", "POST", "/api/v1/reports"),
];

export const authenticatedUserContracts: ContractCase[] = [
  publicOkContract(
    "GET /api/v1/auth/session returns authenticated fixture user",
    authedRequest("GET", "/api/v1/auth/session", fixtureCookies.user),
    (data) => {
      assertEqual(data.authenticated, true, "Expected authenticated session.");
      assertObject(data.user, "Expected authenticated session user.");
      assertEqual(data.user.id, fixtureIds.user, "Expected fixture user id.");
      assertEqual(data.user.role, "user", "Expected fixture user role.");
    },
  ),
  publicOkContract(
    "GET /api/v1/auth/me returns authenticated fixture user",
    authedRequest("GET", "/api/v1/auth/me", fixtureCookies.user),
    (data) => {
      assertObject(data.user, "Expected current user object.");
      assertEqual(data.user.id, fixtureIds.user, "Expected fixture user id.");
      assertEqual(data.user.email, "contract-user@example.com", "Expected fixture user email.");
      assertEqual(data.user.displayName, "Contract User", "Expected fixture display name.");
      assertEqual(data.user.role, "user", "Expected fixture user role.");
    },
  ),
  publicOkContract(
    "GET /api/v1/auth/profile returns authenticated fixture user",
    authedRequest("GET", "/api/v1/auth/profile", fixtureCookies.user),
    (data) => {
      assertObject(data.user, "Expected profile user object.");
      assertEqual(data.user.id, fixtureIds.user, "Expected fixture user id.");
      assertEqual(data.user.role, "user", "Expected fixture user role.");
    },
  ),
  ...[
    ["POST /api/v1/locations validates body after authentication", "POST", "/api/v1/locations"],
    ["POST /api/v1/beer-brands validates body after authentication", "POST", "/api/v1/beer-brands"],
    [
      "POST /api/v1/beer-variants validates body after authentication",
      "POST",
      "/api/v1/beer-variants",
    ],
    ["POST /api/v1/beers validates body after authentication", "POST", "/api/v1/beers"],
    ["POST /api/v1/reviews validates body after authentication", "POST", "/api/v1/reviews"],
    ["POST /api/v1/reports validates body after authentication", "POST", "/api/v1/reports"],
    [
      "PATCH /api/v1/auth/profile validates body after authentication",
      "PATCH",
      "/api/v1/auth/profile",
    ],
    [
      "POST /api/v1/auth/change-email validates body after authentication",
      "POST",
      "/api/v1/auth/change-email",
    ],
  ].map(
    ([name, method, path]) =>
      ({
        name,
        request: authedRequestWithBody(
          method as Exclude<ContractRequest["method"], "GET" | "DELETE">,
          path,
          fixtureCookies.user,
          {},
        ),
        assert(response) {
          const error = assertJsonError(response, 400, "INVALID_BODY");
          assertValidationDetails(error);
        },
      }) satisfies ContractCase,
  ),
  {
    name: "PATCH /api/v1/reviews/:reviewId returns 404 for authenticated non-existent review",
    request: authedRequestWithBody(
      "PATCH",
      "/api/v1/reviews/__contract_missing_review__",
      fixtureCookies.user,
      { rating: 4 },
    ),
    assert(response) {
      assertJsonError(response, 404, "REVIEW_NOT_FOUND");
    },
  },
  {
    name: "DELETE /api/v1/reviews/:reviewId returns 404 for authenticated non-existent review",
    request: authedRequest(
      "DELETE",
      "/api/v1/reviews/__contract_missing_review__",
      fixtureCookies.user,
    ),
    assert(response) {
      assertJsonError(response, 404, "REVIEW_NOT_FOUND");
    },
  },
];

export const authContracts: ContractCase[] = [
  invalidBodyContract(
    "POST /api/v1/auth/register validates body",
    request("POST", "/api/v1/auth/register"),
  ),
  invalidBodyContract(
    "POST /api/v1/auth/login validates body",
    request("POST", "/api/v1/auth/login"),
  ),
  {
    name: "POST /api/v1/auth/logout clears session without authentication",
    request: {
      ...request("POST", "/api/v1/auth/logout"),
      headers: { cookie: "kbi_session=__contract_stale_session__" },
    },
    assert(response) {
      const data = assertJsonOk(response);
      assertEqual(data.message, "Logged out successfully.", "Expected stable logout message.");
      const setCookie = response.headers["set-cookie"] ?? "";
      assert(setCookie.includes("kbi_session="), "Expected logout to set kbi_session cookie.");
      assert(setCookie.includes("Path=/"), "Expected logout cookie Path=/.");
      assert(
        setCookie.includes("Expires=Thu, 01 Jan 1970 00:00:00 GMT") ||
          setCookie.toLowerCase().includes("max-age=0"),
        "Expected logout cookie to expire immediately.",
      );
    },
  },
  publicOkContract(
    "GET /api/v1/auth/session returns anonymous session",
    request("GET", "/api/v1/auth/session"),
    (data) => {
      assertEqual(data.authenticated, false, "Expected anonymous request to be unauthenticated.");
      assertEqual(data.user, null, "Expected anonymous session user to be null.");
    },
  ),
  authRouteContract("GET /api/v1/auth/me requires authentication", "GET", "/api/v1/auth/me"),
  authRouteContract(
    "GET /api/v1/auth/profile requires authentication",
    "GET",
    "/api/v1/auth/profile",
  ),
  authRouteContract(
    "PATCH /api/v1/auth/profile requires authentication",
    "PATCH",
    "/api/v1/auth/profile",
  ),
  authRouteContract(
    "POST /api/v1/auth/change-email requires authentication",
    "POST",
    "/api/v1/auth/change-email",
  ),
  invalidBodyContract(
    "POST /api/v1/auth/resend-verification validates body",
    request("POST", "/api/v1/auth/resend-verification"),
  ),
  {
    name: "GET /api/v1/auth/verify-email redirects invalid token",
    request: request("GET", "/api/v1/auth/verify-email?token=__contract_invalid_token__"),
    assert(response) {
      assertEqual(response.status, 307, "Expected invalid email verification to redirect.");
      assertString(response.headers.location, "Expected redirect location header.");
      assert(
        response.headers.location.includes("/verify-email?error=invalid"),
        "Expected invalid verification redirect reason.",
      );
    },
  },
  {
    name: "POST /api/v1/auth/verify-email validates body",
    request: requestWithBody("POST", "/api/v1/auth/verify-email", {}),
    assert(response) {
      assertJsonError(response, 400, "INVALID_TOKEN");
    },
  },
  invalidBodyContract(
    "POST /api/v1/auth/forgot-password validates body",
    request("POST", "/api/v1/auth/forgot-password"),
  ),
  invalidBodyContract(
    "POST /api/v1/auth/reset-password validates body",
    request("POST", "/api/v1/auth/reset-password"),
  ),
];

export const moderationContracts: ContractCase[] = [
  authRouteContract(
    "GET /api/v1/moderation/submissions requires moderator",
    "GET",
    "/api/v1/moderation/submissions",
  ),
  authRouteContract(
    "GET /api/v1/moderation/audit-log requires moderator",
    "GET",
    "/api/v1/moderation/audit-log",
  ),
  authRouteContract(
    "GET /api/v1/moderation/reports requires moderator",
    "GET",
    "/api/v1/moderation/reports",
  ),
  authRouteContract(
    "PATCH /api/v1/moderation/reports/:reportId requires moderator",
    "PATCH",
    "/api/v1/moderation/reports/__contract_report__",
  ),
  authRouteContract(
    "PATCH /api/v1/moderation/locations/:locationId requires moderator",
    "PATCH",
    "/api/v1/moderation/locations/__contract_location__",
  ),
  authRouteContract(
    "PUT /api/v1/moderation/locations/:locationId requires moderator",
    "PUT",
    "/api/v1/moderation/locations/__contract_location__",
  ),
  authRouteContract(
    "DELETE /api/v1/moderation/locations/:locationId requires moderator",
    "DELETE",
    "/api/v1/moderation/locations/__contract_location__",
  ),
  authRouteContract(
    "PATCH /api/v1/moderation/brands/:brandId requires moderator",
    "PATCH",
    "/api/v1/moderation/brands/__contract_brand__",
  ),
  authRouteContract(
    "DELETE /api/v1/moderation/brands/:brandId requires moderator",
    "DELETE",
    "/api/v1/moderation/brands/__contract_brand__",
  ),
  authRouteContract(
    "PATCH /api/v1/moderation/variants/:variantId requires moderator",
    "PATCH",
    "/api/v1/moderation/variants/__contract_variant__",
  ),
  authRouteContract(
    "DELETE /api/v1/moderation/variants/:variantId requires moderator",
    "DELETE",
    "/api/v1/moderation/variants/__contract_variant__",
  ),
  authRouteContract(
    "PATCH /api/v1/moderation/offers/:offerId requires moderator",
    "PATCH",
    "/api/v1/moderation/offers/__contract_offer__",
  ),
  authRouteContract(
    "PUT /api/v1/moderation/offers/:offerId requires moderator",
    "PUT",
    "/api/v1/moderation/offers/__contract_offer__",
  ),
  authRouteContract(
    "DELETE /api/v1/moderation/offers/:offerId requires moderator",
    "DELETE",
    "/api/v1/moderation/offers/__contract_offer__",
  ),
  authRouteContract(
    "PATCH /api/v1/moderation/price-updates/:proposalId requires moderator",
    "PATCH",
    "/api/v1/moderation/price-updates/__contract_proposal__",
  ),
  authRouteContract(
    "DELETE /api/v1/moderation/price-updates/:proposalId requires moderator",
    "DELETE",
    "/api/v1/moderation/price-updates/__contract_proposal__",
  ),
  authRouteContract(
    "PATCH /api/v1/moderation/reviews/:reviewId requires moderator",
    "PATCH",
    "/api/v1/moderation/reviews/__contract_review__",
  ),
  authRouteContract(
    "PUT /api/v1/moderation/reviews/:reviewId requires moderator",
    "PUT",
    "/api/v1/moderation/reviews/__contract_review__",
  ),
  authRouteContract(
    "DELETE /api/v1/moderation/reviews/:reviewId requires moderator",
    "DELETE",
    "/api/v1/moderation/reviews/__contract_review__",
  ),
];

export const authenticatedModeratorContracts: ContractCase[] = [
  publicOkContract(
    "GET /api/v1/moderation/submissions allows moderator fixture",
    authedRequest("GET", "/api/v1/moderation/submissions", fixtureCookies.moderator),
    (data) => {
      assertArrayField(data, "pendingLocations");
      assertArrayField(data, "pendingBrands");
      assertArrayField(data, "pendingVariants");
      assertArrayField(data, "pendingOffers");
      assertArrayField(data, "pendingPriceUpdates");
      assertObject(data.counts, "Expected moderation counts object.");
    },
  ),
  publicOkContract(
    "GET /api/v1/moderation/audit-log allows moderator fixture",
    authedRequest("GET", "/api/v1/moderation/audit-log", fixtureCookies.moderator),
    (data) => {
      assertArrayField(data, "entries");
    },
  ),
  publicOkContract(
    "GET /api/v1/moderation/reports allows moderator fixture",
    authedRequest("GET", "/api/v1/moderation/reports", fixtureCookies.moderator),
    (data) => {
      assertArrayField(data, "reports");
    },
  ),
  {
    name: "GET /api/v1/moderation/submissions rejects plain authenticated user",
    request: authedRequest("GET", "/api/v1/moderation/submissions", fixtureCookies.user),
    assert(response) {
      assertJsonError(response, 403, "FORBIDDEN");
    },
  },
  ...[
    [
      "PATCH /api/v1/moderation/reports/:reportId validates body after moderator auth",
      "PATCH",
      "/api/v1/moderation/reports/__contract_report__",
    ],
    [
      "PATCH /api/v1/moderation/locations/:locationId validates body after moderator auth",
      "PATCH",
      "/api/v1/moderation/locations/__contract_location__",
    ],
    [
      "PUT /api/v1/moderation/locations/:locationId validates body after moderator auth",
      "PUT",
      "/api/v1/moderation/locations/__contract_location__",
    ],
    [
      "PATCH /api/v1/moderation/brands/:brandId validates body after moderator auth",
      "PATCH",
      "/api/v1/moderation/brands/__contract_brand__",
    ],
    [
      "PATCH /api/v1/moderation/variants/:variantId validates body after moderator auth",
      "PATCH",
      "/api/v1/moderation/variants/__contract_variant__",
    ],
    [
      "PATCH /api/v1/moderation/offers/:offerId validates body after moderator auth",
      "PATCH",
      "/api/v1/moderation/offers/__contract_offer__",
    ],
    [
      "PUT /api/v1/moderation/offers/:offerId validates body after moderator auth",
      "PUT",
      "/api/v1/moderation/offers/__contract_offer__",
    ],
    [
      "PATCH /api/v1/moderation/price-updates/:proposalId validates body after moderator auth",
      "PATCH",
      "/api/v1/moderation/price-updates/__contract_proposal__",
    ],
    [
      "PATCH /api/v1/moderation/reviews/:reviewId validates body after moderator auth",
      "PATCH",
      "/api/v1/moderation/reviews/__contract_review__",
    ],
    [
      "PUT /api/v1/moderation/reviews/:reviewId validates body after moderator auth",
      "PUT",
      "/api/v1/moderation/reviews/__contract_review__",
    ],
  ].map(
    ([name, method, path]) =>
      ({
        name,
        request: authedRequestWithBody(
          method as Exclude<ContractRequest["method"], "GET" | "DELETE">,
          path,
          fixtureCookies.moderator,
          {},
        ),
        assert(response) {
          const error = assertJsonError(response, 400, "INVALID_BODY");
          assertValidationDetails(error);
        },
      }) satisfies ContractCase,
  ),
];

export const adminContracts: ContractCase[] = [
  authRouteContract("GET /api/v1/admin/users requires admin", "GET", "/api/v1/admin/users"),
  authRouteContract(
    "DELETE /api/v1/admin/users/:userId requires admin",
    "DELETE",
    "/api/v1/admin/users/__contract_user__",
  ),
  authRouteContract(
    "PATCH /api/v1/admin/users/:userId/role requires admin",
    "PATCH",
    "/api/v1/admin/users/__contract_user__/role",
  ),
  authRouteContract(
    "POST /api/v1/admin/users/:userId/ban requires admin",
    "POST",
    "/api/v1/admin/users/__contract_user__/ban",
  ),
  authRouteContract(
    "POST /api/v1/admin/users/:userId/unban requires admin",
    "POST",
    "/api/v1/admin/users/__contract_user__/unban",
  ),
  authRouteContract(
    "POST /api/v1/admin/users/:userId/verify requires admin",
    "POST",
    "/api/v1/admin/users/__contract_user__/verify",
  ),
  authRouteContract(
    "POST /api/v1/admin/users/:userId/resend-verification requires admin",
    "POST",
    "/api/v1/admin/users/__contract_user__/resend-verification",
  ),
  authRouteContract("POST /api/v1/admin/styles requires admin", "POST", "/api/v1/admin/styles"),
  authRouteContract(
    "PUT /api/v1/admin/styles/:styleId requires admin",
    "PUT",
    "/api/v1/admin/styles/__contract_style__",
  ),
  authRouteContract(
    "DELETE /api/v1/admin/styles/:styleId requires admin",
    "DELETE",
    "/api/v1/admin/styles/__contract_style__",
  ),
  authRouteContract("POST /api/v1/admin/brands requires admin", "POST", "/api/v1/admin/brands"),
  authRouteContract(
    "PUT /api/v1/admin/brands/:brandId requires admin",
    "PUT",
    "/api/v1/admin/brands/__contract_brand__",
  ),
  authRouteContract(
    "DELETE /api/v1/admin/brands/:brandId requires admin",
    "DELETE",
    "/api/v1/admin/brands/__contract_brand__",
  ),
  authRouteContract("POST /api/v1/admin/variants requires admin", "POST", "/api/v1/admin/variants"),
  authRouteContract(
    "PUT /api/v1/admin/variants/:variantId requires admin",
    "PUT",
    "/api/v1/admin/variants/__contract_variant__",
  ),
  authRouteContract(
    "DELETE /api/v1/admin/variants/:variantId requires admin",
    "DELETE",
    "/api/v1/admin/variants/__contract_variant__",
  ),
  authRouteContract(
    "POST /api/v1/admin/locations requires admin",
    "POST",
    "/api/v1/admin/locations",
  ),
  authRouteContract("POST /api/v1/admin/offers requires admin", "POST", "/api/v1/admin/offers"),
];

export const authenticatedAdminContracts: ContractCase[] = [
  publicOkContract(
    "GET /api/v1/admin/users allows admin fixture",
    authedRequest("GET", "/api/v1/admin/users", fixtureCookies.admin),
    (data) => {
      const users = assertArrayField(data, "users");
      const fixtureAdmin = users.find(
        (user) =>
          typeof user === "object" && user !== null && "id" in user && user.id === fixtureIds.admin,
      );
      assertObject(fixtureAdmin, "Expected fixture admin in users list.");
      assertEqual(fixtureAdmin.passwordHash, null, "Expected admin users to redact passwordHash.");
    },
  ),
  {
    name: "GET /api/v1/admin/users rejects moderator fixture",
    request: authedRequest("GET", "/api/v1/admin/users", fixtureCookies.moderator),
    assert(response) {
      assertJsonError(response, 403, "FORBIDDEN");
    },
  },
  ...[
    ["POST /api/v1/admin/styles validates body after admin auth", "POST", "/api/v1/admin/styles"],
    [
      "PUT /api/v1/admin/styles/:styleId validates body after admin auth",
      "PUT",
      "/api/v1/admin/styles/__contract_style__",
    ],
    ["POST /api/v1/admin/brands validates body after admin auth", "POST", "/api/v1/admin/brands"],
    [
      "PUT /api/v1/admin/brands/:brandId validates body after admin auth",
      "PUT",
      "/api/v1/admin/brands/__contract_brand__",
    ],
    [
      "POST /api/v1/admin/variants validates body after admin auth",
      "POST",
      "/api/v1/admin/variants",
    ],
    [
      "PUT /api/v1/admin/variants/:variantId validates body after admin auth",
      "PUT",
      "/api/v1/admin/variants/__contract_variant__",
    ],
    [
      "POST /api/v1/admin/locations validates body after admin auth",
      "POST",
      "/api/v1/admin/locations",
    ],
    ["POST /api/v1/admin/offers validates body after admin auth", "POST", "/api/v1/admin/offers"],
    [
      "PATCH /api/v1/admin/users/:userId/role validates body after admin auth",
      "PATCH",
      "/api/v1/admin/users/__contract_user__/role",
    ],
  ].map(
    ([name, method, path]) =>
      ({
        name,
        request: authedRequestWithBody(
          method as Exclude<ContractRequest["method"], "GET" | "DELETE">,
          path,
          fixtureCookies.admin,
          {},
        ),
        assert(response) {
          const error = assertJsonError(response, 400, "INVALID_BODY");
          assertValidationDetails(error);
        },
      }) satisfies ContractCase,
  ),
];

export const testSupportContracts: ContractCase[] = [
  {
    name: "POST /api/v1/test/auth-links is unavailable unless test mode is enabled",
    request: requestWithBody("POST", "/api/v1/test/auth-links", {
      kind: "verification",
      email: "missing@example.com",
    }),
    assert(response) {
      const error = assertJsonErrorOneOf(response, [
        { status: 404, code: "NOT_FOUND" },
        { status: 404, code: "AUTH_EMAIL_NOT_FOUND" },
      ]);
      assertString(error.message, "Expected test auth-links error message.");
    },
  },
];

export const operationalShapeContracts: ContractCase[] = [
  {
    name: "GET /api/v1/health exposes documented health fields",
    request: request("GET", "/api/v1/health"),
    assert(response) {
      const data = assertJsonOk(response);
      assertEqual(data.service, "kiebex", "Expected stable service name.");
      assert(
        data.status === "healthy" || data.status === "degraded",
        "Expected documented health status.",
      );
      assertObject(data.checks, "Expected health checks object.");
      assert(
        data.checks.database === "ok" || data.checks.database === "error",
        "Expected documented database check status.",
      );
      assertIsoStringField(data, "timestamp");
    },
  },
];

export const routeInventoryContracts: ContractCase[] = [
  ...publicCatalogContracts,
  ...contributionContracts,
  ...authenticatedUserContracts,
  ...authContracts,
  ...moderationContracts,
  ...authenticatedModeratorContracts,
  ...adminContracts,
  ...authenticatedAdminContracts,
  ...testSupportContracts,
];
