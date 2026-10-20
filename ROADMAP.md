# Rust Backend And React Frontend Migration Plan

## Goal

Migrate the current Next.js + Prisma application to a Rust backend and a React frontend without a big-bang rewrite. The safest path is a strangler migration: keep the existing `/api/v1/*` contract stable, run a Rust API next to the current Next.js app, and move one route at a time behind the same public URL.

This is possible, but there are two important constraints:

- Next.js currently owns both API routes and server-rendered pages. Several pages call `src/lib/query.ts`, `src/lib/auth.ts`, or `src/lib/page-auth.ts` directly, so removing Next requires more than migrating API routes.
- Prisma currently generates IDs client-side. The Postgres columns are `TEXT` primary keys without database defaults, so Rust write paths must generate IDs explicitly while both systems write to the same database. We should not preserve `cuid()` indefinitely; keep compatibility only long enough to migrate safely, then move to a better database-owned ID strategy.

## Decisions

- Final frontend target: static SPA is acceptable.
- Route switching must be represented correctly in `manifests/production/ingress.yml` and `manifests/review-app/ingress.yml`.
- Current `cuid()`-style IDs are not a long-term requirement.
- Rust should own email delivery when auth routes move.
- API response parity means deciding how exactly the Rust implementation must match the current Next responses while both implementations coexist. The recommended level is strict parity for public contracts: same status codes, same response envelope, same field names, same important error codes, same cookie behavior, same ordering where documented, and compatible validation errors. Internal implementation details and incidental wording can change only after the frontend and tests no longer depend on them.

## Status

Rust serves `GET /api/v1/health` and `GET /api/v1/beer-styles`, routed by method + path. Everything else is served by Next.js. `docs/api-contract.md` holds the per-route owner, migration status, and contract coverage.

In place:

- Rust service in `backend/`: response envelope, request ID, logging, metrics, config, DB pool, OpenAPI (`/api-docs`, `npm run api:spec`), and CI (fmt, check, clippy, test, release build).
- Contract tests in `contract-tests/` run against either implementation, can be filtered with `CONTRACT_TEST_PATTERN`, and have a Next-vs-Rust parity mode.
- The same allowlist is routed to Rust in three places: `scripts/local-route-switch.mjs`, `manifests/production/ingress.yml`, and `manifests/review-app/ingress.yml`.
- `GET /api/v1/metrics` exists in Rust for service observability. It is not a traffic cutover and is not scraped yet (see `FUTURE_WORK.md`).

First milestone (prove the migration mechanics without touching risky business logic):

1. [x] Add Rust service skeleton in `backend/`.
2. [x] Implement response envelope, request ID, logging, metrics, config, and DB pool.
3. [x] Implement `GET /api/v1/health`.
4. [x] Add shared contract test for `GET /api/v1/health`.
5. [x] Add local routing for migrated routes.
6. [ ] Route `GET /api/v1/health` to Rust in production and review-app ingress, verify it in production, and mark it migrated in `docs/api-contract.md`.

Next: verify `GET /api/v1/beer-styles` in production alongside health, then continue the Phase 3 order with `GET /api/v1/beer-brands` and `GET /api/v1/beer-variants` before tackling auth or writes.

## Current Backend Shape

The current backend surface is concentrated under `src/app/api/v1/**/route.ts` and uses shared helpers:

- Response envelope: `src/lib/http.ts` returns `{ status: "ok", data }` and `{ status: "error", error: { code, message, details } }`.
- Validation: `src/lib/validation.ts` with Zod schemas and consistent `INVALID_JSON`, `INVALID_BODY`, and `INVALID_QUERY` errors.
- Auth: `src/lib/auth.ts` uses an opaque `kbi_session` cookie, SHA-256 session token hashes, `Session` rows, scrypt password hashes, email verification tokens, password reset tokens, and roles `user`, `moderator`, `admin`.
- Authorization: API route wrappers `withApiAuth`, `withApiModerator`, and `withApiAdmin` enforce 401/403 behavior.
- Data access: most DB logic is centralized in `src/lib/query.ts`; route handlers should stay thin.
- Observability: `withMetrics` records HTTP metrics, logs structured access lines, and adds `X-Request-ID`.
- Database: Postgres via Prisma and `@prisma/adapter-pg`; generated client lives in `src/generated/prisma`.

API route groups today:

