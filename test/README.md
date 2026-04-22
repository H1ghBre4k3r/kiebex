# Test Helpers

Shared test support lives in `test/` so unit, integration, and e2e suites can build data consistently.

## Entry Point

Import shared helpers from `test/index.ts` when you need reusable builders or DB cleanup utilities.

## Factories

- `createTestNamespace(scope)` creates a unique prefix for ids, names, and emails.
- `buildCatalogFixture(namespace, label, overrides)` creates a linked style -> brand -> variant -> location -> offer fixture in memory.
- Use the lower-level `buildUser`, `buildLocation`, `buildBeerStyle`, `buildBeerBrand`, `buildBeerVariant`, and `buildBeerOffer` builders when a test needs custom relationships.

## Database Reset

- `createTestDatabasePool()` creates a raw Postgres pool for database-backed test setup and cleanup.
- `cleanupTestData(pool, options)` removes namespaced rows deterministically across auth, moderation, catalog, and report tables.
- Prefer prefix-based cleanup (`idPrefixes`, `namePrefixes`) for integration runs and explicit ids/emails for long-lived e2e fixtures.

## Integration Helpers

- `integration-tests/helpers.ts` adds `seedCatalogFixture(...)` for persisting linked catalog fixtures with one call.
- `integration-tests/helpers.ts` adds `seedCatalogOfferFixture(...)` when a test needs the linked fixture plus a guaranteed persisted offer.
- Use `seedCatalogFixture(..., { offer: false })` when a test needs style/brand/variant/location without an initial offer row.
