-- CreateTable
CREATE TABLE "ModerationAuditLog" (
    "id" TEXT NOT NULL,
    "moderatorId" TEXT,
    "moderatorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModerationAuditLog_createdAt_idx" ON "ModerationAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ModerationAuditLog_moderatorId_idx" ON "ModerationAuditLog"("moderatorId");

-- CreateIndex
CREATE INDEX "ModerationAuditLog_contentType_contentId_idx" ON "ModerationAuditLog"("contentType", "contentId");

-- AddForeignKey
ALTER TABLE "ModerationAuditLog" ADD CONSTRAINT "ModerationAuditLog_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
