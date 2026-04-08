import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const locationSeed = [
  {
    id: "pogue-mahone",
    name: "Pogue Mahone Irish Pub",
    locationType: "pub",
    district: "Altstadt",
    address: "Bergstrasse 19, 24103 Kiel",
  },
  {
    id: "hafenkante-bar",
    name: "Hafenkante Bar",
    locationType: "bar",
    district: "Duesternbrook",
    address: "Kiellinie 99, 24105 Kiel",
  },
  {
    id: "foerde-brauhaus",
    name: "Foerde Brauhaus",
    locationType: "restaurant",
    district: "Vorstadt",
    address: "Kehdenstrasse 12, 24103 Kiel",
  },
  {
    id: "marktfrisch-kiel",
    name: "Marktfrisch Kiel",
    locationType: "supermarket",
    district: "Gaarden",
    address: "Schoenberger Strasse 4, 24148 Kiel",
  },
] as const;

const beerStyleSeed = [
  { id: "style-stout", name: "Stout" },
  { id: "style-red-ale", name: "Red Ale" },
  { id: "style-pils", name: "Pils" },
  { id: "style-hefeweizen", name: "Hefeweizen" },
] as const;

const beerBrandSeed = [
  { id: "brand-guinness", name: "Guinness" },
  { id: "brand-kilkenny", name: "Kilkenny" },
  { id: "brand-becks", name: "Becks" },
  { id: "brand-astra", name: "Astra" },
  { id: "brand-flensburger", name: "Flensburger" },
  { id: "brand-erdinger", name: "Erdinger" },
  { id: "brand-holsten", name: "Holsten" },
] as const;

const beerVariantSeed = [
  {
    id: "variant-guinness-stout",
    brandId: "brand-guinness",
    styleId: "style-stout",
    name: "Stout",
  },
  {
    id: "variant-kilkenny-red-ale",
    brandId: "brand-kilkenny",
    styleId: "style-red-ale",
    name: "Red Ale",
  },
  { id: "variant-becks-pils", brandId: "brand-becks", styleId: "style-pils", name: "Pils" },
  { id: "variant-astra-pils", brandId: "brand-astra", styleId: "style-pils", name: "Pils" },
  {
    id: "variant-flensburger-pils",
    brandId: "brand-flensburger",
    styleId: "style-pils",
    name: "Pils",
  },
  {
    id: "variant-erdinger-hefeweizen",
    brandId: "brand-erdinger",
    styleId: "style-hefeweizen",
    name: "Hefeweizen",
  },
  { id: "variant-holsten-pils", brandId: "brand-holsten", styleId: "style-pils", name: "Pils" },
] as const;

const beerOfferSeed = [
  {
    id: "offer-001",
    variantId: "variant-guinness-stout",
    sizeMl: 568,
    serving: "tap",
    priceCents: 690,
    locationId: "pogue-mahone",
  },
  {
    id: "offer-002",
    variantId: "variant-kilkenny-red-ale",
    sizeMl: 568,
    serving: "tap",
    priceCents: 660,
    locationId: "pogue-mahone",
  },
  {
    id: "offer-003",
    variantId: "variant-becks-pils",
    sizeMl: 500,
    serving: "bottle",
    priceCents: 420,
    locationId: "hafenkante-bar",
  },
  {
    id: "offer-004",
    variantId: "variant-astra-pils",
    sizeMl: 330,
    serving: "can",
    priceCents: 270,
    locationId: "hafenkante-bar",
  },
  {
    id: "offer-005",
    variantId: "variant-flensburger-pils",
    sizeMl: 400,
    serving: "tap",
    priceCents: 520,
    locationId: "foerde-brauhaus",
  },
  {
    id: "offer-006",
    variantId: "variant-erdinger-hefeweizen",
    sizeMl: 500,
    serving: "bottle",
    priceCents: 540,
    locationId: "foerde-brauhaus",
  },
  {
    id: "offer-007",
    variantId: "variant-holsten-pils",
    sizeMl: 500,
    serving: "can",
    priceCents: 139,
    locationId: "marktfrisch-kiel",
  },
  {
    id: "offer-008",
    variantId: "variant-guinness-stout",
    sizeMl: 440,
    serving: "can",
    priceCents: 229,
    locationId: "marktfrisch-kiel",
  },
] as const;

