# Kiel Beer Index (Kiebex)

Kiel Beer Index is a full-stack application for tracking and comparing beer prices across locations (pubs, bars, restaurants, and supermarkets) in Kiel, Germany. Data is crowdsourced and goes through a moderation workflow before it is published.

## Core Features

- **Beer Directory**: Browse and filter approved beer offers by brand, variant, style, size, serving type, and location.
- **Location Insights**: View venue details, including the beer menu and historical price trends.
- **Crowdsourced Contributions**: Registered users can submit new locations, beer brands, variants, and price offers.
- **Price History Tracking**: Price changes are recorded over time, with a proposal system for updates.
- **Venue Reviews**: User-submitted ratings and reviews for locations, subject to moderation.
- **Content Reports**: Users can report reviews as offensive, spam, or inappropriate; moderators resolve the reports.
- **Moderation**: A queue for staff to approve or reject contributions, with an audit log of every action.
- **Administration**: Admin interfaces for users, locations, brands, styles, variants, and offers.
- **User Authentication**: Session-based authentication with email verification, password reset, and role-based access control (User, Moderator, Admin).

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, standalone output) with React 19
- **Language**: [TypeScript](https://www.typescriptlang.org/) (strict mode)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
- **API backend (in migration)**: [Rust](https://www.rust-lang.org/) with [axum](https://github.com/tokio-rs/axum) and [sqlx](https://github.com/launchbadge/sqlx), see [Rust API Migration](#rust-api-migration)
- **Validation**: [Zod](https://zod.dev/)
- **Authentication**: Custom session management with scrypt password hashing
- **Email**: [Nodemailer](https://nodemailer.com/) for verification and password reset emails
- **Styling**: CSS Modules with global CSS variables
- **Testing**: [Jest](https://jestjs.io/) (unit/API), custom DB integration tests, HTTP contract tests, and [Playwright](https://playwright.dev/) (E2E)

## Data Model

- **User**, **Session**, **EmailVerificationToken**, **PasswordResetToken**: Accounts, roles, and authentication.
- **Location**: Venues in Kiel (pubs, bars, restaurants, supermarkets).
- **BeerBrand**: Beer producers (e.g., Flensburger, Lille).
- **BeerStyle**: Types of beer (e.g., Pils, Helles, IPA).
- **BeerVariant**: Specific products (e.g., Flensburger Pilsener).
- **BeerOffer**: A price for a variant at a location, with size and serving type.
- **PriceUpdateProposal**: User-submitted price updates for existing offers.
- **OfferPriceHistory**: Every effective price of an offer over time.
- **Review**: Ratings and reviews for locations.
- **Report**: User reports of problematic content, with a snapshot of the reported content.
- **ModerationAuditLog**: Records of moderation and admin actions.

## Rust API Migration

The `/api/v1/*` API is being moved from Next.js route handlers to a Rust service in `backend/`, one route at a time. Public URLs stay the same: Traefik sends each migrated method + path to the Rust service and everything else to Next.js.

- `ROADMAP.md`: the migration plan and current status.
- `docs/api-contract.md`: the route inventory, with the owner and migration status of every route.
- `backend/README.md`: Rust service commands, configuration, and dependencies.
- `contract-tests/README.md`: contract tests that run the same HTTP checks against Next.js and Rust.
- `FUTURE_WORK.md`: known workarounds and follow-ups.

## Project Structure

```text
├── src/
│   ├── app/                # Next.js App Router (pages and API routes)
│   │   ├── (auth)/         # Login, registration, verification, password reset
│   │   ├── admin/          # Admin management interfaces
│   │   ├── api/v1/         # REST API (Next.js implementation)
│   │   ├── contribute/     # User submission forms
│   │   ├── moderation/     # Moderation queue, reports, and audit log
│   │   └── locations/      # Venue details and price history
│   ├── components/         # Reusable React components
│   ├── lib/                # Core logic (auth, db, email, query, validation)
│   └── generated/          # Prisma generated client
├── backend/                # Rust API service
├── prisma/                 # Database schema, migrations, and seed
├── docs/                   # API contract and route inventory
├── contract-tests/         # HTTP contract tests (Next.js and Rust)
├── integration-tests/      # DB-backed integration tests
├── e2e/                    # Playwright end-to-end tests
├── __tests__/              # Jest unit and API tests
├── test/mocks/             # Jest mocks for server-only modules
├── scripts/                # Dev, CI, and performance helper scripts
└── manifests/              # Kubernetes manifests (production and review apps)
```

## Getting Started

### Prerequisites

- Node.js 22
- PostgreSQL
- Rust 1.95 (only needed to work on `backend/`)
- SMTP server (optional: without `SMTP_HOST`, emails are logged to stdout)

### Setup

1. Install dependencies (this also generates the Prisma client):
   ```bash
   npm install
   ```
2. Configure environment variables:
   ```bash
   cp .env.example .env
   # Set DATABASE_URL, and SMTP settings if you want real emails
   ```
3. Initialize the database:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

### Development

Run the Next.js development server on port 3000:

```bash
npm run dev
```

To work with migrated routes, also start the Rust API on port 4000 and the local route switch on port 3100. The route switch sends migrated routes to Rust and everything else to Next.js:

```bash
npm run api:dev
npm run route-switch:dev
```

## Available Scripts

| Script                                                      | Description                                    |
| ----------------------------------------------------------- | ---------------------------------------------- |
| `npm run dev`                                               | Start the Next.js development server           |
| `npm run build`                                             | Build for production (standalone output)       |
| `npm run start`                                             | Start the standalone production server         |
| `npm run lint`                                              | Run ESLint                                     |
| `npm run typecheck`                                         | Run the TypeScript compiler check              |
| `npm run format` / `format:check`                           | Format or check code with Prettier             |
| `npm run test`                                              | Run unit and API tests (Jest)                  |
| `npm run test:integration`                                  | Run DB-backed integration tests                |
| `npm run test:contract`                                     | Run HTTP contract tests against `API_BASE_URL` |
| `npm run test:contract:parity`                              | Compare Next.js and Rust responses             |
| `npm run test:e2e`                                          | Build the app and run Playwright E2E tests     |
| `npm run db:migrate`                                        | Create and apply Prisma migrations (dev)       |
| `npm run db:deploy`                                         | Apply Prisma migrations (CI and production)    |
| `npm run db:seed`                                           | Seed the database                              |
| `npm run db:studio`                                         | Open Prisma Studio                             |
| `npm run route-switch:dev`                                  | Run the local route switch proxy               |
| `npm run api:dev`                                           | Run the Rust API                               |
| `npm run api:fmt` / `api:check` / `api:clippy` / `api:test` | Format, check, lint, and test the Rust API     |
| `npm run api:spec`                                          | Print the Rust API's OpenAPI spec              |

## Testing Strategy

- **Unit and API tests**: Jest and SWC test utilities and API route handlers in isolation, with the data layer mocked.
- **Integration tests**: Run database queries and business logic against a real PostgreSQL instance.
- **Contract tests**: Send real HTTP requests to check the public `/api/v1/*` contract, so the same tests cover the Next.js and Rust implementations.
- **E2E tests**: Playwright runs against the production build and covers auth, password recovery, the directory, contributions with moderation, and admin flows.
- **Rust tests**: `cargo test`, plus format and clippy checks.

CI runs lint, typecheck, and unit tests; integration, contract, and E2E tests against a PostgreSQL service; and the Rust checks. All three must pass before images are built.

## Deployment

### Containers

A multi-stage `Dockerfile` builds three images: the Next.js app (standalone output), a migration image that applies Prisma migrations, and the Rust API.

### Kubernetes

Manifests in `manifests/` are deployed with ArgoCD using GitOps:

- **Production**: on every push to `main`, CI builds the images and writes manifests pinned to the commit SHA to the `deploy` branch, which ArgoCD syncs.
- **Review apps**: every pull request gets its own namespace and seeded database at `pr-<number>.review.kiel.beer`.
- **Migrations** run before the app starts, ordered with ArgoCD sync waves.
- **Sealed Secrets** hold credentials.
- **Traefik IngressRoutes** split `/api/v1/*` traffic between the Rust API and Next.js.
- **ServiceMonitors** expose app metrics to Prometheus.

## Moderation Workflow

1. **Submission**: Users submit new data (status `pending`).
2. **Review**: Moderators review pending items and open reports in `/moderation`.
3. **Audit**: Every approval, rejection, and report resolution is recorded in `ModerationAuditLog`.
4. **Publication**: Only `approved` items appear in the public directory.
