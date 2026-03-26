-- CreateEnum
CREATE TYPE "CreditLedgerEventType" AS ENUM (
    'AI_CHAT',
    'AI_IMAGE',
    'SUBSCRIPTION_GRANT',
    'PURCHASED_GRANT',
    'REDEMPTION_GRANT',
    'ADMIN_GRANT'
);

-- CreateEnum
CREATE TYPE "CreditLedgerDirection" AS ENUM ('DEBIT', 'CREDIT', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "CreditLedgerStatus" AS ENUM ('APPLIED', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "CreditBucketType" AS ENUM ('DAILY', 'SUBSCRIPTION', 'PURCHASED', 'DEBT');

-- CreateEnum
CREATE TYPE "CreditLedgerAnomalyCode" AS ENUM (
    'ZERO_USAGE',
    'USAGE_MISSING',
    'ZERO_PRICE_CONFIG',
    'ZERO_CREDITS_WITH_USAGE',
    'SETTLEMENT_FAILED'
);

-- CreateTable
CREATE TABLE "CreditLedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "CreditLedgerEventType" NOT NULL,
    "direction" "CreditLedgerDirection" NOT NULL,
    "status" "CreditLedgerStatus" NOT NULL,
    "anomalyCode" "CreditLedgerAnomalyCode",
    "creditsDelta" INTEGER NOT NULL,
    "computedCredits" INTEGER NOT NULL,
    "appliedCredits" INTEGER NOT NULL,
    "debtDelta" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT NOT NULL,
    "detailsJson" JSONB,
    "errorMessage" TEXT,
    "requestId" TEXT,
    "chatId" TEXT,
    "runId" TEXT,
    "idempotencyKey" TEXT,
    "modelId" TEXT,
    "providerId" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "inputPriceSnapshot" DOUBLE PRECISION,
    "outputPriceSnapshot" DOUBLE PRECISION,
    "creditsPerDollarSnapshot" DOUBLE PRECISION,
    "profitMultiplierSnapshot" DOUBLE PRECISION,
    "costUsd" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditLedgerAllocation" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "bucketType" "CreditBucketType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "sourcePurchasedCreditsId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditLedgerAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditLedgerEntry_idempotencyKey_key" ON "CreditLedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CreditLedgerEntry_userId_createdAt_idx" ON "CreditLedgerEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditLedgerEntry_eventType_createdAt_idx" ON "CreditLedgerEntry"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "CreditLedgerEntry_status_createdAt_idx" ON "CreditLedgerEntry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CreditLedgerEntry_anomalyCode_createdAt_idx" ON "CreditLedgerEntry"("anomalyCode", "createdAt");

-- CreateIndex
CREATE INDEX "CreditLedgerAllocation_entryId_idx" ON "CreditLedgerAllocation"("entryId");

-- CreateIndex
CREATE INDEX "CreditLedgerAllocation_bucketType_createdAt_idx" ON "CreditLedgerAllocation"("bucketType", "createdAt");

-- AddForeignKey
ALTER TABLE "CreditLedgerEntry" ADD CONSTRAINT "CreditLedgerEntry_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLedgerAllocation" ADD CONSTRAINT "CreditLedgerAllocation_entryId_fkey"
FOREIGN KEY ("entryId") REFERENCES "CreditLedgerEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLedgerAllocation" ADD CONSTRAINT "CreditLedgerAllocation_sourcePurchasedCreditsId_fkey"
FOREIGN KEY ("sourcePurchasedCreditsId") REFERENCES "PurchasedCredits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
