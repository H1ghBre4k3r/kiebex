-- AlterEnum: add 'new' value to ReviewStatus
-- This must be its own committed transaction before the new value can be used
-- anywhere else (PostgreSQL constraint on enum additions).
ALTER TYPE "ReviewStatus" ADD VALUE IF NOT EXISTS 'new';
