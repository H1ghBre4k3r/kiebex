# API Contract (`/api/v1`)

This document defines the current HTTP contract for the Kiel Beer Index API.

## Conventions

- Base path: `/api/v1`
- Content type: JSON (`application/json`)
- Authentication: cookie session (`kbi_session`) for protected endpoints
- Response envelope:

```json
{
  "status": "ok",
  "data": {}
}
```

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

## Auth and Roles

- Public: no session required
- Authenticated: valid session required (`401 UNAUTHORIZED` otherwise)
- Moderator: `moderator` or `admin` role required (`403 FORBIDDEN` otherwise)
- Admin: `admin` role required (`403 FORBIDDEN` otherwise)

## Common Error Codes

- `INVALID_JSON`: request body is not valid JSON
- `INVALID_BODY`: body schema validation failed
- `INVALID_QUERY`: query schema validation failed
- `UNAUTHORIZED`: authentication required
- `FORBIDDEN`: insufficient role permissions
- `RELATION_NOT_FOUND`: referenced relation is missing

## Health

### `GET /health` (public)

Returns service liveness.

Example response:

```json
{
  "status": "ok",
  "data": {
    "service": "kiel-beer-index",
    "status": "healthy",
    "timestamp": "2026-04-08T18:21:20.123Z"
  }
}
```

## Offers and Catalog

### `GET /beers` (public)

Query parameters (all optional, filter params accept multiple values via repeated keys):

- `brandId` (string, repeatable — e.g. `?brandId=a&brandId=b`)
- `variantId` (string, repeatable)
- `styleId` (string, repeatable)
- `sizeMl` (integer `1..2000`, repeatable)
- `serving` (`tap | bottle | can`, repeatable)
- `locationType` (`pub | bar | restaurant | supermarket`, repeatable)
- `locationId` (string, repeatable)
- `sort` (`price_asc | price_desc`, default `price_asc`, single value)

Example:

```bash
curl "http://localhost:3000/api/v1/beers?serving=tap&sizeMl=500"
```

Success fields:

- `filters`: validated filter object
- `count`: number of returned offers
- `offers`: approved offers with location, brand/style metadata

Possible errors:

- `400 INVALID_QUERY`

### `POST /beers` (authenticated)

Creates a pending offer submission, or a pending price update proposal when an approved matching offer already exists.

Request body:

```json
{
  "variantId": "variant-guinness-stout",
  "sizeMl": 500,
  "serving": "tap",
  "priceCents": 690,
  "locationId": "pogue-mahone"
}
```

Success:

- `201` with `outcome: "offer_submission_created"` and `offer`
- `201` with `outcome: "price_update_proposed"` and `proposal` + `offer`

Possible errors:

- `401 UNAUTHORIZED`
- `404 LOCATION_NOT_FOUND`
- `404 VARIANT_NOT_FOUND`
- `403 LOCATION_PENDING_RESTRICTED`
- `403 VARIANT_PENDING_RESTRICTED`
- `409 EXISTING_OFFER_PENDING`
- `409 SAME_PRICE_ALREADY_ACTIVE`
- `409 OFFER_CONFLICT`
- `404 RELATION_NOT_FOUND`

### `GET /beer-styles` (public)

Returns:

- `count`
- `styles`

### `GET /beer-brands` (public)

Returns approved brands:

- `count`
- `brands`

### `POST /beer-brands` (authenticated)

Creates a pending beer brand submission.

Request body:

```json
{
  "name": "New Brand"
}
```

Possible errors:

- `401 UNAUTHORIZED`
- `409 BRAND_CONFLICT`

### `GET /beer-variants` (public)

Optional query:

- `brandId`

Returns:

- `brandId`
- `count`
- `variants`

### `POST /beer-variants` (authenticated)

Creates a pending beer variant submission.

Request body:

```json
{
  "name": "Dry Hopped",
  "brandId": "brand-guinness",
  "styleId": "style-stout"
}
```

Possible errors:

- `401 UNAUTHORIZED`
- `404 BRAND_NOT_FOUND`
- `403 BRAND_PENDING_RESTRICTED`
- `409 VARIANT_CONFLICT`
- `404 STYLE_OR_BRAND_NOT_FOUND`

## Locations and Reviews

### `POST /locations` (authenticated)

Creates a pending location submission.

Request body:

```json
{
  "name": "Neue Kneipe",
  "locationType": "pub",
  "district": "Altstadt",
  "address": "Teststrasse 12, 24103 Kiel"
}
```

Possible errors:

