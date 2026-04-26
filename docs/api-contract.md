# API Contract (`/api/v1`)

This document defines the current public HTTP contract for the Next.js API. It is the baseline used while migrating routes to Rust.

## Conventions

- Base path: `/api/v1`.
- Default content type: JSON (`application/json`).
- Authentication: opaque cookie session named `kbi_session`.
- Most handlers add `X-Request-ID`.
- Date values serialize as ISO strings.
- Route sections below document paths relative to `/api/v1`; for example `GET /health` means `GET /api/v1/health`.
- Unknown JSON body fields are currently stripped by Zod object parsing unless a route documents custom parsing.
- Unknown query parameters are ignored unless a route documents custom parsing.
- Empty query parameter values are ignored by routes that use shared query parsers.
- Shared shapes are reusable references. Route sections are authoritative for whether optional fields are actually present in a specific response.
- Success envelope:

```json
{
  "status": "ok",
  "data": {}
}
```

- Error envelope:

```json
{
  "status": "error",
  "error": {
    "code": "INVALID_BODY",
    "message": "One or more fields are invalid.",
    "details": [{ "path": "fieldName", "message": "reason" }]
  }
}
```

## Auth And Roles

| Requirement   | Rule                                  |
| ------------- | ------------------------------------- |
| Public        | No session required.                  |
| Authenticated | Valid `kbi_session` required.         |
| Moderator     | `moderator` or `admin` role required. |
| Admin         | `admin` role required.                |

Common auth errors:

| Status | Code           | Meaning                                           |
| -----: | -------------- | ------------------------------------------------- |
|    401 | `UNAUTHORIZED` | Authentication required.                          |
|    403 | `FORBIDDEN`    | The current user does not have the required role. |

## Validation Errors

Body-bearing routes that use `parseJsonBody` share these errors:

| Status | Code           | Meaning                             |
| -----: | -------------- | ----------------------------------- |
|    400 | `INVALID_JSON` | Request body is not valid JSON.     |
|    400 | `INVALID_BODY` | JSON body failed schema validation. |

Query-bearing routes that validate query params use:

| Status | Code            | Meaning                                |
| -----: | --------------- | -------------------------------------- |
|    400 | `INVALID_QUERY` | Query params failed schema validation. |

## Route Inventory And Migration Status

Owner describes the current implementation owner. Status describes the Rust migration state, not whether the route exists today.

