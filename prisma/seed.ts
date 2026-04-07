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

const beerOfferSeed = [
  {
    id: "offer-001",
    brand: "Guinness",
    variant: "Stout",
    sizeMl: 568,
    serving: "tap",
    priceCents: 690,
    locationId: "pogue-mahone",
  },
  {
    id: "offer-002",
    brand: "Kilkenny",
    variant: "Red Ale",
    sizeMl: 568,
    serving: "tap",
    priceCents: 660,
    locationId: "pogue-mahone",
  },
  {
    id: "offer-003",
    brand: "Becks",
    variant: "Pils",
    sizeMl: 500,
    serving: "bottle",
    priceCents: 420,
    locationId: "hafenkante-bar",
  },
  {
    id: "offer-004",
    brand: "Astra",
    variant: "Pils",
    sizeMl: 330,
    serving: "can",
    priceCents: 270,
    locationId: "hafenkante-bar",
  },
  {
    id: "offer-005",
    brand: "Flensburger",
    variant: "Pils",
    sizeMl: 400,
    serving: "tap",
    priceCents: 520,
    locationId: "foerde-brauhaus",
  },
  {
    id: "offer-006",
    brand: "Erdinger",
    variant: "Hefeweizen",
    sizeMl: 500,
    serving: "bottle",
    priceCents: 540,
    locationId: "foerde-brauhaus",
  },
  {
    id: "offer-007",
    brand: "Holsten",
    variant: "Pils",
    sizeMl: 500,
    serving: "can",
    priceCents: 139,
    locationId: "marktfrisch-kiel",
  },
  {
    id: "offer-008",
    brand: "Guinness",
    variant: "Stout",
    sizeMl: 440,
    serving: "can",
    priceCents: 229,
    locationId: "marktfrisch-kiel",
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
    await prisma.beerOffer.deleteMany();
    await prisma.location.deleteMany();

    for (const location of locationSeed) {
      await prisma.location.create({
        data: {
          id: location.id,
          name: location.name,
          locationType: location.locationType,
          district: location.district,
          address: location.address,
        },
      });
    }

    for (const offer of beerOfferSeed) {
      await prisma.beerOffer.create({
        data: {
          id: offer.id,
          brand: offer.brand,
          variant: offer.variant,
          sizeMl: offer.sizeMl,
          serving: offer.serving,
          priceCents: offer.priceCents,
          locationId: offer.locationId,
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