- Public reads: `GET /api/v1/health`, `GET /api/v1/beers`, `GET /api/v1/locations/:id`, `GET /api/v1/beer-styles`, `GET /api/v1/beer-brands`, `GET /api/v1/beer-variants`.
- Public/authenticated contributions: `POST /api/v1/locations`, `POST /api/v1/beers`, `POST /api/v1/beer-brands`, `POST /api/v1/beer-variants`, `POST /api/v1/reviews`, review update/delete routes, and reports.
- Auth: register, login, logout, me/session/profile, email verification, email change, password reset.
- Moderation: submissions, audit log, reports, and moderation operations for locations, brands, variants, offers, price updates, and reviews.
- Admin: user management plus CRUD-style admin routes for brands, variants, styles, locations, and offers.
- Operational: metrics and test auth link route.

## Recommended Rust Stack

Use a small, explicit Rust service rather than a framework-heavy replacement.

- HTTP framework: `axum` with `tower` and `tower-http`.
- Async runtime: `tokio`.
- Database: `sqlx` with Postgres. This is the most direct migration away from Prisma and gives compile-time checked SQL where practical.
- Migrations: `sqlx migrate` after cutover. During the parallel phase, keep Prisma migrations as the source of truth until Rust has schema ownership.
- Serialization: `serde` and `serde_json`.
- Validation: `garde` or `validator`. Prefer one validation crate and mirror the current Zod constraints exactly.
- Errors: `thiserror` for domain errors and one API error mapper that emits the current JSON envelope.
- Auth/passwords: preserve the current `scrypt$<salt>$<hex>` password format and SHA-256 session token hashing first; only change password hashing in a later migration with a backward-compatible verifier.
- Cookies: `axum-extra` cookie support or manual `Set-Cookie` handling with the same attributes currently used.
- Observability: `tracing`, `tracing-subscriber`, `tower-http` trace/request-id layers, and Prometheus metrics via `metrics` + `metrics-exporter-prometheus` or the `prometheus` crate.
- OpenAPI/contracts: generate OpenAPI from Rust with `utoipa`, commit the generated spec, and generate frontend TypeScript types from that spec. During migration, contract tests still protect compatibility with the existing Next behavior.
- Testing: Rust unit tests, integration tests with `testcontainers` or Docker Compose Postgres, and shared HTTP contract tests that can run against either Next or Rust.

## Target Architecture

During migration:

```text
Browser
  -> stable public URLs (/api/v1/* and pages)
  -> routing layer
       -> Next.js app for legacy pages and unmigrated API routes
       -> Rust API for migrated API routes
  -> one shared Postgres database
```

At the end:

```text
Browser
  -> React app static assets
  -> Rust API (/api/v1/*)
  -> Postgres
```

Keep the API base path `/api/v1` stable throughout the migration. The frontend should not need to know whether a route is served by Next or Rust.

## Route Switching Strategy

Use an explicit routing switch so each route can move independently.

Preferred production setup:

- Use the existing Traefik `IngressRoute` manifests as the route switch point.
- Update `manifests/production/ingress.yml` for production traffic.
- Update `manifests/review-app/ingress.yml` for review app traffic.
- Add a Rust backend `Service` and `Deployment`, then route selected method/path matches to that service while the default host route continues to `kiebex-service`.
- Maintain an allowlist of migrated route/method pairs that route to Rust.
- Route everything else to Next.
- Move one method at a time when needed. For example, `GET /api/v1/beers` can move before `POST /api/v1/beers`.

Traefik-specific notes:

- Use higher-priority routes for migrated API paths so they win over the catch-all host route.
- Match exact paths or path prefixes carefully. Avoid sending `POST /api/v1/beers` to Rust just because `GET /api/v1/beers` has moved.
- If method-level routing is supported in the deployed Traefik CRD version, use `Method(`GET`)` plus `Path(`/api/v1/...`)`. If not, split paths conservatively or use a small internal gateway/proxy that can switch by method.
- Keep production and review-app manifests structurally aligned so every migrated route can be tested in a review app before production.

Useful local setup:

- Run Next on one port and Rust on another.
- Add a local reverse proxy, or temporarily add tiny Next route shims that proxy specific migrated routes to Rust.
- Do not change frontend call sites for each migrated route; keep using `/api/v1/...`.

Avoid routing an entire path to Rust if only one method has moved. Some paths currently contain both easy reads and harder writes, such as `GET /api/v1/beers` and `POST /api/v1/beers`.

## Backend Migration Phases

### Phase 0: Freeze Contracts Before Moving Code

