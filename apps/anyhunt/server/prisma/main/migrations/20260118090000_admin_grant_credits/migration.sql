/*
  Admin credits grant support:

  - Add QuotaTransactionType.ADMIN_GRANT for admin-issued credits (test/internal use)
  - Add QuotaTransaction.actorUserId to record the admin actor
  - Add AdminAuditLog for unified admin write-action auditing
*/

-- AlterEnum
ALTER TYPE "QuotaTransactionType" ADD VALUE IF NOT EXISTS 'ADMIN_GRANT';

-- AlterTable
ALTER TABLE "QuotaTransaction" ADD COLUMN "actorUserId" TEXT;

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAuditLog_actorUserId_idx" ON "AdminAuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetUserId_idx" ON "AdminAuditLog"("targetUserId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

