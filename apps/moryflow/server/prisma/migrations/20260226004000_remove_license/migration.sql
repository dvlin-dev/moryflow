/*
  Warnings:

  - Dropping tables `License` and `LicenseActivation` will permanently remove license records.
  - Enum values `license` are removed from `SubscriptionTier` and `ProductType`.
*/

-- 1) Drop license tables
DROP TABLE IF EXISTS "LicenseActivation";
DROP TABLE IF EXISTS "License";

-- 2) Remove obsolete license enums
DROP TYPE IF EXISTS "LicenseActivationStatus";
DROP TYPE IF EXISTS "LicenseTier";
DROP TYPE IF EXISTS "LicenseStatus";

-- 3) Rebuild SubscriptionTier enum without `license`
ALTER TYPE "SubscriptionTier" RENAME TO "SubscriptionTier_old";
CREATE TYPE "SubscriptionTier" AS ENUM ('free', 'starter', 'basic', 'pro');

ALTER TABLE "Subscription"
  ALTER COLUMN "tier" DROP DEFAULT,
  ALTER COLUMN "tier" TYPE "SubscriptionTier"
  USING (
    CASE
      WHEN "tier"::text = 'license' THEN 'pro'
      ELSE "tier"::text
    END
  )::"SubscriptionTier",
  ALTER COLUMN "tier" SET DEFAULT 'free';

ALTER TABLE "AiModel"
  ALTER COLUMN "minTier" TYPE "SubscriptionTier"
  USING (
    CASE
      WHEN "minTier"::text = 'license' THEN 'pro'
      ELSE "minTier"::text
    END
  )::"SubscriptionTier";

DO $$
BEGIN
  -- 历史库可能还存在 User.subscriptionTier，按新枚举兼容转换后再删除旧 type
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
      AND column_name = 'subscriptionTier'
  ) THEN
    EXECUTE 'ALTER TABLE "User" ALTER COLUMN "subscriptionTier" DROP DEFAULT';
    EXECUTE '
      ALTER TABLE "User"
      ALTER COLUMN "subscriptionTier" TYPE "SubscriptionTier"
      USING (
        CASE
          WHEN "subscriptionTier"::text = ''license'' THEN ''pro''
          ELSE "subscriptionTier"::text
        END
      )::"SubscriptionTier"
    ';
    EXECUTE 'ALTER TABLE "User" ALTER COLUMN "subscriptionTier" SET DEFAULT ''free''';
  END IF;
END $$;

DROP TYPE "SubscriptionTier_old";

-- 4) Rebuild ProductType enum without `license`
ALTER TYPE "ProductType" RENAME TO "ProductType_old";
CREATE TYPE "ProductType" AS ENUM ('subscription', 'credits');

ALTER TABLE "PaymentOrder"
  ALTER COLUMN "productType" TYPE "ProductType"
  USING (
    CASE
      WHEN "productType"::text = 'license' THEN 'credits'
      ELSE "productType"::text
    END
  )::"ProductType";

DROP TYPE "ProductType_old";
