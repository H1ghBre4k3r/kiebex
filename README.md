# Kiel Beer Index

Kiel Beer Index is a fullstack web app for comparing beer prices across locations in Kiel, Germany.

## Core Features

- Browse approved beer offers across pubs, bars, restaurants, and supermarkets.
- Filter by `brandId`, `variantId`, `styleId`, `sizeMl`, `serving`, `locationType`, and `locationId`.
- Contribute new locations, beer brands, beer variants, and offers.
- Propose price updates for already-approved offers.
- Moderate pending submissions (locations, brands, variants, offers, price updates).

## Tech Stack

- Next.js App Router
- TypeScript (strict)
- Zod validation
- PostgreSQL + Prisma
- CSS Modules + global CSS variables
- ESLint + Prettier

## Quick Start

```bash
npm install
cp .env.example .env
# set DATABASE_URL in .env
npm run db:migrate
npm run db:seed
npm run dev
```

## Useful Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run format
```

## App Routes

- `/` - offer directory + filters
- `/login` - sign in
- `/register` - create account
- `/contribute` - contribution forms for locations, brands, variants, offers
- `/moderation` - moderation queue (moderator/admin)
- `/admin/users` - user role management (admin)
- `/locations/[locationId]` - location details + offer price history

## API Routes

- `GET /api/v1/health`

- `GET /api/v1/beers`
- `POST /api/v1/beers`

- `GET /api/v1/beer-styles`
- `GET /api/v1/beer-brands`
- `POST /api/v1/beer-brands`
- `GET /api/v1/beer-variants`
- `POST /api/v1/beer-variants`

- `POST /api/v1/locations`
- `GET /api/v1/locations/[locationId]`
- `POST /api/v1/reviews`
- `GET /api/v1/reviews`

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/session`
- `GET /api/v1/auth/me`

- `GET /api/v1/moderation/submissions`
- `PATCH /api/v1/moderation/locations/[locationId]`
- `PATCH /api/v1/moderation/brands/[brandId]`
- `PATCH /api/v1/moderation/variants/[variantId]`
- `PATCH /api/v1/moderation/offers/[offerId]`
- `PATCH /api/v1/moderation/price-updates/[proposalId]`

- `GET /api/v1/admin/users`
- `PATCH /api/v1/admin/users/[userId]/role`

## Data Model

Core Prisma models:

- `User`, `Session`
- `Location`
- `BeerStyle`, `BeerBrand`, `BeerVariant`
- `BeerOffer`
- `PriceUpdateProposal`, `OfferPriceHistory`
- `Review`

The seed script includes sample approved reviews so review signals are visible on the home offer cards and location pages.

Schema and migrations live in `prisma/`. Query logic lives in `src/lib/query.ts`.

## Contribution and Moderation Rules

- New user submissions are created as `pending`.
- Offer submission creates:
  - a pending `BeerOffer` if no matching approved offer exists, or
  - a pending `PriceUpdateProposal` if an approved matching offer exists with a different price.
- Public pages and public APIs only return approved location/offer data.
- Contributors can submit against approved entities and against their own pending entities where allowed.
- Moderators and admins can approve/reject all pending queues from `/moderation`.
- Authenticated users can submit reviews (1-5 rating, optional title/body) for approved locations.
