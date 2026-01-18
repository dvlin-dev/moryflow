/*
  Warnings:

  - This migration is NOT backward compatible. It removes the single-Markdown welcome fields
    from DigestWelcomeConfig and introduces DigestWelcomePage as a multi-page welcome system.
*/

-- AlterTable
ALTER TABLE "DigestWelcomeConfig"
DROP COLUMN "titleByLocale",
DROP COLUMN "contentMarkdownByLocale",
ADD COLUMN "defaultSlug" TEXT NOT NULL DEFAULT 'welcome';

-- CreateTable
CREATE TABLE "DigestWelcomePage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "titleByLocale" JSONB NOT NULL,
    "contentMarkdownByLocale" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigestWelcomePage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DigestWelcomePage_slug_key" ON "DigestWelcomePage"("slug");

-- CreateIndex
CREATE INDEX "DigestWelcomePage_enabled_sortOrder_idx" ON "DigestWelcomePage"("enabled", "sortOrder");