1. Keep `docs/api-contract.md` as the canonical baseline for every API route, method, query parameter, request body, response body, status code, error code, cookie side effect, auth requirement, route owner, migration status, and contract test status.
2. Convert the existing Jest API tests into route contract tests where possible.
3. Add missing contract tests for high-risk routes before migrating them.
4. Add a test mode that can run the same HTTP assertions against either `NEXT_API_BASE_URL` or `RUST_API_BASE_URL`.
5. Capture current behavior for validation failures, unique constraint errors, auth failures, and permission failures.

Acceptance criteria:

- There is a route inventory with owners and migration status.
- Each candidate route has at least one contract test before it moves.
- The contract test runner can point at both implementations.

### Phase 1: Create The Rust Service Skeleton

1. Add a Rust workspace, for example `backend/`.
2. Create an `api` crate using `axum`, `tokio`, `tower-http`, `serde`, `sqlx`, `tracing`, and metrics dependencies.
3. Add shared app state: Postgres pool, config, clock abstraction for tests if needed, mailer abstraction, and metrics registry/exporter.
4. Implement the current response envelope helpers in Rust:
   - `json_ok(data, status)`
   - `json_error(status, code, message, details)`
5. Implement request ID behavior equivalent to `withMetrics`, including `X-Request-ID`.
6. Implement `/api/v1/health` against the same `DATABASE_URL` with the current response shape.
7. Add CI jobs for `cargo fmt`, `cargo clippy`, `cargo test`, and Rust integration tests.

Acceptance criteria:

- Rust service starts locally and connects to Postgres.
- `GET /api/v1/health` matches the existing response contract.
- Existing Next app still runs unchanged.

### Phase 2: Mirror Database Types And Query Patterns

1. Model database enums in Rust: `UserRole`, `LocationType`, `ServingType`, `ReviewStatus`, and `SubmissionStatus`.
2. Preserve Prisma table and column names exactly, including quoted PascalCase table names like `"User"`, `"BeerOffer"`, and camelCase columns.
3. Choose the future ID strategy before Rust write routes move. Recommended long-term target: database-generated UUID or application-generated UUID/ULID with database defaults where possible.
4. During the coexistence phase, make Rust writes compatible with current `TEXT` primary keys. Do not rely on database defaults unless a schema migration adds them.
5. Plan a separate ID migration after the backend is stable. Do not mix ID strategy changes with the first route migrations.
6. Port small read models first, not the full `src/lib/query.ts` at once.
7. Keep SQL close to each route module or in a small repository module. Do not create a large generic ORM abstraction.

Acceptance criteria:

- Rust can read from the existing database without Prisma.
- Rust can generate IDs for write paths that coexist safely with existing data.
- Enum serialization matches the existing JSON strings.

### Phase 3: Move Low-Risk Public Read Routes

Move routes that do not set cookies and do not require auth first.

Recommended order:

1. `GET /api/v1/health`
2. `GET /api/v1/beer-styles`
3. `GET /api/v1/beer-brands`
4. `GET /api/v1/beer-variants`
5. `GET /api/v1/locations/:id`
6. `GET /api/v1/beers`

For each route:

1. Add or confirm contract tests against the Next implementation.
2. Implement the route in Rust.
3. Run contract tests against Rust.
4. Compare status codes and response JSON exactly, including nullability and sorting.
5. Route only that method/path to Rust in the routing layer.
6. Monitor logs, latency, database load, and error rates.
7. Leave the Next route in place until the migration is stable.

Special care for `GET /api/v1/beers`:

- It has pagination, multi-value filters, sorting, denormalized offer output, and performance-specific query logic.
- Port it only after simpler lookup reads are stable.
- Keep query plan comparison from the current performance scripts or add equivalent `EXPLAIN` checks.

### Phase 4: Implement Shared Rust Auth Middleware

Before moving protected routes, Rust must understand the current session system.

1. Read `kbi_session` from cookies.
2. Hash the raw token with SHA-256 and look up `Session.tokenHash`.
3. Reject missing or expired sessions with the same 401 envelope.
4. Load user fields `{ id, email, displayName, role }`.
5. Add moderator and admin guards matching current role rules.
6. Preserve `ACCOUNT_BANNED` behavior where login/profile flows check it.
7. Add contract tests for unauthenticated, user, moderator, and admin access.

Acceptance criteria:

- Rust can authorize requests using sessions created by Next.
- Next can authorize requests using sessions created by Rust once login moves.
- Cookie name, expiry, path, `httpOnly`, `sameSite`, and `secure` behavior are compatible.

