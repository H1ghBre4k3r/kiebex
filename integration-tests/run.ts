import "dotenv/config";
import { db } from "@/lib/db";
import {
  createBeerOffer,
  createLocation,
  createOfferOrPriceUpdateProposal,
  getDistinctApprovedOfferSizes,
  getBeerOffers,
  getLocationById,
  getOfferPriceHistoryBatch,
  logModerationAction,
} from "@/lib/query";
import {
  buildBeerBrand,
  buildBeerOffer,
  buildBeerStyle,
  buildBeerVariant,
  buildLocation,
  buildUser,
} from "../test/factories";
import { assert, runIntegrationTest } from "./helpers";

async function testGetLocationByIdApproval(): Promise<void> {
  await runIntegrationTest("get-location-by-id-approval", async ({ namespace }) => {
    const approvedLocation = buildLocation(namespace, "approved place");
    const pendingLocation = buildLocation(namespace, "pending place", {
      id: namespace.id("location-pending"),
      locationType: "bar",
      status: "pending",
    });

    await db.location.create({ data: approvedLocation });
    await db.location.create({ data: pendingLocation });

    const approved = await getLocationById(approvedLocation.id);
    const pending = await getLocationById(pendingLocation.id);

    assert(approved?.id === approvedLocation.id, "Expected approved location to be returned.");
    assert(pending === undefined, "Expected pending location to be hidden.");
  });
}

async function testGetBeerOffersFiltersApprovedOnly(): Promise<void> {
  await runIntegrationTest("get-beer-offers-approved-only", async ({ namespace }) => {
    const style = buildBeerStyle(namespace, "style");
    const brand = buildBeerBrand(namespace, "brand");
    const variant = buildBeerVariant(namespace, "variant", {
      brandId: brand.id,
      styleId: style.id,
    });
    const location = buildLocation(namespace, "offers place");
    const approvedOffer = buildBeerOffer(namespace, "approved", {
      brand: "Approved Brand",
      variant: "Approved Variant",
      variantId: variant.id,
      locationId: location.id,
      priceCents: 333,
    });
    const pendingOffer = buildBeerOffer(namespace, "pending", {
      brand: "Pending Brand",
      variant: "Pending Variant",
      variantId: variant.id,
      locationId: location.id,
      serving: "bottle",
      priceCents: 999,
      status: "pending",
    });

    await db.beerStyle.create({ data: style });
    await db.beerBrand.create({ data: brand });
    await db.beerVariant.create({ data: variant });
    await db.location.create({ data: location });
    await db.beerOffer.create({ data: approvedOffer });
    await db.beerOffer.create({ data: pendingOffer });

    const offers = await getBeerOffers();

    assert(
      offers.some((offer) => offer.id === approvedOffer.id),
      "Expected approved offer to be returned.",
    );
    assert(
      !offers.some((offer) => offer.id === pendingOffer.id),
      "Expected pending offer to be filtered out.",
    );
  });
}

