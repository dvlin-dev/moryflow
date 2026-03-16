-- CreateEnum
CREATE TYPE "RedemptionCodeType" AS ENUM ('CREDITS', 'MEMBERSHIP');

-- CreateTable
CREATE TABLE "RedemptionCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "RedemptionCodeType" NOT NULL,
    "creditsAmount" INTEGER,
    "membershipTier" "SubscriptionTier",
    "membershipDays" INTEGER,
    "maxRedemptions" INTEGER NOT NULL DEFAULT 1,
    "currentRedemptions" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedemptionCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedemptionCodeUsage" (
    "id" TEXT NOT NULL,
    "redemptionCodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "RedemptionCodeType" NOT NULL,
    "creditsAmount" INTEGER,
    "membershipTier" "SubscriptionTier",
    "membershipDays" INTEGER,

    CONSTRAINT "RedemptionCodeUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RedemptionCode_code_key" ON "RedemptionCode"("code");

-- CreateIndex
CREATE INDEX "RedemptionCode_isActive_idx" ON "RedemptionCode"("isActive");

-- CreateIndex
CREATE INDEX "RedemptionCode_createdAt_idx" ON "RedemptionCode"("createdAt");

-- CreateIndex
CREATE INDEX "RedemptionCodeUsage_userId_idx" ON "RedemptionCodeUsage"("userId");

-- CreateIndex
CREATE INDEX "RedemptionCodeUsage_redeemedAt_idx" ON "RedemptionCodeUsage"("redeemedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RedemptionCodeUsage_redemptionCodeId_userId_key" ON "RedemptionCodeUsage"("redemptionCodeId", "userId");

-- AddForeignKey
ALTER TABLE "RedemptionCodeUsage" ADD CONSTRAINT "RedemptionCodeUsage_redemptionCodeId_fkey" FOREIGN KEY ("redemptionCodeId") REFERENCES "RedemptionCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
