import { assert, assertEqual, assertObject, assertString } from "../assert";
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
  ...authContracts,
  ...moderationContracts,
  ...adminContracts,
  ...testSupportContracts,
];