async function testCreateOfferOrPriceUpdateProposalFlow(): Promise<void> {
  await runIntegrationTest("offer-or-price-update-flow", async ({ namespace }) => {
    const style = buildBeerStyle(namespace, "flow style");
    const brand = buildBeerBrand(namespace, "flow brand");
    const variant = buildBeerVariant(namespace, "flow variant", {
      brandId: brand.id,
      styleId: style.id,
    });

    await db.beerStyle.create({ data: style });
    await db.beerBrand.create({ data: brand });
    await db.beerVariant.create({ data: variant });

    const location = await createLocation({
      name: namespace.name("Flow Place"),
      locationType: "pub",
      district: "Mitte",
      address: "Flow Street 1",
      status: "approved",
    });

    const first = await createOfferOrPriceUpdateProposal({
      variantId: variant.id,
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
      variantId: variant.id,
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
  });
}

async function testCreateBeerOfferSnapshotsVariantNames(): Promise<void> {
  await runIntegrationTest("create-beer-offer-snapshots", async ({ namespace }) => {
    const style = buildBeerStyle(namespace, "snapshot style");
    const brand = buildBeerBrand(namespace, "snapshot brand");
    const variantSeed = buildBeerVariant(namespace, "snapshot variant", {
      brandId: brand.id,
      styleId: style.id,
    });

    await db.beerStyle.create({ data: style });
    await db.beerBrand.create({ data: brand });
    await db.beerVariant.create({ data: variantSeed });

    const location = await createLocation({
      name: namespace.name("Snapshot Place"),
      locationType: "supermarket",
      district: "West",
      address: "Snapshot 42",
      status: "approved",
    });

    const created = await createBeerOffer({
      variantId: variantSeed.id,
      sizeMl: 330,
      serving: "can",
      priceCents: 199,
      locationId: location.id,
      status: "approved",
    });

    const variant = await db.beerVariant.findUnique({
      where: { id: variantSeed.id },
      include: { brand: true },
    });

    assert(Boolean(variant?.name), "Expected variant to exist.");
    assert(Boolean(variant?.brand.name), "Expected brand to exist.");
    assert(created.variant === variant?.name, "Expected offer.variant to snapshot variant name.");
    assert(created.brand === variant?.brand.name, "Expected offer.brand to snapshot brand name.");
  });
}

async function testGetOfferPriceHistoryBatchGroupsByOffer(): Promise<void> {
  await runIntegrationTest("offer-price-history-batch", async ({ namespace }) => {
    const style = buildBeerStyle(namespace, "batch style");
    const brand = buildBeerBrand(namespace, "batch brand");
    const variant = buildBeerVariant(namespace, "batch variant", {
      brandId: brand.id,
      styleId: style.id,
    });
    const location = buildLocation(namespace, "batch location");
    const offerOne = buildBeerOffer(namespace, "one", {
      brand: brand.name,
      variant: variant.name,
      variantId: variant.id,
      locationId: location.id,
      priceCents: 420,
    });
    const offerTwo = buildBeerOffer(namespace, "two", {
      brand: brand.name,
      variant: variant.name,
      variantId: variant.id,
      locationId: location.id,
      priceCents: 510,
      sizeMl: 330,
    });

    await db.beerStyle.create({ data: style });
    await db.beerBrand.create({ data: brand });
    await db.beerVariant.create({ data: variant });
    await db.location.create({ data: location });
    await db.beerOffer.create({ data: offerOne });
    await db.beerOffer.create({ data: offerTwo });

    await db.offerPriceHistory.create({
      data: {
        beerOfferId: offerOne.id,
        priceCents: 410,
        effectiveAt: new Date("2024-01-01T00:00:00.000Z"),
      },
    });
    await db.offerPriceHistory.create({
      data: {
        beerOfferId: offerOne.id,
        priceCents: 420,
        effectiveAt: new Date("2024-02-01T00:00:00.000Z"),
      },
    });
    await db.offerPriceHistory.create({
      data: {
        beerOfferId: offerTwo.id,
        priceCents: 510,
        effectiveAt: new Date("2024-03-01T00:00:00.000Z"),
      },
    });

    const historyByOfferId = await getOfferPriceHistoryBatch([
      offerOne.id,
      offerTwo.id,
      namespace.id("offer-missing"),
    ]);

    assert(
      historyByOfferId.get(offerOne.id)?.length === 2,
      "Expected two entries for first offer.",
    );
    assert(historyByOfferId.get(offerTwo.id)?.length === 1, "Expected one entry for second offer.");
    assert(
      historyByOfferId.get(namespace.id("offer-missing"))?.length === 0,
      "Expected empty history for unknown offer id.",
    );
    assert(
      historyByOfferId.get(offerOne.id)?.[0]?.priceEur === 4.2,
      "Expected history to be ordered newest first.",
    );
  });
}

async function testGetDistinctApprovedOfferSizesReturnsSortedUniqueValues(): Promise<void> {
  await runIntegrationTest("distinct-approved-offer-sizes", async ({ namespace }) => {
    const style = buildBeerStyle(namespace, "size style");
    const brand = buildBeerBrand(namespace, "size brand");
    const variant = buildBeerVariant(namespace, "size variant", {
      brandId: brand.id,
      styleId: style.id,
    });
    const approvedLocation = buildLocation(namespace, "approved location");
    const pendingLocation = buildLocation(namespace, "pending location", {
      id: namespace.id("location-pending"),
      status: "pending",
    });

    await db.beerStyle.create({ data: style });
    await db.beerBrand.create({ data: brand });
    await db.beerVariant.create({ data: variant });
    await db.location.create({ data: approvedLocation });
    await db.location.create({ data: pendingLocation });

    await db.beerOffer.create({
      data: buildBeerOffer(namespace, "size-500-a", {
        brand: brand.name,
        variant: variant.name,
        variantId: variant.id,
        locationId: approvedLocation.id,
        sizeMl: 123,
      }),
    });
    await db.beerOffer.create({
      data: buildBeerOffer(namespace, "size-500-b", {
        brand: brand.name,
        variant: variant.name,
        variantId: variant.id,
        locationId: approvedLocation.id,
        sizeMl: 123,
        serving: "bottle",
      }),
    });
    await db.beerOffer.create({
      data: buildBeerOffer(namespace, "size-330", {
        brand: brand.name,
        variant: variant.name,
        variantId: variant.id,
        locationId: approvedLocation.id,
        sizeMl: 987,
      }),
    });
    await db.beerOffer.create({
      data: buildBeerOffer(namespace, "size-hidden", {
        brand: brand.name,
        variant: variant.name,
        variantId: variant.id,
        locationId: pendingLocation.id,
        sizeMl: 777,
      }),
    });

    const sizes = await getDistinctApprovedOfferSizes();

    assert(sizes.includes(123), "Expected approved sizes to include 123 ml.");
    assert(sizes.includes(987), "Expected approved sizes to include 987 ml.");
    assert(!sizes.includes(777), "Expected pending-location-only size to stay hidden.");
    assert(
      sizes.indexOf(123) < sizes.indexOf(987),
      "Expected the returned size options to remain sorted ascending.",
    );
  });
}

async function testLogModerationActionPersistsEntry(): Promise<void> {
  await runIntegrationTest("log-moderation-action", async ({ namespace }) => {
    const moderator = buildUser(namespace, "moderator", { role: "moderator" });
    const contentId = namespace.id("content-brand");

    await db.user.create({ data: moderator });

    await logModerationAction({
      moderatorId: moderator.id,
      moderatorName: moderator.displayName,
      action: "approve",
      contentType: "brand",
      contentId,
      details: { name: namespace.name("Approved Brand") },
    });

    const entry = await db.moderationAuditLog.findFirst({
      where: { contentId },
      orderBy: { createdAt: "desc" },
    });

    assert(entry?.contentId === contentId, "Expected moderation log to persist content id.");
    assert(entry?.moderatorId === moderator.id, "Expected moderation log to persist moderator id.");
    assert(entry?.action === "approve", "Expected moderation log to persist action.");
    assert(
      entry?.details?.includes("Approved Brand"),
      "Expected moderation log to persist details.",
    );
  });
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
    {
      name: "getOfferPriceHistoryBatch groups histories by offer",
      fn: testGetOfferPriceHistoryBatchGroupsByOffer,
    },
    {
      name: "getDistinctApprovedOfferSizes returns sorted unique values",
      fn: testGetDistinctApprovedOfferSizesReturnsSortedUniqueValues,
    },
    {
      name: "logModerationAction persists audit entries",
      fn: testLogModerationActionPersistsEntry,
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
