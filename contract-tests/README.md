# API Contract Tests

These tests verify the public `/api/v1/*` HTTP contract during the Rust backend migration.

They intentionally exercise real HTTP servers instead of importing route handlers. This keeps the tests independent of whether a route is served by Next.js or Rust.

## Commands

Run the contract suite against one implementation:

```sh
npm run test:contract # defaults to http://localhost:3000
API_BASE_URL=http://localhost:3000 npm run test:contract
API_BASE_URL=http://localhost:4000 npm run test:contract
```

Compare Next.js and Rust responses for parity:

```sh
NEXT_API_BASE_URL=http://localhost:3000 \
RUST_API_BASE_URL=http://localhost:4000 \
npm run test:contract:parity
```

## Adding A Route

1. Add a contract file in `contract-tests/contracts/`.
2. Export it from `contract-tests/contracts/index.ts`.
3. Assert status codes, response envelopes, important headers, error codes, cookies, sorting, and nullability.
4. Normalize dynamic values such as timestamps, request IDs, and cookie expiry dates before parity comparison.
5. Run the contract against Next.js first, then Rust, then parity mode.

## Current Contracts

The contract suite covers the full route inventory. See `contract-tests/contracts/inventory.ts` for the authoritative list and `contract-tests/contracts/index.ts` for the aggregated suite.

- Route inventory: `contract-tests/contracts/inventory.ts`
- Contract exports: `contract-tests/contracts/index.ts`
- Health endpoint shape contract: `contract-tests/contracts/health.ts`
