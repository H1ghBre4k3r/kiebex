-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "BeerOffer" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "status" "SubmissionStatus" NOT NULL DEFAULT 'approved';

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "status" "SubmissionStatus" NOT NULL DEFAULT 'approved';

-- CreateIndex
CREATE INDEX "BeerOffer_status_idx" ON "BeerOffer"("status");

-- CreateIndex
CREATE INDEX "BeerOffer_createdById_idx" ON "BeerOffer"("createdById");

-- CreateIndex
CREATE INDEX "Location_status_idx" ON "Location"("status");

-- AddForeignKey
ALTER TABLE "BeerOffer" ADD CONSTRAINT "BeerOffer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