const reviewSeed = [
  {
    locationId: "pogue-mahone",
    authorEmail: "anna@example.com",
    rating: 5,
    title: "Consistently great pint",
    body: "Guinness is poured well and the service is friendly.",
  },
  {
    locationId: "pogue-mahone",
    authorEmail: "lars@example.com",
    rating: 4,
    title: "Good atmosphere",
    body: "Slightly pricey, but a solid pub with fresh tap options.",
  },
  {
    locationId: "foerde-brauhaus",
    authorEmail: "anna@example.com",
    rating: 4,
    title: "Good food pairing",
    body: "Beer menu fits the kitchen well and serving sizes are fair.",
  },
  {
    locationId: "marktfrisch-kiel",
    authorEmail: "lars@example.com",
    rating: 3,
    title: "Cheap and practical",
    body: "Great prices, but the selection rotates a lot.",
  },
] as const;

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL must be set before running the seed script.");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.review.deleteMany();
    await prisma.offerPriceHistory.deleteMany();
    await prisma.priceUpdateProposal.deleteMany();
    await prisma.beerOffer.deleteMany();
    await prisma.beerVariant.deleteMany();
    await prisma.beerBrand.deleteMany();
    await prisma.beerStyle.deleteMany();
    await prisma.location.deleteMany();

    const anna = await prisma.user.upsert({
      where: {
        email: "anna@example.com",
      },
      update: {
        displayName: "Anna",
      },
      create: {
        email: "anna@example.com",
        displayName: "Anna",
      },
    });

    const lars = await prisma.user.upsert({
      where: {
        email: "lars@example.com",
      },
      update: {
        displayName: "Lars",
      },
      create: {
        email: "lars@example.com",
        displayName: "Lars",
      },
    });

    const reviewUserIdByEmail = new Map<string, string>([
      [anna.email, anna.id],
      [lars.email, lars.id],
    ]);

    for (const location of locationSeed) {
      await prisma.location.create({
        data: {
          id: location.id,
          name: location.name,
          locationType: location.locationType,
          district: location.district,
          address: location.address,
          status: "approved",
        },
      });
    }

    for (const style of beerStyleSeed) {
      await prisma.beerStyle.create({
        data: {
          id: style.id,
          name: style.name,
        },
      });
    }

    for (const brand of beerBrandSeed) {
      await prisma.beerBrand.create({
        data: {
          id: brand.id,
          name: brand.name,
          status: "approved",
        },
      });
    }

    for (const variant of beerVariantSeed) {
      await prisma.beerVariant.create({
        data: {
          id: variant.id,
          name: variant.name,
          brandId: variant.brandId,
          styleId: variant.styleId,
          status: "approved",
        },
      });
    }

    for (const offer of beerOfferSeed) {
      const variant = beerVariantSeed.find((candidate) => candidate.id === offer.variantId);

      if (!variant) {
        throw new Error(`Missing variant '${offer.variantId}' for seed offer '${offer.id}'.`);
      }

      const brand = beerBrandSeed.find((candidate) => candidate.id === variant.brandId);

      if (!brand) {
        throw new Error(`Missing brand '${variant.brandId}' for variant '${variant.id}'.`);
      }

      await prisma.beerOffer.create({
        data: {
          id: offer.id,
          brand: brand.name,
          variant: variant.name,
          variantId: offer.variantId,
          sizeMl: offer.sizeMl,
          serving: offer.serving,
          priceCents: offer.priceCents,
          locationId: offer.locationId,
          status: "approved",
        },
      });

      await prisma.offerPriceHistory.create({
        data: {
          id: `history-${offer.id}`,
          beerOfferId: offer.id,
          priceCents: offer.priceCents,
        },
      });
    }

    for (const review of reviewSeed) {
      const userId = reviewUserIdByEmail.get(review.authorEmail);

      if (!userId) {
        throw new Error(`Missing seed user for email '${review.authorEmail}'.`);
      }

      await prisma.review.create({
        data: {
          locationId: review.locationId,
          userId,
          rating: review.rating,
          title: review.title,
          body: review.body,
          status: "approved",
        },
      });
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Failed to seed database", error);
  process.exit(1);
});
