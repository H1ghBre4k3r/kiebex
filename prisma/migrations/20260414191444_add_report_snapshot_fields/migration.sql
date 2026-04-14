-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "snapshotAuthorId" TEXT,
ADD COLUMN     "snapshotAuthorName" TEXT,
ADD COLUMN     "snapshotBody" TEXT,
ADD COLUMN     "snapshotRating" INTEGER,
ADD COLUMN     "snapshotTitle" TEXT;
