import { db } from "@/lib/db";
import {
  buildBeerBrand,
  buildBeerOffer,
  buildBeerStyle,
  buildBeerVariant,
  buildLocation,
} from "../test/factories";
import {
  assert,
  fail,
  runIntegrationTest,
  seedAuthUser,
  startAuthenticatedSession,
} from "./helpers";

type IntegrationCheck = {
  name: string;
  fn: () => Promise<void>;
};

async function parseJson(response: Response): Promise<unknown> {
  return response.json();
}

async function testAdminBrandCreateDuplicateMapsConflict(): Promise<void> {
  await runIntegrationTest("admin-brand-create-duplicate", async ({ namespace }) => {
    const { user: admin } = await seedAuthUser(namespace, "admin-brand-create", { role: "admin" });
    const brand = buildBeerBrand(namespace, "brand-create-duplicate");

    await db.beerBrand.create({ data: brand });
    await startAuthenticatedSession(admin.id);

    const { POST } = await import("@/app/api/v1/admin/brands/route");
    const response = await POST(
      new Request("http://localhost/api/v1/admin/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: brand.name }),
      }),
    );
    const body = (await parseJson(response)) as { error?: { code?: string } };

    assert(response.status === 409, "Expected duplicate admin brand creates to return 409.");
    assert(
      body.error?.code === "BRAND_NAME_CONFLICT",
      "Expected duplicate admin brand creates to map to BRAND_NAME_CONFLICT.",
    );
  });
}

async function testAdminBrandEditDuplicateMapsConflict(): Promise<void> {
  await runIntegrationTest("admin-brand-edit-duplicate", async ({ namespace }) => {
    const { user: admin } = await seedAuthUser(namespace, "admin-brand-edit", { role: "admin" });
    const originalBrand = buildBeerBrand(namespace, "brand-edit-original");
    const duplicateBrand = buildBeerBrand(namespace, "brand-edit-duplicate");

    await db.beerBrand.createMany({ data: [originalBrand, duplicateBrand] });
    await startAuthenticatedSession(admin.id);

    const { PUT } = await import("@/app/api/v1/admin/brands/[brandId]/route");
    const response = await PUT(
      new Request(`http://localhost/api/v1/admin/brands/${originalBrand.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: duplicateBrand.name }),
      }),
      { params: Promise.resolve({ brandId: originalBrand.id }) },
    );
    const body = (await parseJson(response)) as { error?: { code?: string } };

    assert(response.status === 409, "Expected duplicate admin brand edits to return 409.");
    assert(
      body.error?.code === "BRAND_NAME_CONFLICT",
      "Expected duplicate admin brand edits to map to BRAND_NAME_CONFLICT.",
    );
  });
}

async function testAdminBrandDeleteInUseMapsConflict(): Promise<void> {
  await runIntegrationTest("admin-brand-delete-in-use", async ({ namespace }) => {
    const { user: admin } = await seedAuthUser(namespace, "admin-brand-delete", { role: "admin" });
    const style = buildBeerStyle(namespace, "brand-delete-style");
    const brand = buildBeerBrand(namespace, "brand-delete-brand");
    const variant = buildBeerVariant(namespace, "brand-delete-variant", {
      brandId: brand.id,
      styleId: style.id,
    });
    const location = buildLocation(namespace, "brand-delete-location");
    const offer = buildBeerOffer(namespace, "brand-delete-offer", {
      brand: brand.name,
      variant: variant.name,
      variantId: variant.id,
      locationId: location.id,
    });

    await db.beerStyle.create({ data: style });
    await db.beerBrand.create({ data: brand });
    await db.beerVariant.create({ data: variant });
    await db.location.create({ data: location });
    await db.beerOffer.create({ data: offer });
    await startAuthenticatedSession(admin.id);

    const { DELETE } = await import("@/app/api/v1/admin/brands/[brandId]/route");
    const response = await DELETE(new Request(`http://localhost/api/v1/admin/brands/${brand.id}`), {
      params: Promise.resolve({ brandId: brand.id }),
    });
    const body = (await parseJson(response)) as { error?: { code?: string } };

    assert(response.status === 409, "Expected in-use admin brand deletes to return 409.");
    assert(
      body.error?.code === "BRAND_IN_USE",
      "Expected in-use admin brand deletes to map to BRAND_IN_USE.",
    );
  });
}

