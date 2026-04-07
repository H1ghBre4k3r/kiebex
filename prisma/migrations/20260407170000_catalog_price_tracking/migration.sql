-- AlterTable
ALTER TABLE "BeerOffer" ADD COLUMN "variantId" TEXT;

-- CreateTable
CREATE TABLE "BeerStyle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BeerStyle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BeerBrand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'approved',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BeerBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BeerVariant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'approved',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BeerVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceUpdateProposal" (
    "id" TEXT NOT NULL,
    "beerOfferId" TEXT NOT NULL,
    "proposedPriceCents" INTEGER NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'pending',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceUpdateProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferPriceHistory" (
    "id" TEXT NOT NULL,
    "beerOfferId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priceUpdateProposalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BeerStyle_name_key" ON "BeerStyle"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BeerBrand_name_key" ON "BeerBrand"("name");

-- CreateIndex
CREATE INDEX "BeerBrand_status_idx" ON "BeerBrand"("status");

-- CreateIndex
CREATE INDEX "BeerBrand_createdById_idx" ON "BeerBrand"("createdById");

-- CreateIndex
CREATE INDEX "BeerVariant_status_idx" ON "BeerVariant"("status");

-- CreateIndex
CREATE INDEX "BeerVariant_brandId_idx" ON "BeerVariant"("brandId");

-- CreateIndex
CREATE INDEX "BeerVariant_styleId_idx" ON "BeerVariant"("styleId");

-- CreateIndex
CREATE INDEX "BeerVariant_createdById_idx" ON "BeerVariant"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "BeerVariant_brandId_name_key" ON "BeerVariant"("brandId", "name");

-- CreateIndex
CREATE INDEX "PriceUpdateProposal_beerOfferId_idx" ON "PriceUpdateProposal"("beerOfferId");

-- CreateIndex
CREATE INDEX "PriceUpdateProposal_status_idx" ON "PriceUpdateProposal"("status");

-- CreateIndex
CREATE INDEX "PriceUpdateProposal_createdById_idx" ON "PriceUpdateProposal"("createdById");

-- CreateIndex
CREATE INDEX "OfferPriceHistory_beerOfferId_effectiveAt_idx" ON "OfferPriceHistory"("beerOfferId", "effectiveAt");

-- CreateIndex
CREATE INDEX "OfferPriceHistory_priceUpdateProposalId_idx" ON "OfferPriceHistory"("priceUpdateProposalId");

-- CreateIndex
CREATE INDEX "BeerOffer_variantId_idx" ON "BeerOffer"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "BeerOffer_locationId_variantId_sizeMl_serving_key" ON "BeerOffer"("locationId", "variantId", "sizeMl", "serving");

-- Data Backfill: styles and brands from existing offers
INSERT INTO "BeerStyle" ("id", "name", "createdAt", "updatedAt")
SELECT
  CONCAT('style-', lower(regexp_replace(bo."variant", '[^a-zA-Z0-9]+', '-', 'g'))),
  bo."variant",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "variant"
  FROM "BeerOffer"
) bo;

INSERT INTO "BeerBrand" ("id", "name", "status", "createdAt", "updatedAt")
SELECT
  CONCAT('brand-', lower(regexp_replace(bo."brand", '[^a-zA-Z0-9]+', '-', 'g'))),
  bo."brand",
  'approved',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "brand"
  FROM "BeerOffer"
) bo;

INSERT INTO "BeerVariant" ("id", "name", "brandId", "styleId", "status", "createdAt", "updatedAt")
SELECT
  CONCAT('variant-', lower(regexp_replace(bo."brand", '[^a-zA-Z0-9]+', '-', 'g')), '-', lower(regexp_replace(bo."variant", '[^a-zA-Z0-9]+', '-', 'g'))),
  bo."variant",
  CONCAT('brand-', lower(regexp_replace(bo."brand", '[^a-zA-Z0-9]+', '-', 'g'))),
  CONCAT('style-', lower(regexp_replace(bo."variant", '[^a-zA-Z0-9]+', '-', 'g'))),
  'approved',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "brand", "variant"
  FROM "BeerOffer"
) bo;

UPDATE "BeerOffer"
SET "variantId" = CONCAT('variant-', lower(regexp_replace("brand", '[^a-zA-Z0-9]+', '-', 'g')), '-', lower(regexp_replace("variant", '[^a-zA-Z0-9]+', '-', 'g')));

ALTER TABLE "BeerOffer" ALTER COLUMN "variantId" SET NOT NULL;

INSERT INTO "OfferPriceHistory" ("id", "beerOfferId", "priceCents", "effectiveAt", "createdAt")
SELECT
  CONCAT('price-history-', bo."id"),
  bo."id",
  bo."priceCents",
  bo."createdAt",
  CURRENT_TIMESTAMP
FROM "BeerOffer" bo;

-- AddForeignKey
ALTER TABLE "BeerBrand" ADD CONSTRAINT "BeerBrand_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeerVariant" ADD CONSTRAINT "BeerVariant_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "BeerBrand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeerVariant" ADD CONSTRAINT "BeerVariant_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "BeerStyle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeerVariant" ADD CONSTRAINT "BeerVariant_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeerOffer" ADD CONSTRAINT "BeerOffer_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "BeerVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceUpdateProposal" ADD CONSTRAINT "PriceUpdateProposal_beerOfferId_fkey" FOREIGN KEY ("beerOfferId") REFERENCES "BeerOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceUpdateProposal" ADD CONSTRAINT "PriceUpdateProposal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferPriceHistory" ADD CONSTRAINT "OfferPriceHistory_beerOfferId_fkey" FOREIGN KEY ("beerOfferId") REFERENCES "BeerOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferPriceHistory" ADD CONSTRAINT "OfferPriceHistory_priceUpdateProposalId_fkey" FOREIGN KEY ("priceUpdateProposalId") REFERENCES "PriceUpdateProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
