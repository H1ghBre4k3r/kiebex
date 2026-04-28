# Rust Backend

This workspace contains the Rust API service that will gradually replace the existing Next.js API routes while keeping `/api/v1/*` stable.

## Commands

Run from `backend/` unless noted otherwise:

```sh
cargo fmt
cargo clippy --workspace --all-targets --all-features
cargo test --workspace --all-features
cargo run -p api
cargo run -p api --bin export-openapi
```

The API service reads `DATABASE_URL` from the environment and defaults to `127.0.0.1:4000`.

Repo-level npm wrappers are also available:

```sh
npm run api:dev
npm run api:fmt
npm run api:check
npm run api:clippy
npm run api:test
npm run api:spec
```

## Current Surface

- `GET /api/v1/health` checks Postgres with `SELECT 1` and returns the existing `{ status, data }` response envelope.
- `GET /api/v1/metrics` exposes Prometheus metrics for the Rust service.
- `/api-docs` serves Swagger UI, and `export-openapi` prints the OpenAPI document for CI or type generation.

## Environment

- `DATABASE_URL`: required Postgres connection string shared with the current app during migration.
- `RUST_API_BIND_ADDR`: optional bind address, default `127.0.0.1:4000`.
- `RUST_API_DATABASE_MAX_CONNECTIONS`: optional SQLx pool size, default `10`.

## Dependency Choices

- HTTP/runtime: `axum`, `tokio`, `tower`, `tower-http`, `axum-extra`.
- Database: `sqlx` with Postgres, rustls, migrations, `chrono`, `uuid`, and JSON support.
- Contracts/serialization: `serde`, `serde_json`, `utoipa`, `utoipa-swagger-ui`.
- Validation/errors: `garde`, `thiserror`.
- Auth-ready primitives: `scrypt`, `sha2`, `hex`, `rand`, `uuid`, `ulid`.
- Observability: `tracing`, `tracing-subscriber`, `metrics`, `metrics-exporter-prometheus`.
- Email-ready primitives: `lettre` with async SMTP over rustls.