async function testAdminVariantCreateDuplicateMapsConflict(): Promise<void> {
  await runIntegrationTest("admin-variant-create-duplicate", async ({ namespace }) => {
    const { user: admin } = await seedAuthUser(namespace, "admin-variant-create", {
      role: "admin",
    });
    const style = buildBeerStyle(namespace, "variant-create-style");
    const brand = buildBeerBrand(namespace, "variant-create-brand");
    const variant = buildBeerVariant(namespace, "variant-create-existing", {
      brandId: brand.id,
      styleId: style.id,
    });

    await db.beerStyle.create({ data: style });
    await db.beerBrand.create({ data: brand });
    await db.beerVariant.create({ data: variant });
    await startAuthenticatedSession(admin.id);

    const { POST } = await import("@/app/api/v1/admin/variants/route");
    const response = await POST(
      new Request("http://localhost/api/v1/admin/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: variant.name, brandId: brand.id, styleId: style.id }),
      }),
    );
    const body = (await parseJson(response)) as { error?: { code?: string } };

    assert(response.status === 409, "Expected duplicate admin variant creates to return 409.");
    assert(
      body.error?.code === "VARIANT_NAME_CONFLICT",
      "Expected duplicate admin variant creates to map to VARIANT_NAME_CONFLICT.",
    );
  });
}

async function testAdminVariantEditDuplicateMapsConflict(): Promise<void> {
  await runIntegrationTest("admin-variant-edit-duplicate", async ({ namespace }) => {
    const { user: admin } = await seedAuthUser(namespace, "admin-variant-edit", { role: "admin" });
    const style = buildBeerStyle(namespace, "variant-edit-style");
    const brand = buildBeerBrand(namespace, "variant-edit-brand");
    const originalVariant = buildBeerVariant(namespace, "variant-edit-original", {
      brandId: brand.id,
      styleId: style.id,
    });
    const duplicateVariant = buildBeerVariant(namespace, "variant-edit-duplicate", {
      brandId: brand.id,
      styleId: style.id,
    });

    await db.beerStyle.create({ data: style });
    await db.beerBrand.create({ data: brand });
    await db.beerVariant.createMany({ data: [originalVariant, duplicateVariant] });
    await startAuthenticatedSession(admin.id);

    const { PUT } = await import("@/app/api/v1/admin/variants/[variantId]/route");
    const response = await PUT(
      new Request(`http://localhost/api/v1/admin/variants/${originalVariant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: duplicateVariant.name }),
      }),
      { params: Promise.resolve({ variantId: originalVariant.id }) },
    );
    const body = (await parseJson(response)) as { error?: { code?: string } };

    assert(response.status === 409, "Expected duplicate admin variant edits to return 409.");
    assert(
      body.error?.code === "VARIANT_NAME_CONFLICT",
      "Expected duplicate admin variant edits to map to VARIANT_NAME_CONFLICT.",
    );
  });
}

async function testAdminVariantDeleteInUseMapsConflict(): Promise<void> {
  await runIntegrationTest("admin-variant-delete-in-use", async ({ namespace }) => {
    const { user: admin } = await seedAuthUser(namespace, "admin-variant-delete", {
      role: "admin",
    });
    const style = buildBeerStyle(namespace, "variant-delete-style");
    const brand = buildBeerBrand(namespace, "variant-delete-brand");
    const variant = buildBeerVariant(namespace, "variant-delete-variant", {
      brandId: brand.id,
      styleId: style.id,
    });
    const location = buildLocation(namespace, "variant-delete-location");
    const offer = buildBeerOffer(namespace, "variant-delete-offer", {
      brand: brand.name,
      variant: variant.name,
      variantId: variant.id,
      locationId: location.id,
    });

    await db.beerStyle.create({ data: style });
    await db.beerBrand.create({ data: brand });
    await db.beerVariant.create({ data: variant });
    await db.location.create({ data: location });
    await db.beerOffer.create({ data: offer });
    await startAuthenticatedSession(admin.id);

    const { DELETE } = await import("@/app/api/v1/admin/variants/[variantId]/route");
    const response = await DELETE(
      new Request(`http://localhost/api/v1/admin/variants/${variant.id}`),
      { params: Promise.resolve({ variantId: variant.id }) },
    );
    const body = (await parseJson(response)) as { error?: { code?: string } };

    assert(response.status === 409, "Expected in-use admin variant deletes to return 409.");
    assert(
      body.error?.code === "VARIANT_IN_USE",
      "Expected in-use admin variant deletes to map to VARIANT_IN_USE.",
    );
  });
}

async function testAdminStyleDeleteInUseMapsConflict(): Promise<void> {
  await runIntegrationTest("admin-style-delete-in-use", async ({ namespace }) => {
    const { user: admin } = await seedAuthUser(namespace, "admin-style-delete", { role: "admin" });
    const style = buildBeerStyle(namespace, "style-delete-style");
    const brand = buildBeerBrand(namespace, "style-delete-brand");
    const variant = buildBeerVariant(namespace, "style-delete-variant", {
      brandId: brand.id,
      styleId: style.id,
    });

    await db.beerStyle.create({ data: style });
    await db.beerBrand.create({ data: brand });
    await db.beerVariant.create({ data: variant });
    await startAuthenticatedSession(admin.id);

    const { DELETE } = await import("@/app/api/v1/admin/styles/[styleId]/route");
    const response = await DELETE(new Request(`http://localhost/api/v1/admin/styles/${style.id}`), {
      params: Promise.resolve({ styleId: style.id }),
    });
    const body = (await parseJson(response)) as { error?: { code?: string } };

    assert(response.status === 409, "Expected in-use admin style deletes to return 409.");
    assert(
      body.error?.code === "STYLE_IN_USE",
      "Expected in-use admin style deletes to map to STYLE_IN_USE.",
    );
  });
}

async function testAdminOfferCreateDuplicateMapsConflict(): Promise<void> {
  await runIntegrationTest("admin-offer-create-duplicate", async ({ namespace }) => {
    const { user: admin } = await seedAuthUser(namespace, "admin-offer-create", { role: "admin" });
    const style = buildBeerStyle(namespace, "offer-create-style");
    const brand = buildBeerBrand(namespace, "offer-create-brand");
    const variant = buildBeerVariant(namespace, "offer-create-variant", {
      brandId: brand.id,
      styleId: style.id,
    });
    const location = buildLocation(namespace, "offer-create-location");
    const offer = buildBeerOffer(namespace, "offer-create-existing", {
      brand: brand.name,
      variant: variant.name,
      variantId: variant.id,
      locationId: location.id,
      sizeMl: 500,
      serving: "tap",
    });

    await db.beerStyle.create({ data: style });
    await db.beerBrand.create({ data: brand });
    await db.beerVariant.create({ data: variant });
    await db.location.create({ data: location });
    await db.beerOffer.create({ data: offer });
    await startAuthenticatedSession(admin.id);

    const { POST } = await import("@/app/api/v1/admin/offers/route");
    const response = await POST(
      new Request("http://localhost/api/v1/admin/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: variant.id,
          locationId: location.id,
          sizeMl: 500,
          serving: "tap",
          priceCents: 555,
        }),
      }),
    );
    const body = (await parseJson(response)) as { error?: { code?: string } };

    assert(response.status === 409, "Expected duplicate admin offer creates to return 409.");
    assert(
      body.error?.code === "OFFER_CONFLICT",
      "Expected duplicate admin offer creates to map to OFFER_CONFLICT.",
    );
  });
}

