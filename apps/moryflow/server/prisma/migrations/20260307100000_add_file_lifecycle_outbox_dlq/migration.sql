-- AlterTable
ALTER TABLE "FileLifecycleOutbox"
ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastAttemptAt" TIMESTAMP(3),
ADD COLUMN "lastErrorCode" TEXT,
ADD COLUMN "lastErrorMessage" TEXT,
ADD COLUMN "deadLetteredAt" TIMESTAMP(3);

-- DropIndex
DROP INDEX "FileLifecycleOutbox_processedAt_createdAt_idx";

-- CreateIndex
CREATE INDEX "FileLifecycleOutbox_processedAt_deadLetteredAt_createdAt_idx"
ON "FileLifecycleOutbox"("processedAt", "deadLetteredAt", "createdAt");
