-- CreateEnum
CREATE TYPE "LocaleMode" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "DigestTone" AS ENUM ('neutral', 'opinionated', 'concise');

-- CreateEnum
CREATE TYPE "DigestLanguageMode" AS ENUM ('FOLLOW_UI', 'FIXED');

-- CreateEnum
CREATE TYPE "RedeliveryPolicy" AS ENUM ('NEVER', 'COOLDOWN', 'ON_CONTENT_UPDATE');

-- CreateEnum
CREATE TYPE "DigestSourceType" AS ENUM ('search', 'rss', 'siteCrawl');

-- CreateEnum
CREATE TYPE "DigestSourceRefreshMode" AS ENUM ('ON_RUN', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "DigestRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "DigestRunSource" AS ENUM ('SCHEDULED', 'MANUAL');

-- CreateEnum
CREATE TYPE "DigestTopicVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'UNLISTED');

-- CreateEnum
CREATE TYPE "DigestTopicStatus" AS ENUM ('ACTIVE', 'PAUSED_INSUFFICIENT_CREDITS', 'PAUSED_BY_ADMIN');

-- CreateEnum
CREATE TYPE "DigestTopicEditionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "uiLocale" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "localeMode" "LocaleMode" NOT NULL DEFAULT 'AUTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigestSource" (
    "id" TEXT NOT NULL,
    "type" "DigestSourceType" NOT NULL,
    "refreshMode" "DigestSourceRefreshMode" NOT NULL,
    "config" JSONB NOT NULL,
    "configHash" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "refreshCron" TEXT,
    "timezone" TEXT,
    "nextRefreshAt" TIMESTAMP(3),
    "lastRefreshAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigestSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigestSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "interests" TEXT[],
    "searchLimit" INTEGER NOT NULL DEFAULT 60,
    "scrapeLimit" INTEGER NOT NULL DEFAULT 20,
    "minItems" INTEGER NOT NULL DEFAULT 5,
    "minScore" INTEGER NOT NULL DEFAULT 70,
    "contentWindowHours" INTEGER NOT NULL DEFAULT 168,
    "redeliveryPolicy" "RedeliveryPolicy" NOT NULL DEFAULT 'COOLDOWN',
    "redeliveryCooldownDays" INTEGER NOT NULL DEFAULT 7,
    "followedTopicId" TEXT,
    "cron" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "languageMode" "DigestLanguageMode" NOT NULL DEFAULT 'FOLLOW_UI',
    "outputLocale" TEXT,
    "inboxEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailTo" TEXT,
    "emailSubjectTemplate" TEXT,
    "webhookUrl" TEXT,
    "webhookEnabled" BOOLEAN NOT NULL DEFAULT false,
    "generateItemSummaries" BOOLEAN NOT NULL DEFAULT true,
    "composeNarrative" BOOLEAN NOT NULL DEFAULT true,
    "tone" "DigestTone" NOT NULL DEFAULT 'neutral',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DigestSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigestSubscriptionSource" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "weight" INTEGER,
    "overrideMinScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigestSubscriptionSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "canonicalUrl" TEXT NOT NULL,
    "canonicalUrlHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "author" TEXT,
    "publishedAt" TIMESTAMP(3),
    "language" TEXT,
    "siteName" TEXT,
    "favicon" TEXT,
    "contentHash" TEXT,
    "scoreImpact" INTEGER NOT NULL DEFAULT 50,
    "scoreQuality" INTEGER NOT NULL DEFAULT 50,
    "scoreUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAnalyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItemEnrichment" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "canonicalUrlHash" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "aiSummary" TEXT NOT NULL,
    "aiTags" TEXT[],
    "contentType" TEXT,
    "keyEntities" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentItemEnrichment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigestRun" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "DigestRunStatus" NOT NULL DEFAULT 'PENDING',
    "source" "DigestRunSource" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "outputLocale" TEXT NOT NULL DEFAULT 'en',
    "narrativeMarkdown" TEXT,
    "emailSubject" TEXT,
    "billing" JSONB NOT NULL,
    "quotaTransactionId" TEXT,
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigestRunItem" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "canonicalUrlHash" TEXT NOT NULL,
    "scoreRelevance" INTEGER NOT NULL DEFAULT 50,
    "scoreOverall" INTEGER NOT NULL DEFAULT 50,
    "scoringReason" TEXT,
    "rank" INTEGER NOT NULL,
    "titleSnapshot" TEXT NOT NULL,
    "urlSnapshot" TEXT NOT NULL,
    "aiSummarySnapshot" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigestRunItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserContentState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canonicalUrlHash" TEXT NOT NULL,
    "firstDeliveredAt" TIMESTAMP(3),
    "lastDeliveredAt" TIMESTAMP(3),
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "lastOpenedAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "savedAt" TIMESTAMP(3),
    "notInterestedAt" TIMESTAMP(3),
    "lastDeliveredContentHash" TEXT,
    "lastDeliveredRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserContentState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigestTopic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "DigestTopicVisibility" NOT NULL DEFAULT 'PUBLIC',
    "status" "DigestTopicStatus" NOT NULL DEFAULT 'ACTIVE',
    "sourceSubscriptionId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "interests" TEXT[],
    "searchLimit" INTEGER NOT NULL DEFAULT 60,
    "scrapeLimit" INTEGER NOT NULL DEFAULT 20,
    "minItems" INTEGER NOT NULL DEFAULT 5,
    "minScore" INTEGER NOT NULL DEFAULT 70,
    "redeliveryPolicy" "RedeliveryPolicy" NOT NULL DEFAULT 'COOLDOWN',
    "redeliveryCooldownDays" INTEGER NOT NULL DEFAULT 7,
    "cron" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "subscriberCount" INTEGER NOT NULL DEFAULT 0,
    "lastEditionAt" TIMESTAMP(3),
    "nextEditionAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "unlistedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "pauseReason" TEXT,

    CONSTRAINT "DigestTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigestTopicEdition" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "status" "DigestTopicEditionStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "narrativeMarkdown" TEXT,
    "outputLocale" TEXT NOT NULL DEFAULT 'en',
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigestTopicEdition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigestTopicEditionItem" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "canonicalUrlHash" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "scoreOverall" INTEGER NOT NULL DEFAULT 50,
    "titleSnapshot" TEXT NOT NULL,
    "urlSnapshot" TEXT NOT NULL,
    "aiSummarySnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigestTopicEditionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE INDEX "DigestSource_refreshMode_enabled_idx" ON "DigestSource"("refreshMode", "enabled");

-- CreateIndex
CREATE INDEX "DigestSource_nextRefreshAt_idx" ON "DigestSource"("nextRefreshAt");

-- CreateIndex
CREATE UNIQUE INDEX "DigestSource_type_configHash_key" ON "DigestSource"("type", "configHash");

-- CreateIndex
CREATE INDEX "DigestSubscription_userId_idx" ON "DigestSubscription"("userId");

-- CreateIndex
CREATE INDEX "DigestSubscription_enabled_nextRunAt_idx" ON "DigestSubscription"("enabled", "nextRunAt");

-- CreateIndex
CREATE INDEX "DigestSubscription_followedTopicId_idx" ON "DigestSubscription"("followedTopicId");

-- CreateIndex
CREATE INDEX "DigestSubscriptionSource_sourceId_idx" ON "DigestSubscriptionSource"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "DigestSubscriptionSource_subscriptionId_sourceId_key" ON "DigestSubscriptionSource"("subscriptionId", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentItem_canonicalUrlHash_key" ON "ContentItem"("canonicalUrlHash");

-- CreateIndex
CREATE INDEX "ContentItem_publishedAt_idx" ON "ContentItem"("publishedAt");

-- CreateIndex
CREATE INDEX "ContentItem_scoreImpact_scoreQuality_idx" ON "ContentItem"("scoreImpact", "scoreQuality");

-- CreateIndex
CREATE INDEX "ContentItem_firstSeenAt_idx" ON "ContentItem"("firstSeenAt");

-- CreateIndex
CREATE INDEX "ContentItemEnrichment_contentId_locale_idx" ON "ContentItemEnrichment"("contentId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "ContentItemEnrichment_canonicalUrlHash_locale_promptVersion_key" ON "ContentItemEnrichment"("canonicalUrlHash", "locale", "promptVersion");

-- CreateIndex
CREATE INDEX "DigestRun_subscriptionId_idx" ON "DigestRun"("subscriptionId");

-- CreateIndex
CREATE INDEX "DigestRun_userId_idx" ON "DigestRun"("userId");

-- CreateIndex
CREATE INDEX "DigestRun_status_idx" ON "DigestRun"("status");

-- CreateIndex
CREATE INDEX "DigestRun_scheduledAt_idx" ON "DigestRun"("scheduledAt");

-- CreateIndex
CREATE INDEX "DigestRunItem_runId_rank_idx" ON "DigestRunItem"("runId", "rank");

-- CreateIndex
CREATE INDEX "DigestRunItem_userId_deliveredAt_idx" ON "DigestRunItem"("userId", "deliveredAt");

-- CreateIndex
CREATE INDEX "DigestRunItem_contentId_idx" ON "DigestRunItem"("contentId");

-- CreateIndex
CREATE INDEX "UserContentState_userId_lastDeliveredAt_idx" ON "UserContentState"("userId", "lastDeliveredAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserContentState_userId_canonicalUrlHash_key" ON "UserContentState"("userId", "canonicalUrlHash");

-- CreateIndex
CREATE UNIQUE INDEX "DigestTopic_slug_key" ON "DigestTopic"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "DigestTopic_sourceSubscriptionId_key" ON "DigestTopic"("sourceSubscriptionId");

-- CreateIndex
CREATE INDEX "DigestTopic_visibility_status_idx" ON "DigestTopic"("visibility", "status");

-- CreateIndex
CREATE INDEX "DigestTopic_subscriberCount_idx" ON "DigestTopic"("subscriberCount");

-- CreateIndex
CREATE INDEX "DigestTopic_nextEditionAt_idx" ON "DigestTopic"("nextEditionAt");

-- CreateIndex
CREATE INDEX "DigestTopic_createdByUserId_idx" ON "DigestTopic"("createdByUserId");

-- CreateIndex
CREATE INDEX "DigestTopicEdition_topicId_scheduledAt_idx" ON "DigestTopicEdition"("topicId", "scheduledAt");

-- CreateIndex
CREATE INDEX "DigestTopicEdition_status_idx" ON "DigestTopicEdition"("status");

-- CreateIndex
CREATE INDEX "DigestTopicEditionItem_editionId_rank_idx" ON "DigestTopicEditionItem"("editionId", "rank");

-- CreateIndex
CREATE INDEX "DigestTopicEditionItem_topicId_createdAt_idx" ON "DigestTopicEditionItem"("topicId", "createdAt");

-- CreateIndex
CREATE INDEX "DigestTopicEditionItem_contentId_idx" ON "DigestTopicEditionItem"("contentId");

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestSubscription" ADD CONSTRAINT "DigestSubscription_followedTopicId_fkey" FOREIGN KEY ("followedTopicId") REFERENCES "DigestTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestSubscription" ADD CONSTRAINT "DigestSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestSubscriptionSource" ADD CONSTRAINT "DigestSubscriptionSource_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "DigestSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestSubscriptionSource" ADD CONSTRAINT "DigestSubscriptionSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DigestSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItemEnrichment" ADD CONSTRAINT "ContentItemEnrichment_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestRun" ADD CONSTRAINT "DigestRun_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "DigestSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestRun" ADD CONSTRAINT "DigestRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestRunItem" ADD CONSTRAINT "DigestRunItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "DigestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestRunItem" ADD CONSTRAINT "DigestRunItem_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "DigestSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestRunItem" ADD CONSTRAINT "DigestRunItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestRunItem" ADD CONSTRAINT "DigestRunItem_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContentState" ADD CONSTRAINT "UserContentState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContentState" ADD CONSTRAINT "UserContentState_canonicalUrlHash_fkey" FOREIGN KEY ("canonicalUrlHash") REFERENCES "ContentItem"("canonicalUrlHash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestTopic" ADD CONSTRAINT "DigestTopic_sourceSubscriptionId_fkey" FOREIGN KEY ("sourceSubscriptionId") REFERENCES "DigestSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestTopic" ADD CONSTRAINT "DigestTopic_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestTopicEdition" ADD CONSTRAINT "DigestTopicEdition_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "DigestTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestTopicEditionItem" ADD CONSTRAINT "DigestTopicEditionItem_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "DigestTopicEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestTopicEditionItem" ADD CONSTRAINT "DigestTopicEditionItem_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
