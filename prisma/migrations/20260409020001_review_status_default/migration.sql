-- AlterTable: change default status for new reviews to 'new'
-- Runs in a separate transaction after 'new' has been committed to the enum.
ALTER TABLE "Review" ALTER COLUMN "status" SET DEFAULT 'new';
