import "dotenv/config";
import { db } from "@/lib/db";
import {
  createAdminStyle,
  createBeerOffer,
  createLocation,
  createOfferOrPriceUpdateProposal,
  getDistinctApprovedOfferSizes,
  getBeerOffers,
  getLocationById,
  getOfferPriceHistoryBatch,
  logModerationAction,
  moderateBeerOfferSubmission,
  moderateLocationSubmission,
  moderatePriceUpdateProposal,
} from "@/lib/query";
import { authIntegrationChecks } from "./auth";
import { routeIntegrationChecks } from "./routes";
import {
  buildBeerBrand,
  buildBeerOffer,
  buildBeerStyle,
  buildBeerVariant,
  buildLocation,
  buildUser,
} from "../test/factories";
import {
  assert,
  closeIntegrationTestResources,
  runIntegrationTest,
  seedCatalogFixture,
} from "./helpers";

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
    const {
      variant,
      location,
      offer: approvedOffer,
    } = await seedCatalogFixture(namespace, "offers", {
      offer: {
        brand: "Approved Brand",
        variant: "Approved Variant",
        priceCents: 333,
      },
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

    if (!approvedOffer) {
      throw new Error("Expected approved offer fixture to be created.");
    }

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

    const createdOffer = await db.beerOffer.findUnique({
      where: { id: first.offer.id },
      select: {
        id: true,
        status: true,
        priceCents: true,
        locationId: true,
        variantId: true,
        sizeMl: true,
        serving: true,
      },
    });
    const firstProposalCount = await db.priceUpdateProposal.count({
      where: { beerOfferId: first.offer.id },
    });

    assert(createdOffer?.status === "pending", "Expected first submit to persist a pending offer.");
    assert(
      createdOffer?.priceCents === 450,
      "Expected first submit to persist the submitted offer price.",
    );
    assert(
      createdOffer?.locationId === location.id,
      "Expected first submit to persist the target location.",
    );
    assert(
      createdOffer?.variantId === variant.id,
      "Expected first submit to persist the target variant.",
    );
    assert(createdOffer?.sizeMl === 400, "Expected first submit to persist the submitted size.");
    assert(
      createdOffer?.serving === "bottle",
      "Expected first submit to persist the submitted serving.",
    );
    assert(
      firstProposalCount === 0,
      "Expected first submit not to create a price update proposal.",
    );

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

    const persistedOffer = await db.beerOffer.findUnique({
      where: { id: first.offer.id },
      select: { status: true, priceCents: true },
    });
    const persistedProposal = await db.priceUpdateProposal.findUnique({
      where: { id: second.proposal.id },
      select: {
        beerOfferId: true,
        proposedPriceCents: true,
        status: true,
      },
    });
    const proposalCount = await db.priceUpdateProposal.count({
      where: { beerOfferId: first.offer.id },
    });

    assert(
      persistedOffer?.status === "approved",
      "Expected the existing offer to remain approved after creating a price update proposal.",
    );
    assert(
      persistedOffer?.priceCents === 450,
      "Expected the existing offer price to remain unchanged until proposal approval.",
    );
    assert(
      persistedProposal?.beerOfferId === first.offer.id,
      "Expected the persisted price update proposal to reference the existing offer.",
    );
    assert(
      persistedProposal?.proposedPriceCents === 470,
      "Expected the persisted price update proposal to keep the submitted price.",
    );
    assert(
      persistedProposal?.status === "pending",
      "Expected the persisted price update proposal to remain pending.",
    );
    assert(
      proposalCount === 1,
      "Expected exactly one price update proposal for the existing offer.",
    );
  });
}

async function testCreateOfferOrPriceUpdateProposalSamePriceFlow(): Promise<void> {
  await runIntegrationTest("offer-or-price-update-same-price", async ({ namespace }) => {
    const {
      variant,
      location,
      offer: existingOffer,
    } = await seedCatalogFixture(namespace, "same price", {
      offer: {
        sizeMl: 330,
        serving: "can",
        priceCents: 299,
        status: "approved",
      },
    });

    if (!existingOffer) {
      throw new Error("Expected same-price offer fixture to be created.");
    }

    const result = await createOfferOrPriceUpdateProposal({
      variantId: variant.id,
      sizeMl: 330,
      serving: "can",
      priceCents: 299,
      locationId: location.id,
      status: "pending",
    });

    assert(result.outcome === "same_price", "Expected identical prices to return same_price.");
    if (result.outcome !== "same_price") {
      return;
    }

    const offerCount = await db.beerOffer.count({
      where: {
        locationId: location.id,
        variantId: variant.id,
        sizeMl: 330,
        serving: "can",
      },
    });
    const proposalCount = await db.priceUpdateProposal.count({
      where: { beerOfferId: existingOffer.id },
    });

    assert(
      result.offer.id === existingOffer.id,
      "Expected same_price to reference the existing offer.",
    );
    assert(offerCount === 1, "Expected same_price not to create a duplicate offer row.");
    assert(proposalCount === 0, "Expected same_price not to create a price update proposal.");
  });
}

