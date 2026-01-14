-- AlterTable: Add featured fields to DigestTopic
ALTER TABLE "DigestTopic" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DigestTopic" ADD COLUMN "featuredOrder" INTEGER;
ALTER TABLE "DigestTopic" ADD COLUMN "featuredAt" TIMESTAMP(3);
ALTER TABLE "DigestTopic" ADD COLUMN "featuredByUserId" TEXT;

-- CreateIndex
CREATE INDEX "DigestTopic_featured_featuredOrder_idx" ON "DigestTopic"("featured", "featuredOrder");

-- AddForeignKey
ALTER TABLE "DigestTopic" ADD CONSTRAINT "DigestTopic_featuredByUserId_fkey" FOREIGN KEY ("featuredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
