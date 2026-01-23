-- AlterTable
ALTER TABLE "QuotaTransaction" ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "referenceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "QuotaTransaction_userId_type_referenceId_key" ON "QuotaTransaction"("userId", "type", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "QuotaTransaction_orderId_key" ON "QuotaTransaction"("orderId");
