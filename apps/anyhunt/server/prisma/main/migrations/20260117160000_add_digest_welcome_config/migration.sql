-- CreateTable
CREATE TABLE "DigestWelcomeConfig" (
    "id" TEXT NOT NULL DEFAULT 'welcome',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "titleByLocale" JSONB NOT NULL,
    "contentMarkdownByLocale" JSONB NOT NULL,
    "primaryAction" JSONB,
    "secondaryAction" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigestWelcomeConfig_pkey" PRIMARY KEY ("id")
);

