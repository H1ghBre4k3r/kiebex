# Kiel Beer Index

Kiel Beer Index is a fullstack web app for comparing beer prices across locations in Kiel, Germany.

The app supports filtering offers by:

- brand
- beer variant
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
- `/locations/[locationId]` - location detail page with all offers
- `/api/v1/health` - health endpoint
- `/api/v1/beers` - filtered beer offers
- `/api/v1/locations/[locationId]` - location detail API

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
- `Location`
- `BeerOffer`
- `Review`

Schema and migrations live in `prisma/`, and application queries are in `src/lib/query.ts`.
