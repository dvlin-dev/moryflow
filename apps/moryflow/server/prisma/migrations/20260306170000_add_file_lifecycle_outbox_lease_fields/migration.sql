ALTER TABLE "FileLifecycleOutbox"
ADD COLUMN "leasedBy" TEXT,
ADD COLUMN "leaseExpiresAt" TIMESTAMP(3);

CREATE INDEX "FileLifecycleOutbox_leasedBy_leaseExpiresAt_idx"
ON "FileLifecycleOutbox"("leasedBy", "leaseExpiresAt");
