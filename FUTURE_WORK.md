# Future Work

Known workarounds, temporary shims, and follow-ups to revisit later. Migration progress lives in `ROADMAP.md`, not here.

## Rust Backend Migration

### Next handlers stay in place after cutover

- Routes switched to Rust (`GET /api/v1/health`, `GET /api/v1/beer-styles`) keep their Next.js handlers as the rollback path. Rollback is a routing change only.
- Remove a Next handler only after the Rust route has been stable in production for a while, and update `docs/api-contract.md` when you do.

### HTTP metrics come from two services

- Next and Rust both export `kiebex_http_requests_total` and `kiebex_http_request_duration_seconds` with the same labels, and each has its own `ServiceMonitor`. Dashboard queries must not filter by job or service, or they miss one side.
- Keep the metric names and labels identical in both apps until Next is removed (see ROADMAP Phase 10).

### Production `kiebex-api` image tag

- `manifests/production/api-deployment.yml` uses `:latest` in `main`. `deploy.yml` rewrites it to the commit SHA on the `deploy` branch. Keep that `sed` line in sync if the manifest's image line changes.

## Integration Test Harness

### `integration-tests/register-server-only.mjs`

Why it exists:

- The DB-backed integration suite imports `src/lib/auth.ts`, which imports `server-only` and `next/headers`. Neither works under plain Node + `tsx`.
- The shim patches Node's module loader for `npm run test:integration` only. It replaces `server-only` with a no-op and `next/headers` with a minimal in-memory `cookies()`.

Cleanup options:

- Split Next-runtime-bound auth code from pure auth/query logic so tests can import the pure module directly.
- Replace the `Module._load` patch with an explicit test bootstrap.
- This becomes moot for routes that move to Rust, since their behavior is covered by contract tests instead.

### Moving integration tests to Jest

Only worth it once the auth/runtime boundary above is clean. If Jest still needs heavy shims and `--runInBand` everywhere, the gain is too small for the churn.

If we do it:

1. Extract runtime-agnostic auth/query code from `src/lib/auth.ts`.
2. Add a separate Jest project for DB-backed tests (serial, `--runInBand`), with its own command during the transition.
3. Move shims into a normal Jest setup file.
4. Migrate a small slice first and keep `integration-tests/run.ts` as the fallback.
5. Delete the custom runner and shim only after CI uses the Jest command.

Trade-off: one runner and consistent tooling, versus mixing fast mocked tests with slow real-DB tests and the risk of ending up with two harnesses plus glue.

## Performance and Scalability

Public-directory navigation and filtering feel slow on the Raspberry Pi 4 + k3s production cluster. The main cost is request-time work in the app and query layer; the hardware amplifies it.

Known hotspots:

- The homepage re-fetches offers, counts, filter metadata, review summaries, and auth state on every filter/navigation change.
- The filter panel renders many `Link`s that likely cause avoidable prefetch work.
- Both the root layout/header and the homepage do auth/session work.
- The moderator/admin header runs several queue-count queries on every render.
- The homepage repeats brand/variant option payloads into every `UserOfferActions` instance.
- Postgres runs as a single in-cluster pod on one PVC, so slow storage magnifies query costs.

Tooling: `npm run perf:capture-directory-sql` and `npm run perf:explain-directory`. Keep these (or equivalent `EXPLAIN` checks) working before `GET /api/v1/beers` moves to Rust.

### Shared cache across replicas

- Homepage filter metadata and moderator/admin pending counts use Next.js in-process caches (`src/lib/public-directory-cache.ts`, `src/lib/pending-queue-cache.ts`). Each replica warms and invalidates its own copy.
- Public metadata tolerates short staleness; queue badges drifting between replicas is more noticeable.
- Revisit if cross-replica staleness becomes visible or hit rates stay low. Prefer Next.js shared cache handlers over ad-hoc Redis wrappers, and move those two helpers first.
- Rust writes will not invalidate these caches (see ROADMAP Known Risks). Decide on a shared invalidation strategy before contribution routes move.

### `unstable_cache` → `use cache`

- Next.js 16 recommends `use cache`, which requires `cacheComponents: true` app-wide. That changes the App Router rendering model, not just the two cache helpers.
- Blockers: the root layout reads auth cookies, several pages use `searchParams`, and there are no `loading.tsx`/`Suspense` boundaries yet. Route handler config exports also need an audit.
- `unstable_cache` is acceptable for now: usage is isolated to the two helpers above, and tag invalidation is tested.
- Migration shape: enable `cacheComponents` on a dedicated branch → audit layouts/pages that use cookies or `searchParams` → add `Suspense` boundaries → migrate the two helpers → full regression pass.
- Given the planned move to a static SPA (ROADMAP Frontend Phase 3), this may never be worth doing.