async function testModerationOfferEditCreatesAuditLogEntry(): Promise<void> {
  await runIntegrationTest("moderation-offer-edit-audit-log", async ({ namespace }) => {
    const { user: moderator } = await seedAuthUser(namespace, "moderation-offer-edit", {
      role: "moderator",
    });
    const style = buildBeerStyle(namespace, "moderation-edit-style");
    const brand = buildBeerBrand(namespace, "moderation-edit-brand");
    const variant = buildBeerVariant(namespace, "moderation-edit-variant", {
      brandId: brand.id,
      styleId: style.id,
    });
    const location = buildLocation(namespace, "moderation-edit-location");
    const offer = buildBeerOffer(namespace, "moderation-edit-offer", {
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
    await startAuthenticatedSession(moderator.id);

    const { PUT } = await import("@/app/api/v1/moderation/offers/[offerId]/route");
    const response = await PUT(
      new Request(`http://localhost/api/v1/moderation/offers/${offer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceCents: 525 }),
      }),
      { params: Promise.resolve({ offerId: offer.id }) },
    );

    assert(response.status === 200, "Expected moderation offer edits to succeed.");

    const updatedOffer = await db.beerOffer.findUnique({
      where: { id: offer.id },
      select: { priceCents: true },
    });
    const entry = await db.moderationAuditLog.findFirst({
      where: { contentId: offer.id, action: "edit", contentType: "offer" },
      orderBy: { createdAt: "desc" },
    });

    assert(
      updatedOffer?.priceCents === 525,
      "Expected moderation offer edits to persist the new price.",
    );
    if (!entry?.details) {
      fail("Expected moderation offer edits to create an audit log entry with details.");
    }

    const details = JSON.parse(entry.details) as {
      priceCents?: number;
      previousPriceEur?: number;
    };

    assert(
      details.priceCents === 525,
      "Expected audit log details to include the updated priceCents.",
    );
    assert(
      details.previousPriceEur === 4.5,
      "Expected audit log details to include the previous price in EUR.",
    );
  });
}

async function testModerationOfferDeleteCreatesAuditLogEntry(): Promise<void> {
  await runIntegrationTest("moderation-offer-delete-audit-log", async ({ namespace }) => {
    const { user: moderator } = await seedAuthUser(namespace, "moderation-offer-delete", {
      role: "moderator",
    });
    const style = buildBeerStyle(namespace, "moderation-delete-style");
    const brand = buildBeerBrand(namespace, "moderation-delete-brand");
    const variant = buildBeerVariant(namespace, "moderation-delete-variant", {
      brandId: brand.id,
      styleId: style.id,
    });
    const location = buildLocation(namespace, "moderation-delete-location");
    const offer = buildBeerOffer(namespace, "moderation-delete-offer", {
      brand: brand.name,
      variant: variant.name,
      variantId: variant.id,
      locationId: location.id,
      priceCents: 480,
    });

    await db.beerStyle.create({ data: style });
    await db.beerBrand.create({ data: brand });
    await db.beerVariant.create({ data: variant });
    await db.location.create({ data: location });
    await db.beerOffer.create({ data: offer });
    await startAuthenticatedSession(moderator.id);

    const { DELETE } = await import("@/app/api/v1/moderation/offers/[offerId]/route");
    const response = await DELETE(
      new Request(`http://localhost/api/v1/moderation/offers/${offer.id}`),
      { params: Promise.resolve({ offerId: offer.id }) },
    );

    assert(response.status === 200, "Expected moderation offer deletes to succeed.");

    const deletedOffer = await db.beerOffer.findUnique({ where: { id: offer.id } });
    const entry = await db.moderationAuditLog.findFirst({
      where: { contentId: offer.id, action: "delete", contentType: "offer" },
      orderBy: { createdAt: "desc" },
    });

    assert(deletedOffer === null, "Expected moderation offer deletes to remove the offer.");
    if (!entry?.details) {
      fail("Expected moderation offer deletes to create an audit log entry with details.");
    }

    const details = JSON.parse(entry.details) as {
      variant?: string;
      location?: string;
      priceEur?: number;
    };

    assert(
      details.variant === variant.name,
      "Expected audit log details to include the deleted variant name.",
    );
    assert(
      details.location === location.name,
      "Expected audit log details to include the deleted location name.",
    );
    assert(
      details.priceEur === 4.8,
      "Expected audit log details to include the deleted price in EUR.",
    );
  });
}

export const routeIntegrationChecks: IntegrationCheck[] = [
  {
    name: "admin brand create duplicate maps to BRAND_NAME_CONFLICT",
    fn: testAdminBrandCreateDuplicateMapsConflict,
  },
  {
    name: "admin brand edit duplicate maps to BRAND_NAME_CONFLICT",
    fn: testAdminBrandEditDuplicateMapsConflict,
  },
  {
    name: "admin brand delete in-use maps to BRAND_IN_USE",
    fn: testAdminBrandDeleteInUseMapsConflict,
  },
  {
    name: "admin variant create duplicate maps to VARIANT_NAME_CONFLICT",
    fn: testAdminVariantCreateDuplicateMapsConflict,
  },
  {
    name: "admin variant edit duplicate maps to VARIANT_NAME_CONFLICT",
    fn: testAdminVariantEditDuplicateMapsConflict,
  },
  {
    name: "admin variant delete in-use maps to VARIANT_IN_USE",
    fn: testAdminVariantDeleteInUseMapsConflict,
  },
  {
    name: "admin style delete in-use maps to STYLE_IN_USE",
    fn: testAdminStyleDeleteInUseMapsConflict,
  },
  {
    name: "admin offer create duplicate maps to OFFER_CONFLICT",
    fn: testAdminOfferCreateDuplicateMapsConflict,
  },
  {
    name: "moderation offer edit creates an audit log entry",
    fn: testModerationOfferEditCreatesAuditLogEntry,
  },
  {
    name: "moderation offer delete creates an audit log entry",
    fn: testModerationOfferDeleteCreatesAuditLogEntry,
  },
];
