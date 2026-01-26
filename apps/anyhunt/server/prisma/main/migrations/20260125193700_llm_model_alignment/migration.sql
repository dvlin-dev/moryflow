/*
  Warnings:

  - Added the required column `capabilitiesJson` to the `LlmModel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `displayName` to the `LlmModel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inputTokenPrice` to the `LlmModel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxContextTokens` to the `LlmModel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxOutputTokens` to the `LlmModel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `minTier` to the `LlmModel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `outputTokenPrice` to the `LlmModel` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LlmModel" ADD COLUMN     "capabilitiesJson" JSONB NOT NULL,
ADD COLUMN     "displayName" TEXT NOT NULL,
ADD COLUMN     "inputTokenPrice" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "maxContextTokens" INTEGER NOT NULL,
ADD COLUMN     "maxOutputTokens" INTEGER NOT NULL,
ADD COLUMN     "minTier" "SubscriptionTier" NOT NULL,
ADD COLUMN     "outputTokenPrice" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;
