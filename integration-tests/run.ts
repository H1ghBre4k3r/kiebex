import "dotenv/config";
import { db } from "@/lib/db";
import {
  createBeerOffer,
  createLocation,
  createOfferOrPriceUpdateProposal,
  getBeerOffers,
  getLocationById,
} from "@/lib/query";

const TEST_PREFIX = "itest-";

function uniqueId(suffix: string): string {
  return `${TEST_PREFIX}${suffix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function testGetLocationByIdApproval(): Promise<void> {
  const approvedLocationId = uniqueId("location-approved");
  const pendingLocationId = uniqueId("location-pending");

  await db.location.create({
    data: {
      id: approvedLocationId,
      name: uniqueId("Approved Place"),
      locationType: "pub",
      district: "Mitte",
      address: "Integration Street 1",
      status: "approved",
    },
  });

  await db.location.create({
    data: {
      id: pendingLocationId,
      name: uniqueId("Pending Place"),
      locationType: "bar",
      district: "Mitte",
      address: "Integration Street 2",
      status: "pending",
    },
  });

  const approved = await getLocationById(approvedLocationId);
  const pending = await getLocationById(pendingLocationId);

  assert(approved?.id === approvedLocationId, "Expected approved location to be returned.");
  assert(pending === undefined, "Expected pending location to be hidden.");
}

async function testGetBeerOffersFiltersApprovedOnly(): Promise<void> {
  const styleId = uniqueId("style");
  const brandId = uniqueId("brand");
  const variantId = uniqueId("variant");
  const locationId = uniqueId("location");
  const approvedOfferId = uniqueId("offer-approved");
  const pendingOfferId = uniqueId("offer-pending");

  await db.beerStyle.create({
    data: {
      id: styleId,
      name: uniqueId("Style"),
    },
  });
  await db.beerBrand.create({
    data: {
      id: brandId,
      name: uniqueId("Brand"),
      status: "approved",
    },
  });
  await db.beerVariant.create({
    data: {
      id: variantId,
      name: uniqueId("Variant"),
      brandId,
      styleId,
      status: "approved",
    },
  });
  await db.location.create({
    data: {
      id: locationId,
      name: uniqueId("Offers Place"),
      locationType: "pub",
      district: "Mitte",
      address: "Offers Street 1",
      status: "approved",
    },
  });

  await db.beerOffer.create({
    data: {
      id: approvedOfferId,
      brand: "Approved Brand",
      variant: "Approved Variant",
      variantId,
      sizeMl: 500,
      serving: "tap",
      priceCents: 333,
      locationId,
      status: "approved",
    },
  });
  await db.beerOffer.create({
    data: {
      id: pendingOfferId,
      brand: "Pending Brand",
      variant: "Pending Variant",
      variantId,
      sizeMl: 500,
      serving: "bottle",
      priceCents: 999,
      locationId,
      status: "pending",
    },
  });

  const offers = await getBeerOffers();

  assert(
    offers.some((offer) => offer.id === approvedOfferId),
    "Expected approved offer to be returned.",
  );
  assert(
    !offers.some((offer) => offer.id === pendingOfferId),
    "Expected pending offer to be filtered out.",
  );
}

async function testCreateOfferOrPriceUpdateProposalFlow(): Promise<void> {
  const styleId = uniqueId("style-flow");
  const brandId = uniqueId("brand-flow");
  const variantId = uniqueId("variant-flow");

  await db.beerStyle.create({ data: { id: styleId, name: uniqueId("Flow Style") } });
  await db.beerBrand.create({
    data: {
      id: brandId,
      name: uniqueId("Flow Brand"),
      status: "approved",
    },
  });
  await db.beerVariant.create({
    data: {
      id: variantId,
      name: uniqueId("Flow Variant"),
      brandId,
      styleId,
      status: "approved",
    },
  });

  const location = await createLocation({
    name: uniqueId("Flow Place"),
    locationType: "pub",
    district: "Mitte",
    address: "Flow Street 1",
    status: "approved",
  });

  const first = await createOfferOrPriceUpdateProposal({
    variantId,
    sizeMl: 400,
    serving: "bottle",
    priceCents: 450,
    locationId: location.id,
    status: "pending",
  });

  assert(first.outcome === "offer", "Expected first submit to create pending offer.");
  if (first.outcome !== "offer") {
    return;
  }

  await db.beerOffer.update({
    where: { id: first.offer.id },
    data: { status: "approved" },
  });

  const second = await createOfferOrPriceUpdateProposal({
    variantId,
    sizeMl: 400,
    serving: "bottle",
    priceCents: 470,
    locationId: location.id,
    status: "pending",
  });

  assert(second.outcome === "price_update", "Expected second submit to create price update.");
  if (second.outcome !== "price_update") {
    return;
  }

  assert(second.offer.id === first.offer.id, "Expected proposal to target existing offer.");
  assert(
    second.proposal.proposedPriceEur === 4.7,
    "Expected proposal price to be converted to EUR.",
  );
}

async function testCreateBeerOfferSnapshotsVariantNames(): Promise<void> {
  const styleId = uniqueId("style-snapshot");
  const brandId = uniqueId("brand-snapshot");
  const variantId = uniqueId("variant-snapshot");

  await db.beerStyle.create({ data: { id: styleId, name: uniqueId("Snapshot Style") } });
  await db.beerBrand.create({
    data: {
      id: brandId,
      name: uniqueId("Snapshot Brand"),
      status: "approved",
    },
  });
  await db.beerVariant.create({
    data: {
      id: variantId,
      name: uniqueId("Snapshot Variant"),
      brandId,
      styleId,
      status: "approved",
    },
  });

  const location = await createLocation({
    name: uniqueId("Snapshot Place"),
    locationType: "supermarket",
    district: "West",
    address: "Snapshot 42",
    status: "approved",
  });

  const created = await createBeerOffer({
    variantId,
    sizeMl: 330,
    serving: "can",
    priceCents: 199,
    locationId: location.id,
    status: "approved",
  });

  const variant = await db.beerVariant.findUnique({
    where: { id: variantId },
    include: { brand: true },
  });

  assert(Boolean(variant?.name), "Expected variant to exist.");
  assert(Boolean(variant?.brand.name), "Expected brand to exist.");
  assert(created.variant === variant?.name, "Expected offer.variant to snapshot variant name.");
  assert(created.brand === variant?.brand.name, "Expected offer.brand to snapshot brand name.");
}

async function run(): Promise<void> {
  const checks: Array<{ name: string; fn: () => Promise<void> }> = [
    { name: "getLocationById only exposes approved", fn: testGetLocationByIdApproval },
    { name: "getBeerOffers filters approved offers", fn: testGetBeerOffersFiltersApprovedOnly },
    { name: "offer submission to price update flow", fn: testCreateOfferOrPriceUpdateProposalFlow },
    {
      name: "createBeerOffer snapshots variant names",
      fn: testCreateBeerOfferSnapshotsVariantNames,
    },
  ];

  for (const check of checks) {
    await check.fn();
    console.log(`ok - ${check.name}`);
  }
}

run()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (error) => {
    console.error("Integration checks failed:", error);
    await db.$disconnect();
    process.exit(1);
  });
