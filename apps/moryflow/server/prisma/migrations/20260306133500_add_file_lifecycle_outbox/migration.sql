-- CreateTable
CREATE TABLE "FileLifecycleOutbox" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "FileLifecycleOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FileLifecycleOutbox_processedAt_createdAt_idx" ON "FileLifecycleOutbox"("processedAt", "createdAt");

-- CreateIndex
CREATE INDEX "FileLifecycleOutbox_userId_vaultId_fileId_idx" ON "FileLifecycleOutbox"("userId", "vaultId", "fileId");