| Method | Path                                       | Auth             | Owner   | Status     | Contract Test |
| ------ | ------------------------------------------ | ---------------- | ------- | ---------- | ------------- |
| GET    | `/health`                                  | Public           | Next.js | Unmigrated | Needed        |
| GET    | `/metrics`                                 | Public           | Next.js | Unmigrated | Needed        |
| GET    | `/beers`                                   | Public           | Next.js | Unmigrated | Needed        |
| POST   | `/beers`                                   | Authenticated    | Next.js | Unmigrated | Needed        |
| GET    | `/beer-styles`                             | Public           | Next.js | Unmigrated | Needed        |
| GET    | `/beer-brands`                             | Public           | Next.js | Unmigrated | Needed        |
| POST   | `/beer-brands`                             | Authenticated    | Next.js | Unmigrated | Needed        |
| GET    | `/beer-variants`                           | Public           | Next.js | Unmigrated | Needed        |
| POST   | `/beer-variants`                           | Authenticated    | Next.js | Unmigrated | Needed        |
| POST   | `/locations`                               | Authenticated    | Next.js | Unmigrated | Needed        |
| GET    | `/locations/:locationId`                   | Public           | Next.js | Unmigrated | Needed        |
| GET    | `/reviews`                                 | Public           | Next.js | Unmigrated | Needed        |
| POST   | `/reviews`                                 | Authenticated    | Next.js | Unmigrated | Needed        |
| PATCH  | `/reviews/:reviewId`                       | Authenticated    | Next.js | Unmigrated | Needed        |
| DELETE | `/reviews/:reviewId`                       | Authenticated    | Next.js | Unmigrated | Needed        |
| POST   | `/reports`                                 | Authenticated    | Next.js | Unmigrated | Needed        |
| POST   | `/auth/register`                           | Public           | Next.js | Unmigrated | Needed        |
| POST   | `/auth/login`                              | Public           | Next.js | Unmigrated | Needed        |
| POST   | `/auth/logout`                             | Public           | Next.js | Unmigrated | Needed        |
| GET    | `/auth/session`                            | Optional session | Next.js | Unmigrated | Needed        |
| GET    | `/auth/me`                                 | Authenticated    | Next.js | Unmigrated | Needed        |
| GET    | `/auth/profile`                            | Authenticated    | Next.js | Unmigrated | Needed        |
| PATCH  | `/auth/profile`                            | Authenticated    | Next.js | Unmigrated | Needed        |
| POST   | `/auth/change-email`                       | Authenticated    | Next.js | Unmigrated | Needed        |
| POST   | `/auth/resend-verification`                | Public           | Next.js | Unmigrated | Needed        |
| GET    | `/auth/verify-email`                       | Public           | Next.js | Unmigrated | Needed        |
| POST   | `/auth/verify-email`                       | Public           | Next.js | Unmigrated | Needed        |
| POST   | `/auth/forgot-password`                    | Public           | Next.js | Unmigrated | Needed        |
| POST   | `/auth/reset-password`                     | Public           | Next.js | Unmigrated | Needed        |
| GET    | `/moderation/submissions`                  | Moderator        | Next.js | Unmigrated | Needed        |
| GET    | `/moderation/audit-log`                    | Moderator        | Next.js | Unmigrated | Needed        |
| GET    | `/moderation/reports`                      | Moderator        | Next.js | Unmigrated | Needed        |
| PATCH  | `/moderation/reports/:reportId`            | Moderator        | Next.js | Unmigrated | Needed        |
| PATCH  | `/moderation/locations/:locationId`        | Moderator        | Next.js | Unmigrated | Needed        |
| PUT    | `/moderation/locations/:locationId`        | Moderator        | Next.js | Unmigrated | Needed        |
| DELETE | `/moderation/locations/:locationId`        | Moderator        | Next.js | Unmigrated | Needed        |
| PATCH  | `/moderation/brands/:brandId`              | Moderator        | Next.js | Unmigrated | Needed        |
| DELETE | `/moderation/brands/:brandId`              | Moderator        | Next.js | Unmigrated | Needed        |
| PATCH  | `/moderation/variants/:variantId`          | Moderator        | Next.js | Unmigrated | Needed        |
| DELETE | `/moderation/variants/:variantId`          | Moderator        | Next.js | Unmigrated | Needed        |
| PATCH  | `/moderation/offers/:offerId`              | Moderator        | Next.js | Unmigrated | Needed        |
| PUT    | `/moderation/offers/:offerId`              | Moderator        | Next.js | Unmigrated | Needed        |
| DELETE | `/moderation/offers/:offerId`              | Moderator        | Next.js | Unmigrated | Needed        |
| PATCH  | `/moderation/price-updates/:proposalId`    | Moderator        | Next.js | Unmigrated | Needed        |
| DELETE | `/moderation/price-updates/:proposalId`    | Moderator        | Next.js | Unmigrated | Needed        |
| PATCH  | `/moderation/reviews/:reviewId`            | Moderator        | Next.js | Unmigrated | Needed        |
| PUT    | `/moderation/reviews/:reviewId`            | Moderator        | Next.js | Unmigrated | Needed        |
| DELETE | `/moderation/reviews/:reviewId`            | Moderator        | Next.js | Unmigrated | Needed        |
| GET    | `/admin/users`                             | Admin            | Next.js | Unmigrated | Needed        |
| DELETE | `/admin/users/:userId`                     | Admin            | Next.js | Unmigrated | Needed        |
| PATCH  | `/admin/users/:userId/role`                | Admin            | Next.js | Unmigrated | Needed        |
| POST   | `/admin/users/:userId/ban`                 | Admin            | Next.js | Unmigrated | Needed        |
| POST   | `/admin/users/:userId/unban`               | Admin            | Next.js | Unmigrated | Needed        |
| POST   | `/admin/users/:userId/verify`              | Admin            | Next.js | Unmigrated | Needed        |
| POST   | `/admin/users/:userId/resend-verification` | Admin            | Next.js | Unmigrated | Needed        |
| POST   | `/admin/styles`                            | Admin            | Next.js | Unmigrated | Needed        |
| PUT    | `/admin/styles/:styleId`                   | Admin            | Next.js | Unmigrated | Needed        |
| DELETE | `/admin/styles/:styleId`                   | Admin            | Next.js | Unmigrated | Needed        |
| POST   | `/admin/brands`                            | Admin            | Next.js | Unmigrated | Needed        |
| PUT    | `/admin/brands/:brandId`                   | Admin            | Next.js | Unmigrated | Needed        |
| DELETE | `/admin/brands/:brandId`                   | Admin            | Next.js | Unmigrated | Needed        |
| POST   | `/admin/variants`                          | Admin            | Next.js | Unmigrated | Needed        |
| PUT    | `/admin/variants/:variantId`               | Admin            | Next.js | Unmigrated | Needed        |
| DELETE | `/admin/variants/:variantId`               | Admin            | Next.js | Unmigrated | Needed        |
| POST   | `/admin/locations`                         | Admin            | Next.js | Unmigrated | Needed        |
| POST   | `/admin/offers`                            | Admin            | Next.js | Unmigrated | Needed        |
| POST   | `/test/auth-links`                         | Test mode only   | Next.js | Unmigrated | Needed        |

## Shared Shapes

These shapes describe reusable JSON structures. Fields marked optional are not universally returned by the current API. For strict migration parity, follow the route-specific notes and examples in later sections.

Current public catalog mappers return compact entities:

- `Location` responses from public catalog routes include `id`, `name`, `locationType`, `district`, `address`, `status`, and `createdById`; they do not include `createdAt` or `updatedAt`.
- `BeerStyle` responses from public catalog routes include `id` and `name`; they do not include `createdAt` or `updatedAt`.
- `BeerBrand` responses from public catalog routes include `id`, `name`, `status`, and `createdById`; they do not include `createdAt` or `updatedAt`.
- `BeerVariant` responses from public catalog routes include `id`, `name`, `brandId`, `styleId`, `status`, `createdById`, and optional compact `brand`/`style`; they do not include `createdAt` or `updatedAt`.
- `BeerOfferWithLocation` responses include denormalized `brand`, `variant`, `style`, `priceEur`, and nested compact `location`; they do not include `createdAt` or `updatedAt` unless a moderation route explicitly documents them.
- Admin `User` responses always expose `passwordHash: null`, never the stored password hash.

