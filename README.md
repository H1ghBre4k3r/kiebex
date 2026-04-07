# Kiel Beer Index

Kiel Beer Index is a fullstack web app for comparing beer prices across locations in Kiel, Germany.

The app supports filtering offers by:

- beer brand
- beer variant
- beer style
- size in ml
- serving type (tap, bottle, can)
- location type (pub, bar, restaurant, supermarket)
- specific location

## Stack

- Next.js App Router (frontend + backend route handlers)
- TypeScript (strict mode)
- Zod for query validation
- PostgreSQL + Prisma ORM
- CSS Modules + global CSS variables
- ESLint + Prettier

## Brutalist Design Goals

- high contrast
- hard edges and clear blocks
- expressive typography
- mobile-first readability
- strong focus styles and semantic structure for accessibility

## Current Routes

- `/` - beer offer directory with filters
- `/login` - sign-in page
- `/register` - account creation page
- `/contribute` - authenticated contribution forms for locations, brands, variants, and offers
- `/moderation` - moderator/admin queue for approving or rejecting pending submissions
- `/admin/users` - admin-only role assignment interface
- `/locations/[locationId]` - location detail page with approved offers and price history
- `/api/v1/health` - health endpoint
- `/api/v1/beers` (`GET`) - filtered beer offers
- `/api/v1/beers` (`POST`) - authenticated offer submission or price update proposal
- `/api/v1/beer-styles` (`GET`) - beer style catalog
- `/api/v1/beer-brands` (`GET`) - approved beer brands
- `/api/v1/beer-brands` (`POST`) - authenticated beer brand submission
- `/api/v1/beer-variants` (`GET`) - approved beer variants, optional `brandId` filter
- `/api/v1/beer-variants` (`POST`) - authenticated beer variant submission
- `/api/v1/locations` (`POST`) - authenticated location submission
- `/api/v1/locations/[locationId]` (`GET`) - location detail with approved offers and offer price history
- `/api/v1/auth/register` - create account and session
- `/api/v1/auth/login` - sign in and create session
- `/api/v1/auth/logout` - clear session
- `/api/v1/auth/session` - current session state (nullable user)
- `/api/v1/auth/me` - current user profile (requires auth)
- `/api/v1/moderation/submissions` - moderator list of all pending submission queues
- `/api/v1/moderation/locations/[locationId]` (`PATCH`) - moderate pending location
- `/api/v1/moderation/offers/[offerId]` (`PATCH`) - moderate pending offer
- `/api/v1/moderation/brands/[brandId]` (`PATCH`) - moderate pending beer brand
- `/api/v1/moderation/variants/[variantId]` (`PATCH`) - moderate pending beer variant
- `/api/v1/moderation/price-updates/[proposalId]` (`PATCH`) - moderate pending price update proposal
- `/api/v1/admin/users` - admin list of users
- `/api/v1/admin/users/[userId]/role` (`PATCH`) - admin role assignment

## Development

Install dependencies:

```bash
npm install
```

Set up environment variables:

```bash
cp .env.example .env
```

Update `DATABASE_URL` in `.env` to your local PostgreSQL instance.

Apply database migrations:

```bash
npm run db:migrate
```

Seed initial Kiel dataset:

```bash
npm run db:seed
```

Run locally:

```bash
npm run dev
```

Quality checks:

```bash
npm run lint
npm run typecheck
npm run build
```

Format code:

```bash
npm run format
```

## Data Model (Current)

The app now uses a PostgreSQL database via Prisma with core entities:

- `User`
- `Session`
- `Location`
- `BeerStyle`
- `BeerBrand`
- `BeerVariant`
- `BeerOffer`
- `PriceUpdateProposal`
- `OfferPriceHistory`
- `Review`

Schema and migrations live in `prisma/`, and application queries are in `src/lib/query.ts`.

## Moderation-Ready Contributions

- New user-submitted locations are created with `pending` status.
- New user-submitted beer brands and beer variants are created with `pending` status.
- New user-submitted offers are created with `pending` status when no approved matching offer exists.
- If an approved matching offer exists with a different price, the submission creates a pending `PriceUpdateProposal`.
- Public listing and detail queries only show approved locations and approved offers.
- Offer submission is allowed for approved locations and for pending locations created by the same user.
- Offer submission is allowed for approved variants and for pending variants created by the same user (with brand constraints).
- Moderators/admins can review and approve/reject pending locations, brands, variants, offers, and price updates via `/moderation`.

## Filtering and Query Conventions

- `GET /api/v1/beers` supports `brandId`, `variantId`, `styleId`, `sizeMl`, `serving`, `locationType`, and `locationId`.
- IDs are stable catalog relations and validated with Zod before query execution.
- Contribution UI uses a dependent flow: choose brand first, then choose from variants for that brand.

## User and Role Management

- New users are created with the `user` role by default.
- Admins can assign `user`, `moderator`, and `admin` roles in `/admin/users`.
- The API prevents removing the final remaining admin from admin role.
