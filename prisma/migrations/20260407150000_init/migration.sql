-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'moderator', 'admin');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('pub', 'bar', 'restaurant', 'supermarket');

-- CreateEnum
CREATE TYPE "ServingType" AS ENUM ('tap', 'bottle', 'can');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locationType" "LocationType" NOT NULL,
    "district" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BeerOffer" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "sizeMl" INTEGER NOT NULL,
    "serving" "ServingType" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BeerOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Location_locationType_idx" ON "Location"("locationType");

-- CreateIndex
CREATE INDEX "Location_district_idx" ON "Location"("district");

-- CreateIndex
CREATE INDEX "BeerOffer_brand_idx" ON "BeerOffer"("brand");

-- CreateIndex
CREATE INDEX "BeerOffer_variant_idx" ON "BeerOffer"("variant");

-- CreateIndex
CREATE INDEX "BeerOffer_sizeMl_idx" ON "BeerOffer"("sizeMl");

-- CreateIndex
CREATE INDEX "BeerOffer_serving_idx" ON "BeerOffer"("serving");

-- CreateIndex
CREATE INDEX "BeerOffer_locationId_idx" ON "BeerOffer"("locationId");

-- CreateIndex
CREATE INDEX "BeerOffer_priceCents_idx" ON "BeerOffer"("priceCents");

-- CreateIndex
CREATE UNIQUE INDEX "BeerOffer_locationId_brand_variant_sizeMl_serving_key" ON "BeerOffer"("locationId", "brand", "variant", "sizeMl", "serving");

-- CreateIndex
CREATE INDEX "Review_locationId_idx" ON "Review"("locationId");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE INDEX "Review_status_idx" ON "Review"("status");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeerOffer" ADD CONSTRAINT "BeerOffer_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