### `AuthUser`

```ts
{
  id: string;
  email: string;
  displayName: string;
  role: "user" | "moderator" | "admin";
}
```

### `User`

```ts
{
  id: string;
  email: string;
  displayName: string;
  role: "user" | "moderator" | "admin";
  passwordHash: null;
  emailVerified: boolean;
  isBanned: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### `Location`

```ts
{
  id: string;
  name: string;
  locationType: "pub" | "bar" | "restaurant" | "supermarket";
  district: string;
  address: string;
  status: "pending" | "approved" | "rejected";
  createdById?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
```

### `BeerStyle`

```ts
{
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}
```

### `BeerBrand`

```ts
{
  id: string;
  name: string;
  status: "pending" | "approved" | "rejected";
  createdById?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
```

### `BeerVariant`

```ts
{
  id: string;
  name: string;
  brandId: string;
  styleId: string;
  status: "pending" | "approved" | "rejected";
  createdById?: string | null;
  brand?: BeerBrand;
  style?: BeerStyle;
  createdAt?: string;
  updatedAt?: string;
}
```

### `BeerOfferWithLocation`

```ts
{
  id: string;
  brand: string;
  variant: string;
  variantId: string;
  style: string;
  sizeMl: number;
  serving: "tap" | "bottle" | "can";
  priceEur: number;
  locationId: string;
  status: "pending" | "approved" | "rejected";
  createdById?: string | null;
  createdAt?: string;
  updatedAt?: string;
  location: Location;
}
```

### `OfferPriceHistory`

```ts
{
  id: string;
  beerOfferId: string;
  priceEur: number;
  effectiveAt: string;
  priceUpdateProposalId?: string | null;
  createdAt: string;
}
```

### `PriceUpdateProposal`

```ts
{
  id: string;
  beerOfferId: string;
  proposedPriceEur: number;
  status: "pending" | "approved" | "rejected";
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### `ReviewWithAuthor`

```ts
{
  id: string;
  locationId: string;
  userId: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  status: "new" | "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    displayName: string;
  };
}
```

### `ModerationReview`

```ts
ReviewWithAuthor & {
  locationName: string;
}
```

### `Report`

```ts
{
  id: string;
  reporterId: string | null;
  contentType: "review";
  contentId: string;
  reason: "offensive" | "spam" | "inappropriate" | "other";
  note: string | null;
  status: "open" | "dismissed" | "actioned";
  resolvedById: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  snapshotAuthorId: string | null;
  snapshotAuthorName: string | null;
  snapshotRating: number | null;
  snapshotTitle: string | null;
  snapshotBody: string | null;
}
```

### `ModerationAuditLogEntry`

```ts
{
  id: string;
  moderatorId: string | null;
  moderatorName: string;
  currentModeratorName: string | null;
  action: "approve" | "reject" | "delete" | "edit" | "ban" | "unban" | "dismiss" | "action";
  contentType: "location" |
    "brand" |
    "style" |
    "variant" |
    "offer" |
    "price_update" |
    "review" |
    "user" |
    "report";
  contentId: string;
  details: string | null;
  createdAt: string;
}
```

## Operational

### `GET /health`

Auth: public.

Request: no query or body.

Success: `200` when healthy, `503` when degraded. Both responses still use the JSON success envelope.

```ts
{
  service: "kiebex";
  status: "healthy" | "degraded";
  checks: {
    database: "ok" | "error";
  }
  timestamp: string;
}
```

### `GET /metrics`

Auth: public.

Request: no query or body.

Success: `200` plain Prometheus text. This route does not use the JSON envelope and sets `Cache-Control: no-cache`.

## Public Catalog And Directory

### `GET /beers`

Auth: public.

Query params:

| Name           | Type                                                       | Notes                                                 |
| -------------- | ---------------------------------------------------------- | ----------------------------------------------------- |
| `brandId`      | `string[]`                                                 | Repeatable, trim, min 1, max 100.                     |
| `variantId`    | `string[]`                                                 | Repeatable, trim, min 1, max 100.                     |
| `styleId`      | `string[]`                                                 | Repeatable, trim, min 1, max 100.                     |
| `sizeMl`       | `number[]`                                                 | Repeatable, integer, positive, max 2000.              |
| `serving`      | `("tap" \| "bottle" \| "can")[]`                           | Repeatable.                                           |
| `locationType` | `("pub" \| "bar" \| "restaurant" \| "supermarket")[]`      | Repeatable.                                           |
| `locationId`   | `string[]`                                                 | Repeatable, trim, min 1, max 100.                     |
| `sort`         | `"price_asc" \| "price_desc" \| "name_asc" \| "name_desc"` | Optional.                                             |
| `page`         | number-like string                                         | Optional; invalid or missing values fall back to `1`. |

Parsing behavior:

- Repeated filters use every non-empty occurrence, for example `?brandId=a&brandId=b`.
- Single comma-delimited values are not split.
- Empty values are ignored before validation.
- Invalid filter values return `400 INVALID_QUERY`.
- `page` is parsed separately from the validated filter object; invalid, missing, zero, or negative values resolve to page `1`.
- Unknown query parameters are ignored.

Success: `200`.

```ts
{
  filters: {
    brandId?: string[];
    variantId?: string[];
    styleId?: string[];
    sizeMl?: number[];
    serving?: ("tap" | "bottle" | "can")[];
    locationType?: ("pub" | "bar" | "restaurant" | "supermarket")[];
    locationId?: string[];
    sort?: "price_asc" | "price_desc" | "name_asc" | "name_desc";
  };
  pagination: {
    page: number;
    pageSize: 20;
    total: number;
    totalPages: number;
  };
  offers: BeerOfferWithLocation[];
}
```

Response ordering:

- Default and `price_asc`: ascending `priceEur`, then location name, brand, variant, size, serving, and id.
- `price_desc`: descending `priceEur`, then location name, brand, variant, size, serving, and id.
- `name_asc`: ascending brand, variant, location name, size, serving, and id.
- `name_desc`: descending brand and variant, then location name, size, serving, and id.

Errors:

| Status | Code            |
| -----: | --------------- |
|    400 | `INVALID_QUERY` |

### `GET /beer-styles`

Auth: public.

Request: no query or body.

Success: `200`.

```ts
{
  count: number;
  styles: BeerStyle[];
}
```

Behavior:

- Returns all styles ordered by `name` ascending.
- Style objects contain `id` and `name` only.

### `GET /beer-brands`

Auth: public.

Request: no query or body.

Success: `200`.

```ts
{
  count: number;
  brands: BeerBrand[];
}
```

Behavior:

- Returns only approved brands ordered by `name` ascending.
- Brand objects contain `id`, `name`, `status`, and `createdById`.

### `GET /beer-variants`

Auth: public.

Query params:

| Name      | Type   | Notes                      |
| --------- | ------ | -------------------------- |
| `brandId` | string | Optional raw filter value. |

Success: `200`.

```ts
{
  brandId?: string;
  count: number;
  variants: BeerVariant[];
}
```

Behavior:

- `brandId` is a raw optional filter value. It is not trimmed or schema-validated by this route.
- Returns only approved variants for public requests.
- Variants are ordered by brand name ascending, then variant name ascending.
- Variant objects include compact nested `brand` and `style` objects.

### `GET /locations/:locationId`

Auth: public.

Path params:

```ts
{
  locationId: string;
}
```

Success: `200`.

```ts
{
  location: Location;
  count: number;
  offers: (BeerOfferWithLocation & { priceHistory: OfferPriceHistory[] })[];
  reviews: ReviewWithAuthor[];
  reviewCount: number;
}
```

Behavior:

- Only approved locations are visible. Missing, pending, and rejected locations all return `404 LOCATION_NOT_FOUND`.
- Offers include approved offers for the location with `priceHistory` ordered newest first by `effectiveAt`.
- Reviews include statuses `new` and `approved`, ordered by `createdAt` descending.

Errors:

| Status | Code                 |
| -----: | -------------------- |
|    404 | `LOCATION_NOT_FOUND` |

### `GET /reviews`

Auth: public.

Query params:

| Name         | Type   | Notes                           |
| ------------ | ------ | ------------------------------- |
| `locationId` | string | Required, trim, min 1, max 100. |

Success: `200`.

```ts
{
  locationId: string;
  count: number;
  reviews: ReviewWithAuthor[];
}
```

Behavior:

- Only approved locations are visible. Missing, pending, and rejected locations all return `404 LOCATION_NOT_FOUND`.
- Reviews include statuses `new` and `approved`, ordered by `createdAt` descending.

Errors:

| Status | Code                 |
| -----: | -------------------- |
|    400 | `INVALID_QUERY`      |
|    404 | `LOCATION_NOT_FOUND` |

## Contributions And User Content

### `POST /locations`

Auth: authenticated.

Request body:

```ts
{
  name: string; // trim, min 2, max 120
  locationType: "pub" | "bar" | "restaurant" | "supermarket";
  district: string; // trim, min 2, max 80
  address: string; // trim, min 5, max 200
}
```

Success: `201`.

```ts
{
  location: Location;
}
```

Errors:

| Status | Code                |
| -----: | ------------------- |
|    409 | `LOCATION_CONFLICT` |

Current schema note: no unique constraint exists on `Location`, so `LOCATION_CONFLICT` is a defensive handler for a future database constraint and is not expected from the current production schema.

### `POST /beer-brands`

Auth: authenticated.

Request body:

```ts
{
  name: string; // trim, min 1, max 120
}
```

Success: `201`.

```ts
{
  brand: BeerBrand;
}
```

Errors:

| Status | Code             |
| -----: | ---------------- |
|    409 | `BRAND_CONFLICT` |

### `POST /beer-variants`

Auth: authenticated.

Request body:

```ts
{
  name: string; // trim, min 1, max 120
  brandId: string; // trim, min 1, max 100
  styleId: string; // trim, min 1, max 100
}
```

Success: `201`.

```ts
{
  variant: BeerVariant;
}
```

Errors:

| Status | Code                       |
| -----: | -------------------------- |
|    404 | `BRAND_NOT_FOUND`          |
|    403 | `BRAND_PENDING_RESTRICTED` |
|    409 | `VARIANT_CONFLICT`         |
|    404 | `STYLE_OR_BRAND_NOT_FOUND` |

### `POST /beers`

Auth: authenticated.

Request body:

```ts
{
  variantId: string; // trim, min 1, max 100
  sizeMl: number; // integer, positive, max 2000
  serving: "tap" | "bottle" | "can";
  priceCents: number; // integer, positive, max 50000
  locationId: string; // trim, min 1, max 100
}
```

Success: `201` when a new offer submission is created.

```ts
{
  outcome: "offer_submission_created";
  offer: BeerOfferWithLocation;
}
```

Success: `201` when an approved matching offer exists and a price update is proposed.

```ts
{
  outcome: "price_update_proposed";
  proposal: PriceUpdateProposal;
  offer: BeerOfferWithLocation;
}
```

Errors:

| Status | Code                          |
| -----: | ----------------------------- |
|    404 | `LOCATION_NOT_FOUND`          |
|    403 | `LOCATION_PENDING_RESTRICTED` |
|    404 | `VARIANT_NOT_FOUND`           |
|    403 | `VARIANT_PENDING_RESTRICTED`  |
|    409 | `EXISTING_OFFER_PENDING`      |
|    409 | `SAME_PRICE_ALREADY_ACTIVE`   |
|    409 | `OFFER_CONFLICT`              |
|    404 | `RELATION_NOT_FOUND`          |

### `POST /reviews`

Auth: authenticated.

Request body:

```ts
{
  locationId: string; // trim, min 1, max 100
  rating: number; // integer, 1..5
  title?: string; // trim, min 1, max 120
  body?: string; // trim, min 1, max 1500
}
```

Success: `201`.

```ts
{
  review: ReviewWithAuthor;
}
```

Errors:

| Status | Code                    |
| -----: | ----------------------- |
|    404 | `LOCATION_NOT_FOUND`    |
|    403 | `LOCATION_NOT_APPROVED` |
|    404 | `RELATION_NOT_FOUND`    |

### `PATCH /reviews/:reviewId`

Auth: authenticated. Only the review owner can edit.

Path params:

```ts
{
  reviewId: string;
}
```

Request body:

```ts
{
  rating: number; // integer, 1..5
  title?: string | null; // trim, min 1, max 120
  body?: string | null; // trim, min 1, max 1500
}
```

Success: `200`.

```ts
{
  review: ReviewWithAuthor;
}
```

Errors:

| Status | Code               |
| -----: | ------------------ |
|    404 | `REVIEW_NOT_FOUND` |

### `DELETE /reviews/:reviewId`

Auth: authenticated. Only the review owner can delete.

Path params:

```ts
{
  reviewId: string;
}
```

Success: `200`.

```ts
{
  message: "Review deleted.";
}
```

Errors:

| Status | Code               |
| -----: | ------------------ |
|    404 | `REVIEW_NOT_FOUND` |

### `POST /reports`

Auth: authenticated.

Request body:

```ts
{
  contentType: "review";
  contentId: string; // trim, min 1, max 100
  reason: "offensive" | "spam" | "inappropriate" | "other";
  note?: string; // trim, max 500
}
```

Success: `201`.

```ts
{
  report: Report;
}
```

Errors:

| Status | Code               |
| -----: | ------------------ |
|    409 | `ALREADY_REPORTED` |

Behavior:

- The current route does not validate that the referenced review exists before creating the report.
- Duplicate detection is per reporter, `contentType`, and `contentId`.

## Authentication

### Session Cookie

`POST /auth/login`, `GET /auth/verify-email`, and `POST /auth/verify-email` create a `kbi_session` cookie.

Cookie attributes:

| Attribute  | Value           |
| ---------- | --------------- |
| `HttpOnly` | yes             |
| `SameSite` | `lax`           |
| `Secure`   | production only |
| `Path`     | `/`             |
| Expiry     | 7 days          |

`POST /auth/logout` clears the cookie and deletes the current server-side session when present.

Expired sessions are treated as unauthenticated. The current implementation does not delete expired sessions during ordinary auth checks.

### `POST /auth/register`

Auth: public.

Request body:

```ts
{
  email: string; // trim, email, max 255
  displayName: string; // trim, min 2, max 80
  password: string; // min 8, max 128, at least one letter and one number
}
```

Success: `201`. Registration creates an unverified account and sends or logs a verification email. It does not create a session.

```ts
{
  message: "Account created. Please check your email to verify your address.";
}
```

Errors:

| Status | Code                  |
| -----: | --------------------- |
|    409 | `EMAIL_IN_USE`        |
|    500 | `CONFIGURATION_ERROR` |

### `POST /auth/login`

Auth: public.

Request body:

```ts
{
  email: string; // trim, email, max 255
  password: string; // min 1, max 128
}
```

Success: `200`. Creates a session and sets `kbi_session`.

```ts
{
  user: AuthUser;
}
```

Errors:

| Status | Code                  |
| -----: | --------------------- |
|    401 | `INVALID_CREDENTIALS` |
|    403 | `EMAIL_NOT_VERIFIED`  |
|    403 | `ACCOUNT_BANNED`      |

### `POST /auth/logout`

Auth: public.

Request: no query or body.

Success: `200`. Deletes current session if one exists and clears `kbi_session`.

```ts
{
  message: "Logged out successfully.";
}
```

### `GET /auth/session`

Auth: public with optional session.

Request: no query or body.

Success: `200`.

```ts
{
  authenticated: boolean;
  user: AuthUser | null;
}
```

### `GET /auth/me`

Auth: authenticated.

Request: no query or body.

Success: `200`.

```ts
{
  user: AuthUser;
}
```

### `GET /auth/profile`

Auth: authenticated.

Request: no query or body.

Success: `200`.

```ts
{
  user: AuthUser;
}
```

### `PATCH /auth/profile`

Auth: authenticated.

Request body:

```ts
{
  displayName?: string; // trim, min 2, max 80
  currentPassword?: string; // min 1, max 128
  newPassword?: string; // min 8, max 128, at least one letter and one number
}
```

At least one of `displayName` or `newPassword` is required. `currentPassword` is required when `newPassword` is present.

Success: `200`.

```ts
{
  user: AuthUser;
}
```

Errors:

| Status | Code             |
| -----: | ---------------- |
|    400 | `WRONG_PASSWORD` |

### `POST /auth/change-email`

Auth: authenticated.

Request body:

```ts
{
  newEmail: string; // trim, email, max 255
  currentPassword: string; // min 1, max 128
}
```

Success: `200`. Stores `pendingEmail`, creates a verification token, and sends or logs an email-change verification email.

```ts
{
  message: "Verification email sent to your new address.";
}
```

Errors:

| Status | Code             |
| -----: | ---------------- |
|    400 | `WRONG_PASSWORD` |
|    400 | `SAME_EMAIL`     |
|    409 | `EMAIL_TAKEN`    |
|    500 | `INTERNAL_ERROR` |

### `POST /auth/resend-verification`

Auth: public.

Request body:

```ts
{
  email: string; // trim, email, max 255
}
```

Success: always `200`. If the address belongs to an unverified user, previous verification tokens are invalidated and a new email is sent or logged.

```ts
{
  message: "If that address is registered and unverified, a new verification email has been sent.";
}
```

Errors:

| Status | Code                  |
| -----: | --------------------- |
|    500 | `CONFIGURATION_ERROR` |

### `GET /auth/verify-email`

Auth: public.

Query params:

| Name    | Type   | Notes                                  |
| ------- | ------ | -------------------------------------- |
| `token` | string | Required in practice; raw query token. |

Success: redirect, not a JSON envelope. A valid token verifies the email or confirms a pending email change, creates a session, sets `kbi_session`, and redirects to `/`.

Failure: redirect to `/verify-email?error=<reason>`.

Possible error reasons:

| Reason           |
| ---------------- |
| `invalid`        |
| `expired`        |
| `email_conflict` |

### `POST /auth/verify-email`

Auth: public.

Request body:

```ts
{
  token: string; // min 1, max 128
}
```

Success: `200`. Verifies the email or confirms a pending email change, creates a session, and sets `kbi_session`.

```ts
{
  message: "Email verified. You are now signed in.";
}
```

Errors:

| Status | Code                       |
| -----: | -------------------------- |
|    400 | `INVALID_TOKEN`            |
|    400 | `INVALID_OR_EXPIRED_TOKEN` |
|    409 | `EMAIL_CONFLICT`           |

### `POST /auth/forgot-password`

Auth: public.

Request body:

```ts
{
  email: string; // trim, email, max 255
}
```

Success: always `200`. For existing verified non-banned users, previous reset tokens are invalidated and a reset email is sent or logged.

```ts
{
  sent: true;
}
```

### `POST /auth/reset-password`

Auth: public.

Request body:

```ts
{
  token: string; // min 1, max 128
  password: string; // min 8, max 128, at least one letter and one number
}
```

Success: `200`. Updates the password, deletes all reset tokens for the user, and deletes all sessions for the user.

```ts
{
  reset: true;
}
```

Errors:

| Status | Code            |
| -----: | --------------- |
|    400 | `TOKEN_EXPIRED` |
|    400 | `TOKEN_INVALID` |

## Moderation

All routes in this section require moderator or admin permissions.

### `GET /moderation/submissions`

Request: no query or body.

Success: `200`.

```ts
{
  pendingLocations: (Location & { createdAt: string; submitter: { id: string; displayName: string; email: string } | null })[];
  pendingBrands: (BeerBrand & { createdAt: string; submitter: { id: string; displayName: string; email: string } | null })[];
  pendingVariants: (BeerVariant & { createdAt: string; submitter: { id: string; displayName: string; email: string } | null })[];
  pendingOffers: (BeerOfferWithLocation & { createdAt: string; submitter: { id: string; displayName: string; email: string } | null })[];
  pendingPriceUpdates: (PriceUpdateProposal & { offer: BeerOfferWithLocation; submitter: { id: string; displayName: string; email: string } | null })[];
  counts: {
    locations: number;
    brands: number;
    variants: number;
    offers: number;
    priceUpdates: number;
  };
}
```

### `GET /moderation/audit-log`

Request: no query or body.

Success: `200`.

```ts
{
  entries: ModerationAuditLogEntry[];
}
```

### `GET /moderation/reports`

Request: no query or body.

Success: `200`.

```ts
{
  reports: (Report & {
    reporter: { id: string; displayName: string } | null;
    reviewLocationId?: string | null;
  })[];
}
```

### `PATCH /moderation/reports/:reportId`

Path params: `{ reportId: string }`.

Request body:

```ts
{
  decision: "dismissed" | "actioned";
}
```

Success: `200`.

```ts
{
  report: Report;
}
```

Errors:

| Status | Code               |
| -----: | ------------------ |
|    404 | `NOT_FOUND`        |
|    409 | `ALREADY_RESOLVED` |

### `PATCH /moderation/locations/:locationId`

Path params: `{ locationId: string }`.

Request body:

```ts
{
  status: "approved" | "rejected";
}
```

Success: `200` with `{ location: Location }`.

Errors: `404 LOCATION_SUBMISSION_NOT_FOUND`.

### `PUT /moderation/locations/:locationId`

Path params: `{ locationId: string }`.

Request body, with at least one field required:

```ts
{
  name?: string; // trim, min 2, max 120
  locationType?: "pub" | "bar" | "restaurant" | "supermarket";
  district?: string; // trim, min 2, max 80
  address?: string; // trim, min 5, max 200
}
```

Success: `200` with `{ location: Location }`.

Errors: `404 LOCATION_NOT_FOUND`.

### `DELETE /moderation/locations/:locationId`

Path params: `{ locationId: string }`.

Success: `200` with `{ deleted: true }`.

Errors: `404 LOCATION_NOT_FOUND`.

### `PATCH /moderation/brands/:brandId`

Path params: `{ brandId: string }`.

Request body: `{ status: "approved" | "rejected" }`.

Success: `200` with `{ brand: BeerBrand }`.

Errors: `404 BRAND_SUBMISSION_NOT_FOUND`.

### `DELETE /moderation/brands/:brandId`

Path params: `{ brandId: string }`.

Success: `200` with `{ deleted: true }`.

Errors: `404 BRAND_NOT_FOUND`.

### `PATCH /moderation/variants/:variantId`

Path params: `{ variantId: string }`.

Request body: `{ status: "approved" | "rejected" }`.

Success: `200` with `{ variant: BeerVariant }`.

Errors: `404 VARIANT_SUBMISSION_NOT_FOUND`, `409 BRAND_NOT_APPROVED`.

### `DELETE /moderation/variants/:variantId`

Path params: `{ variantId: string }`.

Success: `200` with `{ deleted: true }`.

Errors: `404 VARIANT_NOT_FOUND`.

### `PATCH /moderation/offers/:offerId`

Path params: `{ offerId: string }`.

Request body: `{ status: "approved" | "rejected" }`.

Success: `200` with `{ offer: BeerOfferWithLocation }`.

Errors: `404 OFFER_SUBMISSION_NOT_FOUND`, `409 LOCATION_NOT_APPROVED`, `409 VARIANT_NOT_APPROVED`.

### `PUT /moderation/offers/:offerId`

Path params: `{ offerId: string }`.

Request body:

```ts
{
  priceCents: number; // integer, positive, max 50000
}
```

Success: `200` with `{ offer: BeerOfferWithLocation }`.

Errors: `404 OFFER_NOT_FOUND`.

### `DELETE /moderation/offers/:offerId`

Path params: `{ offerId: string }`.

Success: `200` with `{ deleted: true }`.

Errors: `404 OFFER_NOT_FOUND`.

### `PATCH /moderation/price-updates/:proposalId`

Path params: `{ proposalId: string }`.

Request body: `{ status: "approved" | "rejected" }`.

Success: `200`.

```ts
{
  proposal: PriceUpdateProposal;
  offer: BeerOfferWithLocation;
}
```

Errors: `404 PRICE_UPDATE_PROPOSAL_NOT_FOUND`, `409 OFFER_NOT_APPROVED`, `409 LOCATION_NOT_APPROVED`, `409 VARIANT_NOT_APPROVED`.

### `DELETE /moderation/price-updates/:proposalId`

Path params: `{ proposalId: string }`.

Success: `200` with `{ deleted: true }`.

Errors: `404 PRICE_UPDATE_PROPOSAL_NOT_FOUND`.

### `PATCH /moderation/reviews/:reviewId`

Path params: `{ reviewId: string }`.

Request body: `{ status: "approved" | "rejected" }`.

Success: `200` with `{ review: ModerationReview }`.

Errors: `404 REVIEW_NOT_FOUND`, `409 REVIEW_ALREADY_APPROVED`.

### `PUT /moderation/reviews/:reviewId`

Path params: `{ reviewId: string }`.

Request body, with at least one field required:

```ts
{
  rating?: number; // integer, 1..5
  title?: string | null; // trim, min 1, max 120
  body?: string | null; // trim, min 1, max 1500
}
```

Success: `200` with `{ review: ModerationReview }`.

Errors: `404 REVIEW_NOT_FOUND`.

### `DELETE /moderation/reviews/:reviewId`

Path params: `{ reviewId: string }`.

Success: `200` with `{ deleted: true }`.

Errors: `404 REVIEW_NOT_FOUND`.

## Admin

All routes in this section require admin permissions.

### `GET /admin/users`

Request: no query or body.

Success: `200`.

```ts
{
  users: User[];
}
```

### `DELETE /admin/users/:userId`

Path params: `{ userId: string }`.

Success: `200` with `{ deleted: true }`.

Errors: `404 USER_NOT_FOUND`, `409 CANNOT_DELETE_SELF`, `409 LAST_ADMIN_PROTECTION`.

### `PATCH /admin/users/:userId/role`

Path params: `{ userId: string }`.

Request body:

```ts
{
  role: "user" | "moderator" | "admin";
}
```

Success: `200` with `{ user: User }`.

Errors: `404 USER_NOT_FOUND`, `409 LAST_ADMIN_PROTECTION`.

### `POST /admin/users/:userId/ban`

Path params: `{ userId: string }`.

Success: `200` with `{ user: User }`.

Errors: `404 USER_NOT_FOUND`, `409 CANNOT_BAN_SELF`, `409 ALREADY_BANNED`.

### `POST /admin/users/:userId/unban`

Path params: `{ userId: string }`.

Success: `200` with `{ user: User }`.

Errors: `404 USER_NOT_FOUND`, `409 NOT_BANNED`.

### `POST /admin/users/:userId/verify`

Path params: `{ userId: string }`.

Success: `200` with `{ user: User }`.

Errors: `404 USER_NOT_FOUND`, `409 ALREADY_VERIFIED`.

### `POST /admin/users/:userId/resend-verification`

Path params: `{ userId: string }`.

Success: `200`.

```ts
{
  message: "Verification email sent.";
}
```

Errors: `404 USER_NOT_FOUND`, `409 ALREADY_VERIFIED`.

### `POST /admin/styles`

Request body: `{ name: string }`, trim, min 2, max 120.

Success: `201` with `{ style: BeerStyle }`.

Errors: `409 STYLE_NAME_CONFLICT`.

### `PUT /admin/styles/:styleId`

Path params: `{ styleId: string }`.

Request body: `{ name: string }`, trim, min 2, max 120.

Success: `200` with `{ style: BeerStyle }`.

Errors: `404 STYLE_NOT_FOUND`, `409 STYLE_NAME_CONFLICT`.

### `DELETE /admin/styles/:styleId`

Path params: `{ styleId: string }`.

Success: `200` with `{ deleted: true }`.

Errors: `404 STYLE_NOT_FOUND`, `409 STYLE_IN_USE`.

### `POST /admin/brands`

Request body: `{ name: string }`, trim, min 2, max 120.

Success: `201` with `{ brand: BeerBrand }`.

Errors: `409 BRAND_NAME_CONFLICT`.

### `PUT /admin/brands/:brandId`

Path params: `{ brandId: string }`.

Request body: `{ name: string }`, trim, min 2, max 120.

Success: `200` with `{ brand: BeerBrand }`.

Errors: `404 BRAND_NOT_FOUND`, `409 BRAND_NAME_CONFLICT`.

### `DELETE /admin/brands/:brandId`

Path params: `{ brandId: string }`.

Success: `200` with `{ deleted: true }`.

Errors: `404 BRAND_NOT_FOUND`, `409 BRAND_IN_USE`.

### `POST /admin/variants`

Request body:

```ts
{
  name: string; // trim, min 1, max 120
  brandId: string; // trim, min 1, max 100
  styleId: string; // trim, min 1, max 100
}
```

Success: `201` with `{ variant: BeerVariant }`.

Errors: `404 RELATION_NOT_FOUND`, `409 VARIANT_NAME_CONFLICT`.

### `PUT /admin/variants/:variantId`

Path params: `{ variantId: string }`.

Request body, with at least one field required:

```ts
{
  name?: string; // trim, min 2, max 120
  styleId?: string; // min 1
}
```

Success: `200` with `{ variant: BeerVariant }`.

Errors: `404 VARIANT_NOT_FOUND`, `404 RELATION_NOT_FOUND`, `409 VARIANT_NAME_CONFLICT`.

### `DELETE /admin/variants/:variantId`

Path params: `{ variantId: string }`.

Success: `200` with `{ deleted: true }`.

Errors: `404 VARIANT_NOT_FOUND`, `409 VARIANT_IN_USE`.

### `POST /admin/locations`

Request body:

```ts
{
  name: string; // trim, min 2, max 120
  locationType: "pub" | "bar" | "restaurant" | "supermarket";
  district: string; // trim, min 2, max 80
  address: string; // trim, min 5, max 200
}
```

Success: `201` with `{ location: Location }`.

### `POST /admin/offers`

Request body:

```ts
{
  variantId: string; // trim, min 1, max 100
  sizeMl: number; // integer, positive, max 2000
  serving: "tap" | "bottle" | "can";
  priceCents: number; // integer, positive, max 50000
  locationId: string; // trim, min 1, max 100
}
```

Success: `201` with `{ offer: BeerOfferWithLocation }`.

Errors: `404 RELATION_NOT_FOUND`, `409 OFFER_CONFLICT`.

## Test Support

### `POST /test/auth-links`

Auth: public, but only active when `E2E_TEST_MODE=true`.

Request body:

```ts
{
  kind: "verification" | "change_email_verification" | "password_reset";
  email: string; // trim, email, max 255
}
```

Success: `200`.

```ts
{
  url: string;
  email: {
    kind: "verification" | "change_email_verification" | "password_reset";
    to: string;
    subject: string;
    text: string;
    html: string;
    createdAt: string;
  }
}
```

Errors:

| Status | Code                   |
| -----: | ---------------------- |
|    404 | `NOT_FOUND`            |
|    400 | `INVALID_BODY`         |
|    404 | `AUTH_EMAIL_NOT_FOUND` |
