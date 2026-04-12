# Kiel Beer Index (Kiebex)

Kiel Beer Index is a comprehensive full-stack application for tracking and comparing beer prices across various locations (pubs, bars, restaurants, and supermarkets) in Kiel, Germany. It features a crowdsourced contribution model with a multi-tiered moderation system to ensure data quality.

## Core Features

- **Beer Directory**: Browse and filter approved beer offers by brand, variant, style, size, serving type, and location.
- **Location Insights**: View detailed information for venues, including their beer menu and historical price trends.
- **Crowdsourced Contributions**: Registered users can submit new locations, beer brands, variants, and price offers.
- **Price History Tracking**: Automatic tracking of price changes over time with a proposal system for updates.
- **Advanced Moderation**: A dedicated moderation queue for staff to review, approve, or reject community contributions.
- **Moderation Audit Log**: Detailed logs of all moderation actions for accountability.
- **User Authentication**: Secure session-based authentication with email verification and role-based access control (User, Moderator, Admin).
- **Venue Reviews**: User-submitted ratings and reviews for locations, subject to moderation.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Standalone mode)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict mode)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
- **Validation**: [Zod](https://zod.dev/) for schema validation and type safety
- **Authentication**: Custom session management with scrypt-based password hashing
- **Email**: [Nodemailer](https://nodemailer.com/) for verification and notification emails
- **Styling**: Vanilla CSS Modules with global CSS variables
- **Testing**: [Jest](https://jestjs.io/) (Unit/API), [Playwright](https://playwright.dev/) (E2E), and custom DB integration tests

## Data Model

The application uses a structured domain model to maintain data integrity:
- **Location**: Venues in Kiel (Pubs, Bars, Supermarkets, etc.).
- **BeerBrand**: Beer producers (e.g., Flensburger, Lille).
- **BeerStyle**: Types of beer (e.g., Pils, Helles, IPA).
- **BeerVariant**: Specific products (e.g., Flensburger Pilsener 0.33l).
- **BeerOffer**: A specific price for a variant at a specific location.
- **PriceUpdateProposal**: User-submitted price updates for existing offers.
- **ModerationAuditLog**: Records of approvals/rejections by moderators.

## Project Structure

```text
├── src/
│   ├── app/                # Next.js App Router (Pages & API)
│   │   ├── (auth)/         # Login, Registration, Verification
│   │   ├── admin/          # Admin management interfaces
│   │   ├── api/v1/         # RESTful API endpoints
│   │   ├── contribute/     # User submission forms
│   │   ├── moderation/     # Moderation queue and audit logs
│   │   └── locations/      # Venue details and price history
│   ├── components/         # Reusable React components
│   ├── lib/                # Core logic (auth, db, email, query, validation)
│   └── generated/          # Prisma generated client
├── prisma/                 # Database schema and migrations
├── manifests/              # Kubernetes deployment configurations
├── e2e/                    # Playwright end-to-end tests
└── __tests__/              # Jest unit and API tests
```

## Getting Started

### Prerequisites
- Node.js (v20 or later)
- PostgreSQL database
- SMTP server (for email verification)

### Setup
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables:
   ```bash
   cp .env.example .env
   # Update DATABASE_URL and SMTP settings in .env
   ```
3. Initialize the database:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

### Development
Run the development server:
```bash
npm run dev
```

## Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production (Standalone output)
- `npm run lint`: Run ESLint
- `npm run typecheck`: Run TypeScript compiler check
- `npm run format`: Format code with Prettier
- `npm run test`: Run unit and API tests (Jest)
- `npm run test:integration`: Run DB-backed integration tests
- `npm run test:e2e`: Run Playwright smoke tests
- `npm run db:migrate`: Apply Prisma migrations (dev)
- `npm run db:seed`: Seed the database with initial data

## Testing Strategy

- **Unit & API Tests**: Use Jest and SWC to test utility functions and API route handlers in isolation.
- **Integration Tests**: Verify database queries and complex business logic against a real PostgreSQL instance.
- **E2E Tests**: Use Playwright to perform smoke tests on critical user journeys (login, search, contribute) against the production build.

## Deployment

### Containerization
The project is optimized for containerized environments using Next.js **standalone** output. A multi-stage `Dockerfile` is provided for building small, secure images.

### Kubernetes
Deployment manifests are located in `manifests/`, supporting:
- **ArgoCD** sync-wave orchestration.
- **Init Containers** for automatic database migrations.
- **Sealed Secrets** for secure credential management.
- **Ingress** and **Service** configurations for high availability.

## Moderation Workflow

1. **Submission**: Users submit new data (Status: `pending`).
2. **Review**: Moderators view pending items in `/moderation`.
3. **Audit**: Every action (Approve/Reject) is logged in the `ModerationAuditLog`.
4. **Publication**: Only `approved` items are visible in the public directory and search results.