### Phase 5: Move Auth Read And Session Routes

Recommended order:

1. `GET /api/v1/auth/me`
2. `GET /api/v1/auth/session`
3. `GET /api/v1/auth/profile`

These prove cookie parsing and session lookup before Rust creates or destroys sessions.

Then move:

1. `POST /api/v1/auth/logout`
2. `POST /api/v1/auth/login`

Special care for login:

- Preserve `scrypt$<salt>$<hex>` password verification exactly.
- Preserve login error distinctions: `INVALID_CREDENTIALS`, `EMAIL_NOT_VERIFIED`, and `ACCOUNT_BANNED`.
- Create `Session` rows with hashed random tokens and compatible expiry.
- Set the same cookie attributes.

Move registration, email verification, email change, forgot password, and reset password later because they also involve email delivery and token lifecycle behavior.

### Phase 6: Move Auth Write And Email Routes

Recommended order:

1. `POST /api/v1/auth/register`
2. `GET /api/v1/auth/verify-email`
3. `POST /api/v1/auth/verify-email`
4. `POST /api/v1/auth/resend-verification`
5. `PATCH /api/v1/auth/profile`
6. `POST /api/v1/auth/change-email`
7. `POST /api/v1/auth/forgot-password`
8. `POST /api/v1/auth/reset-password`

Work needed:

- Add a Rust mailer abstraction that matches current SMTP behavior and local fallback behavior. Rust should own email delivery once auth routes move.
- Preserve token hashing with SHA-256.
- Preserve token expiry windows.
- Preserve non-enumerating password reset behavior.
- Keep all current email URLs compatible with the frontend routes.

### Phase 7: Move Contribution And Review Routes

Recommended order:

1. `POST /api/v1/locations`
2. `POST /api/v1/beer-brands`
3. `POST /api/v1/beer-variants`
4. `POST /api/v1/beers`
5. `GET /api/v1/reviews`
6. `POST /api/v1/reviews`
7. `PATCH /api/v1/reviews/:id`
8. `DELETE /api/v1/reviews/:id`
9. `POST /api/v1/reports`

Special care:

- Contribution writes use `pending` status for normal users and must preserve permission checks for pending records created by the same user.
- `POST /api/v1/beers` has branching behavior: create offer submission, create price update proposal, reject existing pending offer, or reject same active price.
- Unique constraint and foreign key errors currently map to specific API errors. Match them explicitly in Rust by inspecting Postgres SQLSTATE values.
- Pending queue cache invalidation currently exists in-process in Next. Once writes move to Rust, replace this with either no cache, a shared cache, database-backed counts, or an invalidation signal.

### Phase 8: Move Moderation Routes

Recommended order:

1. `GET /api/v1/moderation/submissions`
2. `GET /api/v1/moderation/reports`
3. `GET /api/v1/moderation/audit-log`
4. `PATCH /api/v1/moderation/reports/:id`
5. Brand moderation route.
6. Variant moderation route.
7. Location moderation route.
8. Offer moderation route.
9. Price update moderation route.
10. Review moderation route.

Special care:

- Every moderation decision should preserve audit log behavior.
- `PATCH`, `PUT`, and `DELETE` may have different semantics on the same resource. Migrate method-by-method if needed.
- Verify that approving/rejecting related pending entities preserves existing cascading behavior and conflict handling.

### Phase 9: Move Admin Routes

Recommended order:

1. `GET /api/v1/admin/users`
2. User role, verify, ban, unban, resend verification, and delete routes.
3. Admin style create/update/delete routes.
4. Admin brand create/update/delete routes.
5. Admin variant create/update/delete routes.
6. Admin location create/update routes.
7. Admin offer create/update routes.

Special care:

- Admin pages currently often receive initial data from server-rendered Next pages, not only client-side API calls. Moving admin API routes does not automatically remove direct Next database reads.
- Admin writes also log moderation actions. Keep audit details compatible.

### Phase 10: Move Metrics And Operational Routes

1. Replace `GET /api/v1/metrics` with Rust metrics once most traffic is served by Rust.
2. Decide whether Next metrics still need to be scraped during the parallel phase.
3. Remove or replace `POST /api/v1/test/auth-links` before production cutover if it is only test support.

## API Contract And Type Generation

The backend and frontend should share API types through an explicit OpenAPI contract. The recommended direction is backend-first contract generation:

```text
Rust route/data types
  -> generated OpenAPI JSON
  -> generated TypeScript types and optional API client
  -> React app imports generated types/client
```