async function testCreateOfferOrPriceUpdateProposalPendingOfferFlow(): Promise<void> {
  await runIntegrationTest("offer-or-price-update-existing-pending", async ({ namespace }) => {
    const {
      variant,
      location,
      offer: existingOffer,
    } = await seedCatalogFixture(namespace, "pending offer", {
      offer: {
        sizeMl: 500,
        serving: "tap",
        priceCents: 420,
        status: "pending",
      },
    });

    if (!existingOffer) {
      throw new Error("Expected pending-offer fixture to be created.");
    }

    const result = await createOfferOrPriceUpdateProposal({
      variantId: variant.id,
      sizeMl: 500,
      serving: "tap",
      priceCents: 450,
      locationId: location.id,
      status: "pending",
    });

    assert(
      result.outcome === "existing_offer_not_approved",
      "Expected a pending existing offer to block branching into a price update proposal.",
    );
    if (result.outcome !== "existing_offer_not_approved") {
      return;
    }

    const offerCount = await db.beerOffer.count({
      where: {
        locationId: location.id,
        variantId: variant.id,
        sizeMl: 500,
        serving: "tap",
      },
    });
    const proposalCount = await db.priceUpdateProposal.count({
      where: { beerOfferId: existingOffer.id },
    });
    const persistedOffer = await db.beerOffer.findUnique({
      where: { id: existingOffer.id },
      select: { status: true, priceCents: true },
    });

    assert(
      result.offer.id === existingOffer.id,
      "Expected existing_offer_not_approved to reference the pending existing offer.",
    );
    assert(
      offerCount === 1,
      "Expected existing_offer_not_approved not to create a duplicate offer row.",
    );
    assert(
      proposalCount === 0,
      "Expected existing_offer_not_approved not to create a price update proposal.",
    );
    assert(
      persistedOffer?.status === "pending",
      "Expected the existing pending offer to remain pending after the blocked submission.",
    );
    assert(
      persistedOffer?.priceCents === 420,
      "Expected the existing pending offer price to remain unchanged after the blocked submission.",
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

async function testModerateBeerOfferApprovalCreatesHistoryEntry(): Promise<void> {
  await runIntegrationTest("moderate-offer-approval-history", async ({ namespace }) => {
    const style = buildBeerStyle(namespace, "mod style");
    const brand = buildBeerBrand(namespace, "mod brand");
    const variant = buildBeerVariant(namespace, "mod variant", {
      brandId: brand.id,
      styleId: style.id,
    });
    const location = buildLocation(namespace, "mod location");
    const offer = buildBeerOffer(namespace, "mod offer", {
      brand: brand.name,
      variant: variant.name,
      variantId: variant.id,
      locationId: location.id,
      priceCents: 390,
      status: "pending",
    });

    await db.beerStyle.create({ data: style });
    await db.beerBrand.create({ data: brand });
    await db.beerVariant.create({ data: variant });
    await db.location.create({ data: location });
    await db.beerOffer.create({ data: offer });

    const result = await moderateBeerOfferSubmission(offer.id, "approved");

    assert(result.outcome === "updated", "Expected moderation to succeed.");

    const history = await db.offerPriceHistory.findMany({
      where: { beerOfferId: offer.id },
    });

    assert(history.length === 1, "Expected exactly one price history entry after approval.");
    assert(
      history[0]?.priceCents === 390,
      "Expected price history entry to snapshot the offer's priceCents.",
    );
  });
}

async function testModeratePriceUpdateApprovalUpdatesOfferAndCreatesHistory(): Promise<void> {
  await runIntegrationTest("moderate-price-update-approval", async ({ namespace }) => {
    const style = buildBeerStyle(namespace, "pup style");
    const brand = buildBeerBrand(namespace, "pup brand");
    const variant = buildBeerVariant(namespace, "pup variant", {
      brandId: brand.id,
      styleId: style.id,
    });
    const location = buildLocation(namespace, "pup location");
    const offer = buildBeerOffer(namespace, "pup offer", {
      brand: brand.name,
      variant: variant.name,
      variantId: variant.id,
      locationId: location.id,
      priceCents: 450,
    });

    await db.beerStyle.create({ data: style });
    await db.beerBrand.create({ data: brand });
    await db.beerVariant.create({ data: variant });
    await db.location.create({ data: location });
    await db.beerOffer.create({ data: offer });

    // Seed an initial price history entry (simulating prior approval)
    await db.offerPriceHistory.create({
      data: { beerOfferId: offer.id, priceCents: 450 },
    });

    const proposal = await db.priceUpdateProposal.create({
      data: {
        beerOfferId: offer.id,
        proposedPriceCents: 510,
        status: "pending",
      },
    });

    const result = await moderatePriceUpdateProposal(proposal.id, "approved");

    assert(result.outcome === "updated", "Expected price update moderation to succeed.");
    if (result.outcome !== "updated") {
      return;
    }

    assert(
      result.offer.priceEur === 5.1,
      "Expected offer price to be updated to the proposed price.",
    );

    const history = await db.offerPriceHistory.findMany({
      where: { beerOfferId: offer.id },
      orderBy: { effectiveAt: "asc" },
    });

    assert(history.length === 2, "Expected two price history entries after approval.");
    assert(
      history[1]?.priceCents === 510,
      "Expected the new history entry to record the approved proposed price.",
    );
    assert(
      history[1]?.priceUpdateProposalId === proposal.id,
      "Expected history entry to link back to the proposal.",
    );
  });
}

async function testRejectedLocationCascadesPendingOffers(): Promise<void> {
  await runIntegrationTest("rejected-location-cascades-offers", async ({ namespace }) => {
    const style = buildBeerStyle(namespace, "cas style");
    const brand = buildBeerBrand(namespace, "cas brand");
    const variant = buildBeerVariant(namespace, "cas variant", {
      brandId: brand.id,
      styleId: style.id,
    });
    const location = buildLocation(namespace, "cas location", { status: "pending" });
    const pendingOffer = buildBeerOffer(namespace, "cas pending offer", {
      brand: brand.name,
      variant: variant.name,
      variantId: variant.id,
      locationId: location.id,
      status: "pending",
    });
    const approvedOffer = buildBeerOffer(namespace, "cas approved offer", {
      brand: brand.name,
      variant: variant.name,
      variantId: variant.id,
      locationId: location.id,
      serving: "bottle",
      status: "approved",
    });

    await db.beerStyle.create({ data: style });
    await db.beerBrand.create({ data: brand });
    await db.beerVariant.create({ data: variant });
    await db.location.create({ data: location });
    await db.beerOffer.create({ data: pendingOffer });
    await db.beerOffer.create({ data: approvedOffer });

    const result = await moderateLocationSubmission(location.id, "rejected");

    assert(result !== null, "Expected moderation to return the updated location.");

    const rejectedPendingOffer = await db.beerOffer.findUnique({
      where: { id: pendingOffer.id },
    });
    const untouchedApprovedOffer = await db.beerOffer.findUnique({
      where: { id: approvedOffer.id },
    });

    assert(
      rejectedPendingOffer?.status === "rejected",
      "Expected pending offer to be cascaded to rejected.",
    );
    assert(
      untouchedApprovedOffer?.status === "approved",
      "Expected already-approved offer to remain unchanged.",
    );
  });
}

async function testDuplicateStyleNameBlocksCreation(): Promise<void> {
  await runIntegrationTest("duplicate-style-name-blocks", async ({ namespace }) => {
    const styleName = namespace.name("duplicate style");

    const first = await createAdminStyle(styleName);

    assert(first !== null, "Expected first style creation to succeed.");
    assert(first?.name === styleName, "Expected created style to have the requested name.");

    const second = await createAdminStyle(styleName);

    assert(second === null, "Expected duplicate style name to be blocked.");
  });
}

async function run(): Promise<void> {
  const checks: Array<{ name: string; fn: () => Promise<void> }> = [
    ...authIntegrationChecks,
    ...routeIntegrationChecks,
    { name: "getLocationById only exposes approved", fn: testGetLocationByIdApproval },
    { name: "getBeerOffers filters approved offers", fn: testGetBeerOffersFiltersApprovedOnly },
    { name: "offer submission to price update flow", fn: testCreateOfferOrPriceUpdateProposalFlow },
    {
      name: "offer submission same-price branch preserves persistence",
      fn: testCreateOfferOrPriceUpdateProposalSamePriceFlow,
    },
    {
      name: "offer submission pending-offer branch preserves persistence",
      fn: testCreateOfferOrPriceUpdateProposalPendingOfferFlow,
    },
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
    {
      name: "moderateBeerOfferSubmission approve creates price history",
      fn: testModerateBeerOfferApprovalCreatesHistoryEntry,
    },
    {
      name: "moderatePriceUpdateProposal approve updates offer price and creates history",
      fn: testModeratePriceUpdateApprovalUpdatesOfferAndCreatesHistory,
    },
    {
      name: "rejected location cascades rejection to pending offers",
      fn: testRejectedLocationCascadesPendingOffers,
    },
    {
      name: "duplicate style name blocks createAdminStyle",
      fn: testDuplicateStyleNameBlocksCreation,
    },
  ];

  for (const check of checks) {
    await check.fn();
    console.log(`ok - ${check.name}`);
  }
}

run()
  .then(async () => {
    await closeIntegrationTestResources();
    await db.$disconnect();
  })
  .catch(async (error) => {
    console.error("Integration checks failed:", error);
    await closeIntegrationTestResources();
    await db.$disconnect();
    process.exit(1);
  });