- `401 UNAUTHORIZED`
- `409 LOCATION_CONFLICT`

### `GET /locations/:locationId` (public)

Returns one approved location with approved offers, per-offer price history, and approved reviews.

Success fields:

- `location`
- `count`
- `offers` (each includes `priceHistory`)
- `reviews`
- `reviewCount`

Possible errors:

- `404 LOCATION_NOT_FOUND`

### `GET /reviews` (public)

Required query:

- `locationId`

Returns:

- `locationId`
- `count`
- `reviews`

Possible errors:

- `400 INVALID_QUERY`
- `404 LOCATION_NOT_FOUND`

### `POST /reviews` (authenticated)

Creates an approved review for an approved location.

Request body:

```json
{
  "locationId": "pogue-mahone",
  "rating": 5,
  "title": "Great pint",
  "body": "Consistent quality and friendly staff."
}
```

Possible errors:

- `401 UNAUTHORIZED`
- `404 LOCATION_NOT_FOUND`
- `403 LOCATION_NOT_APPROVED`
- `404 RELATION_NOT_FOUND`

## Authentication Endpoints

### `POST /auth/register` (public)

Request body:

- `email` (valid email)
- `displayName` (2..80 chars)
- `password` (8..128 chars, at least one letter and one number)

On success:

- `201`
- creates a session cookie
- returns `user`

Possible errors:

- `409 EMAIL_IN_USE`

### `POST /auth/login` (public)

Request body:

- `email`
- `password`

On success:

- `200`
- creates a session cookie
- returns `user`

Possible errors:

- `401 INVALID_CREDENTIALS`

### `POST /auth/logout` (public)

Clears current session cookie and token record.

Returns:

- `message`

### `GET /auth/session` (public)

Returns:

- `authenticated` (boolean)
- `user` (or `null`)

### `GET /auth/me` (authenticated)

Returns current authenticated user.

Possible errors:

- `401 UNAUTHORIZED`

## Moderation Endpoints

All moderation endpoints require moderator or admin role.

Decision body for `PATCH` endpoints:

```json
{
  "status": "approved"
}
```

Allowed status values: `approved | rejected`

### `GET /moderation/submissions`

Returns all pending queues and queue counts:

- `pendingLocations`
- `pendingBrands`
- `pendingVariants`
- `pendingOffers`
- `pendingPriceUpdates`
- `counts`

### `PATCH /moderation/locations/:locationId`

Possible domain errors:

- `404 LOCATION_SUBMISSION_NOT_FOUND`

### `PATCH /moderation/brands/:brandId`

Possible domain errors:

- `404 BRAND_SUBMISSION_NOT_FOUND`

### `PATCH /moderation/variants/:variantId`

Possible domain errors:

- `404 VARIANT_SUBMISSION_NOT_FOUND`
- `409 BRAND_NOT_APPROVED`

### `PATCH /moderation/offers/:offerId`

Possible domain errors:

- `404 OFFER_SUBMISSION_NOT_FOUND`
- `409 LOCATION_NOT_APPROVED`
- `409 VARIANT_NOT_APPROVED`

### `PATCH /moderation/price-updates/:proposalId`

Possible domain errors:

- `404 PRICE_UPDATE_PROPOSAL_NOT_FOUND`
- `409 OFFER_NOT_APPROVED`
- `409 LOCATION_NOT_APPROVED`
- `409 VARIANT_NOT_APPROVED`

## Admin Endpoints

All admin endpoints require admin role.

### `GET /admin/users`

Returns:

- `users`

### `PATCH /admin/users/:userId/role`

Request body:

```json
{
  "role": "moderator"
}
```

Allowed roles: `user | moderator | admin`

Possible domain errors:

- `404 USER_NOT_FOUND`
- `409 LAST_ADMIN_PROTECTION`

### `POST /admin/styles`

Creates a new beer style.

Request body:

```json
{
  "name": "Pale Ale"
}
```

Success: `201` with `style`.

Possible errors:

- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `400 INVALID_BODY`
- `409 STYLE_NAME_CONFLICT`

### `PUT /admin/styles/:styleId`

Renames a beer style.

Request body:

```json
{
  "name": "American Pale Ale"
}
```

Possible errors:

- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `400 INVALID_BODY`
- `404 STYLE_NOT_FOUND`
- `409 STYLE_NAME_CONFLICT`

### `DELETE /admin/styles/:styleId`

Deletes a beer style. Fails if any variants reference it.

Possible errors:

- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `404 STYLE_NOT_FOUND`
- `409 STYLE_IN_USE`