Already in place: `utoipa` annotations in the Rust API, Swagger UI at `/api-docs`, and `npm run api:spec`, which prints the spec to stdout. Not yet done: committing the spec, generating TypeScript types, and the CI staleness check.

Recommended tools for the remaining parts:

- TypeScript type generation: `openapi-typescript` if we only want types.
- TypeScript client generation: `orval` if we want generated fetch/TanStack Query hooks, or `openapi-fetch` if we want a small typed fetch client.
- Contract validation in CI: generate the OpenAPI spec from Rust and fail CI if the committed spec or generated frontend types are stale.

Recommended repository layout:

```text
backend/
  crates/api/...
  openapi.json            # generated or copied artifact for CI comparison
frontend/
  src/generated/api.ts    # generated from OpenAPI
openapi/
  kiebex-api.json         # committed API contract, optional canonical location
```

Recommended scripts once the new apps exist:

```json
{
  "scripts": {
    "api:spec": "cargo run -p api --bin export-openapi > openapi/kiebex-api.json",
    "api:types": "openapi-typescript openapi/kiebex-api.json -o frontend/src/generated/api.ts",
    "api:contract:check": "npm run api:spec && npm run api:types && git diff --exit-code openapi/kiebex-api.json frontend/src/generated/api.ts"
  }
}
```

How to model the existing envelope:

- Define reusable OpenAPI schemas for `ApiSuccess<T>`, `ApiError`, and validation error details.
- For each route, document the wrapped `data` payload, not only the inner domain type.
- Document cookie side effects for auth routes even though OpenAPI cannot fully type browser cookie behavior.
- Document common errors like `UNAUTHORIZED`, `FORBIDDEN`, `INVALID_JSON`, `INVALID_BODY`, and `INVALID_QUERY`.

Why OpenAPI is not enough by itself:

- OpenAPI gives shared compile-time types, but it does not prove that the server behaves like the old Next route.
- Contract tests are still needed for runtime behavior: status codes, error codes, cookie behavior, validation edge cases, ordering, pagination, and side effects.
- During migration, the OpenAPI spec should describe the intended stable API, while contract tests compare Next and Rust behavior until Next is removed.

Strictness recommendation:

- For request and response shape, be strict. The generated frontend types depend on this.
- For error codes, be strict. UI flows often branch on them.
- For validation detail wording, be compatible but not necessarily byte-for-byte identical unless the UI displays exact messages from the server.
- For field ordering in JSON objects, do not care. For ordering of arrays, be strict wherever the UI expects sorted results.
- For cookies and auth side effects, be strict.

## Frontend Migration Phases

The current UI is React, but it is embedded in Next.js App Router with server components and server-side auth/data access. A pure React frontend requires moving those server responsibilities to the Rust API.

The final target can be a static SPA served separately from the Rust API. This keeps the frontend deployment simple once Next is removed.

### Frontend Phase 1: Make The Existing Frontend API-First

1. Add API endpoints for any page data currently read directly from `src/lib/query.ts` in server components.
2. Replace direct page-level DB reads with fetches to `/api/v1/*` where practical.
3. Keep the visual UI and CSS modules unchanged.
4. Keep auth redirects behavior equivalent by exposing enough Rust API/session state to the client.

Pages with direct backend coupling include:

- Home page: current auth and beer directory data.
- Location detail page: location, offers, reviews, current user.
- Contribute page: locations, brands, variants, styles, auth state.
- Moderation pages: auth guard, pending queues, audit log.
- Admin pages: auth guard plus initial entity/user lists.
- Auth pages: redirect logic based on current session.

### Frontend Phase 2: Introduce The New React App

Recommended stack:

- Vite or another lightweight bundler.
- React Router for routing.
- TanStack Query for API data loading, caching, and mutations.
- Generated TypeScript API types from the Rust OpenAPI spec.
- Existing CSS modules/global CSS can be moved gradually if desired.
- Playwright tests should remain the end-to-end safety net.

Run the new React app beside Next at first. Move one page group at a time, similar to API route migration:

1. Static/legal pages: impressum, datenschutz, agb.
2. Public directory and location pages.
3. Auth pages.
4. Contribution pages.
5. Moderation pages.
6. Admin pages.

### Frontend Phase 3: Remove Next

Only remove Next after:

- All `/api/v1/*` routes are served by Rust.
- No React page relies on Next server components, `next/headers`, `redirect`, or direct imports from `src/lib/query.ts`, `src/lib/auth.ts`, or `src/lib/page-auth.ts`.
- The React app handles routing, auth state, and error states without Next.
- E2E tests pass against the React + Rust deployment.

## Prisma Migration Plan

Do not replace Prisma schema management on day one. Split the migration into runtime and schema ownership.

Runtime migration:

1. Rust uses `sqlx` for route implementations.
2. Prisma remains available for unmigrated Next routes.
3. Both systems share the same Postgres database.
4. Rust writes preserve existing table names, column names, enum strings, constraints, and currently valid ID format during coexistence.
5. ID format changes happen later as explicit schema/data migrations, not as a side effect of moving individual API routes.

Schema ownership migration:

1. Freeze Prisma schema changes while Rust schema definitions are created.
2. Convert existing Prisma migrations into `sqlx` migrations or mark a baseline migration after a clean schema dump.
3. Add a policy that new database changes are authored as SQL migrations.
4. Regenerate any Rust compile-time query metadata in CI.
5. Remove Prisma and generated client only after no Next code path imports `src/lib/db.ts` or `src/generated/prisma`.

## Per-Route Migration Checklist

Use this checklist for every route/method.

1. Identify auth requirement: none, user, moderator, or admin.
2. Identify all query params, path params, request body fields, and validation rules.
3. Identify all success response shapes and status codes.
4. Identify all expected error codes and status codes.
5. Identify database reads/writes and transaction boundaries.
6. Identify side effects: cookies, email, audit log, cache invalidation, metrics, or logs.
7. Add or update contract tests against the current Next route.
8. Implement in Rust with matching envelope and validation behavior.
9. Run Rust unit/integration tests.
10. Run shared contract tests against Rust.
11. Route the method/path to Rust.
12. Monitor and keep rollback simple by switching the route back to Next.
13. After a stabilization period, mark the Next handler as legacy or remove it when no longer needed.

## Testing Strategy

Keep the existing tests while adding Rust-specific coverage.

- Unit tests: Rust domain logic, validation, auth hashing, ID generation, and error mapping.
- Integration tests: Rust route tests against a real Postgres database.
- Contract tests: HTTP tests that run against both Next and Rust for route parity.
- E2E tests: existing Playwright flows should continue to run against the public URL, regardless of which backend serves each route.
- Performance tests: preserve or replace current directory query SQL capture and explain tooling before moving `GET /api/v1/beers`.

Minimum checks before moving a route:

- Existing Next tests pass.
- Rust tests pass.
- Shared route contract passes against both implementations.
- Manual smoke test of the related UI flow passes.

## Deployment And Rollback

For each migrated route:

- Deploy Rust with the route implemented but not receiving production traffic.
- Enable routing for the exact method/path.
- Represent the route switch in both `manifests/production/ingress.yml` and `manifests/review-app/ingress.yml`.
- Monitor request count, status codes, latency, database errors, and logs.
- Roll back by routing the method/path back to Next. This should not require a database rollback if the route preserved schema and write semantics.
- Avoid deploying database schema changes and route cutovers in the same step unless unavoidable.

## Known Risks

- Validation parity can drift because Zod and Rust validation libraries report errors differently. The error envelope and detail shape must be tested.
- Prisma-generated IDs must be matched during coexistence or consciously replaced through an explicit schema/data migration.
- In-process Next caches, such as pending queue count cache, will not be invalidated automatically by Rust writes.
- Auth is shared by cookie and database session rows. Any mismatch in token hashing, expiry, or cookie attributes can log users out or create split-brain behavior.
- Next server components currently do direct database reads. Backend route migration alone will not remove Next from the runtime.
- SQLx with quoted Prisma table/column names is explicit but verbose. This is acceptable during migration and can be cleaned up after schema ownership moves to SQL.
- Metrics will be split while both services serve traffic. Dashboards should account for both services until cutover.
- Traefik route precedence mistakes could accidentally send unmigrated methods to Rust. Review-app ingress changes should be tested before production.

## Remaining Open Questions

1. Which long-term ID strategy should replace `cuid()` once Rust owns writes: UUID, UUIDv7, ULID, or another format?
2. Should the generated frontend client be types-only with the existing handwritten fetch wrapper, or should we generate a typed client/TanStack Query hooks from OpenAPI?
3. Should the OpenAPI spec be served publicly in production, restricted to internal environments, or generated only in CI? Today `/api-docs` is only reachable inside the cluster, because the ingress does not route it.
