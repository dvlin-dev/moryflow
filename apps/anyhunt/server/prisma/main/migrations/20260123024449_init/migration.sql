-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'BASIC', 'PRO', 'TEAM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'PAST_DUE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "QuotaTransactionType" AS ENUM ('DEDUCT', 'REFUND', 'PURCHASE', 'ADMIN_GRANT', 'RESET');

-- CreateEnum
CREATE TYPE "QuotaSource" AS ENUM ('DAILY', 'MONTHLY', 'PURCHASED');

-- CreateEnum
CREATE TYPE "ScreenshotStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ScrapeStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AgentTaskStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ScrapeErrorCode" AS ENUM ('PAGE_TIMEOUT', 'URL_NOT_ALLOWED', 'SELECTOR_NOT_FOUND', 'BROWSER_ERROR', 'NETWORK_ERROR', 'RATE_LIMITED', 'QUOTA_EXCEEDED', 'INVALID_URL', 'PAGE_NOT_FOUND', 'ACCESS_DENIED', 'STORAGE_ERROR');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CrawlStatus" AS ENUM ('PENDING', 'CRAWLING', 'COMPLETED', 'FAILED', 'CANCELLED');

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

-- CreateEnum
CREATE TYPE "DigestFeedbackTermType" AS ENUM ('KEYWORD', 'DOMAIN', 'AUTHOR');

-- CreateEnum
CREATE TYPE "DigestTopicReportReason" AS ENUM ('SPAM', 'COPYRIGHT', 'INAPPROPRIATE', 'MISLEADING', 'OTHER');

-- CreateEnum
CREATE TYPE "DigestTopicReportStatus" AS ENUM ('PENDING', 'RESOLVED_VALID', 'RESOLVED_INVALID', 'DISMISSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedById" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jwks" (
    "id" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Jwks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "creemCustomerId" TEXT,
    "creemSubscriptionId" TEXT,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quota" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthlyLimit" INTEGER NOT NULL DEFAULT 100,
    "monthlyUsed" INTEGER NOT NULL DEFAULT 0,
    "periodStartAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodEndAt" TIMESTAMP(3) NOT NULL,
    "purchasedQuota" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotaTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "type" "QuotaTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" "QuotaSource" NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotaTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creemOrderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "quotaAmount" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmProvider" (
    "id" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT NOT NULL,
    "baseUrl" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LlmProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmModel" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "upstreamId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LlmModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "defaultAgentModelId" TEXT NOT NULL,
    "defaultExtractModelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LlmSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Screenshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "url" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "request" JSONB NOT NULL,
    "quotaDeducted" BOOLEAN NOT NULL DEFAULT false,
    "quotaSource" "QuotaSource",
    "status" "ScreenshotStatus" NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "fileExpiresAt" TIMESTAMP(3),
    "error" TEXT,
    "pageTitle" TEXT,
    "pageDesc" TEXT,
    "pageFavicon" TEXT,
    "processingMs" INTEGER,
    "fromCache" BOOLEAN NOT NULL DEFAULT false,
    "queueWaitMs" INTEGER,
    "pageLoadMs" INTEGER,
    "captureMs" INTEGER,
    "imageProcessMs" INTEGER,
    "uploadMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Screenshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[] DEFAULT ARRAY['screenshot.completed', 'screenshot.failed']::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "statusCode" INTEGER,
    "response" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountDeletionRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "feedback" TEXT,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountDeletionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "url" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "status" "ScrapeStatus" NOT NULL DEFAULT 'PENDING',
    "options" JSONB NOT NULL,
    "result" JSONB,
    "screenshotUrl" TEXT,
    "screenshotBase64" TEXT,
    "screenshotWidth" INTEGER,
    "screenshotHeight" INTEGER,
    "screenshotFileSize" INTEGER,
    "screenshotFormat" TEXT,
    "screenshotExpiresAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "pdfFileSize" INTEGER,
    "pdfPageCount" INTEGER,
    "pdfExpiresAt" TIMESTAMP(3),
    "error" TEXT,
    "errorCode" "ScrapeErrorCode",
    "queueWaitMs" INTEGER,
    "fetchMs" INTEGER,
    "renderMs" INTEGER,
    "transformMs" INTEGER,
    "screenshotMs" INTEGER,
    "pdfMs" INTEGER,
    "imageProcessMs" INTEGER,
    "uploadMs" INTEGER,
    "totalMs" INTEGER,
    "fromCache" BOOLEAN NOT NULL DEFAULT false,
    "quotaDeducted" BOOLEAN NOT NULL DEFAULT false,
    "quotaSource" "QuotaSource",
    "quotaAmount" INTEGER,
    "quotaTransactionId" TEXT,
    "quotaBreakdown" JSONB,
    "billingKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ScrapeJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchScrapeJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'PENDING',
    "totalUrls" INTEGER NOT NULL,
    "completedUrls" INTEGER NOT NULL DEFAULT 0,
    "failedUrls" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB NOT NULL,
    "webhookUrl" TEXT,
    "quotaDeducted" BOOLEAN NOT NULL DEFAULT false,
    "quotaSource" "QuotaSource",
    "quotaAmount" INTEGER,
    "quotaTransactionId" TEXT,
    "quotaBreakdown" JSONB,
    "billingKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BatchScrapeJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchScrapeItem" (
    "id" TEXT NOT NULL,
    "batchJobId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "status" "ScrapeStatus" NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "error" TEXT,
    "errorCode" "ScrapeErrorCode",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BatchScrapeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startUrl" TEXT NOT NULL,
    "status" "CrawlStatus" NOT NULL DEFAULT 'PENDING',
    "options" JSONB NOT NULL,
    "totalUrls" INTEGER NOT NULL DEFAULT 0,
    "completedUrls" INTEGER NOT NULL DEFAULT 0,
    "failedUrls" INTEGER NOT NULL DEFAULT 0,
    "webhookUrl" TEXT,
    "quotaDeducted" BOOLEAN NOT NULL DEFAULT false,
    "quotaSource" "QuotaSource",
    "quotaAmount" INTEGER,
    "quotaTransactionId" TEXT,
    "quotaBreakdown" JSONB,
    "billingKey" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrawlJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlPage" (
    "id" TEXT NOT NULL,
    "crawlJobId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "depth" INTEGER NOT NULL,
    "status" "ScrapeStatus" NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CrawlPage_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "DigestWelcomeConfig" (
    "id" TEXT NOT NULL DEFAULT 'welcome',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultSlug" TEXT NOT NULL DEFAULT 'welcome',
    "primaryAction" JSONB,
    "secondaryAction" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigestWelcomeConfig_pkey" PRIMARY KEY ("id")
);

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
    "negativeInterests" TEXT[],
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
    "webhookSecret" TEXT,
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
CREATE TABLE "DigestFeedbackPattern" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "patternType" "DigestFeedbackTermType" NOT NULL,
    "value" TEXT NOT NULL,
    "positiveCount" INTEGER NOT NULL DEFAULT 0,
    "negativeCount" INTEGER NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "lastContentUrl" TEXT,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigestFeedbackPattern_pkey" PRIMARY KEY ("id")
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
    "emailDeliveredAt" TIMESTAMP(3),
    "emailError" TEXT,
    "webhookDeliveredAt" TIMESTAMP(3),
    "webhookError" TEXT,
    "webhookStatusCode" INTEGER,
    "webhookLatencyMs" INTEGER,
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
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "featuredOrder" INTEGER,
    "featuredAt" TIMESTAMP(3),
    "featuredByUserId" TEXT,

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

-- CreateTable
CREATE TABLE "DigestTopicReport" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "reporterUserId" TEXT,
    "reporterIp" TEXT,
    "reason" "DigestTopicReportReason" NOT NULL,
    "description" TEXT,
    "status" "DigestTopicReportStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolveNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigestTopicReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigestUserDailyOps" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "topicCreates" INTEGER NOT NULL DEFAULT 0,
    "topicUpdates" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigestUserDailyOps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AgentTaskStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "creditsUsed" INTEGER,
    "toolCallCount" INTEGER,
    "elapsedMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "AgentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTaskCharge" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" "QuotaSource" NOT NULL,
    "transactionId" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentTaskCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_creemSubscriptionId_key" ON "Subscription"("creemSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Quota_userId_key" ON "Quota"("userId");

-- CreateIndex
CREATE INDEX "QuotaTransaction_userId_idx" ON "QuotaTransaction"("userId");

-- CreateIndex
CREATE INDEX "QuotaTransaction_createdAt_idx" ON "QuotaTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_actorUserId_idx" ON "AdminAuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetUserId_idx" ON "AdminAuditLog"("targetUserId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_creemOrderId_key" ON "PaymentOrder"("creemOrderId");

-- CreateIndex
CREATE INDEX "PaymentOrder_userId_idx" ON "PaymentOrder"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "LlmProvider_enabled_idx" ON "LlmProvider"("enabled");

-- CreateIndex
CREATE INDEX "LlmProvider_providerType_idx" ON "LlmProvider"("providerType");

-- CreateIndex
CREATE INDEX "LlmModel_providerId_idx" ON "LlmModel"("providerId");

-- CreateIndex
CREATE INDEX "LlmModel_enabled_idx" ON "LlmModel"("enabled");

-- CreateIndex
CREATE INDEX "LlmModel_modelId_idx" ON "LlmModel"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "LlmModel_providerId_modelId_key" ON "LlmModel"("providerId", "modelId");

-- CreateIndex
CREATE INDEX "Screenshot_userId_idx" ON "Screenshot"("userId");

-- CreateIndex
CREATE INDEX "Screenshot_url_idx" ON "Screenshot"("url");

-- CreateIndex
CREATE INDEX "Screenshot_requestHash_idx" ON "Screenshot"("requestHash");

-- CreateIndex
CREATE INDEX "Screenshot_status_idx" ON "Screenshot"("status");

-- CreateIndex
CREATE INDEX "Screenshot_createdAt_idx" ON "Screenshot"("createdAt");

-- CreateIndex
CREATE INDEX "Screenshot_fileExpiresAt_idx" ON "Screenshot"("fileExpiresAt");

-- CreateIndex
CREATE INDEX "Webhook_userId_idx" ON "Webhook"("userId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_webhookId_idx" ON "WebhookDelivery"("webhookId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_createdAt_idx" ON "WebhookDelivery"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccountDeletionRecord_userId_key" ON "AccountDeletionRecord"("userId");

-- CreateIndex
CREATE INDEX "AccountDeletionRecord_reason_idx" ON "AccountDeletionRecord"("reason");

-- CreateIndex
CREATE INDEX "AccountDeletionRecord_deletedAt_idx" ON "AccountDeletionRecord"("deletedAt");

-- CreateIndex
CREATE INDEX "ScrapeJob_userId_idx" ON "ScrapeJob"("userId");

-- CreateIndex
CREATE INDEX "ScrapeJob_requestHash_idx" ON "ScrapeJob"("requestHash");

-- CreateIndex
CREATE INDEX "ScrapeJob_status_idx" ON "ScrapeJob"("status");

-- CreateIndex
CREATE INDEX "ScrapeJob_url_idx" ON "ScrapeJob"("url");

-- CreateIndex
CREATE INDEX "ScrapeJob_createdAt_idx" ON "ScrapeJob"("createdAt");

-- CreateIndex
CREATE INDEX "BatchScrapeJob_userId_idx" ON "BatchScrapeJob"("userId");

-- CreateIndex
CREATE INDEX "BatchScrapeJob_status_idx" ON "BatchScrapeJob"("status");

-- CreateIndex
CREATE INDEX "BatchScrapeItem_batchJobId_idx" ON "BatchScrapeItem"("batchJobId");

-- CreateIndex
CREATE INDEX "BatchScrapeItem_status_idx" ON "BatchScrapeItem"("status");

-- CreateIndex
CREATE INDEX "CrawlJob_userId_idx" ON "CrawlJob"("userId");

-- CreateIndex
CREATE INDEX "CrawlJob_status_idx" ON "CrawlJob"("status");

-- CreateIndex
CREATE INDEX "CrawlPage_crawlJobId_idx" ON "CrawlPage"("crawlJobId");

-- CreateIndex
CREATE INDEX "CrawlPage_status_idx" ON "CrawlPage"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CrawlPage_crawlJobId_url_key" ON "CrawlPage"("crawlJobId", "url");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DigestWelcomePage_slug_key" ON "DigestWelcomePage"("slug");

-- CreateIndex
CREATE INDEX "DigestWelcomePage_enabled_sortOrder_idx" ON "DigestWelcomePage"("enabled", "sortOrder");

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
CREATE INDEX "DigestFeedbackPattern_subscriptionId_idx" ON "DigestFeedbackPattern"("subscriptionId");

-- CreateIndex
CREATE INDEX "DigestFeedbackPattern_confidence_idx" ON "DigestFeedbackPattern"("confidence");

-- CreateIndex
CREATE UNIQUE INDEX "DigestFeedbackPattern_subscriptionId_patternType_value_key" ON "DigestFeedbackPattern"("subscriptionId", "patternType", "value");

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
CREATE INDEX "DigestTopic_featured_featuredOrder_idx" ON "DigestTopic"("featured", "featuredOrder");

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

-- CreateIndex
CREATE INDEX "DigestTopicReport_topicId_status_idx" ON "DigestTopicReport"("topicId", "status");

-- CreateIndex
CREATE INDEX "DigestTopicReport_status_createdAt_idx" ON "DigestTopicReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DigestTopicReport_reporterUserId_idx" ON "DigestTopicReport"("reporterUserId");

-- CreateIndex
CREATE INDEX "DigestUserDailyOps_date_idx" ON "DigestUserDailyOps"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DigestUserDailyOps_userId_date_key" ON "DigestUserDailyOps"("userId", "date");

-- CreateIndex
CREATE INDEX "AgentTask_userId_idx" ON "AgentTask"("userId");

-- CreateIndex
CREATE INDEX "AgentTask_status_idx" ON "AgentTask"("status");

-- CreateIndex
CREATE INDEX "AgentTask_createdAt_idx" ON "AgentTask"("createdAt");

-- CreateIndex
CREATE INDEX "AgentTaskCharge_taskId_idx" ON "AgentTaskCharge"("taskId");

-- CreateIndex
CREATE INDEX "AgentTaskCharge_userId_idx" ON "AgentTaskCharge"("userId");

-- CreateIndex
CREATE INDEX "AgentTaskCharge_createdAt_idx" ON "AgentTaskCharge"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentTaskCharge_taskId_referenceId_key" ON "AgentTaskCharge"("taskId", "referenceId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "RefreshToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quota" ADD CONSTRAINT "Quota_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmModel" ADD CONSTRAINT "LlmModel_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "LlmProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screenshot" ADD CONSTRAINT "Screenshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screenshot" ADD CONSTRAINT "Screenshot_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountDeletionRecord" ADD CONSTRAINT "AccountDeletionRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapeJob" ADD CONSTRAINT "ScrapeJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapeJob" ADD CONSTRAINT "ScrapeJob_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchScrapeJob" ADD CONSTRAINT "BatchScrapeJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchScrapeItem" ADD CONSTRAINT "BatchScrapeItem_batchJobId_fkey" FOREIGN KEY ("batchJobId") REFERENCES "BatchScrapeJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrawlJob" ADD CONSTRAINT "CrawlJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrawlPage" ADD CONSTRAINT "CrawlPage_crawlJobId_fkey" FOREIGN KEY ("crawlJobId") REFERENCES "CrawlJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "DigestFeedbackPattern" ADD CONSTRAINT "DigestFeedbackPattern_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "DigestSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "DigestTopic" ADD CONSTRAINT "DigestTopic_featuredByUserId_fkey" FOREIGN KEY ("featuredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestTopicEdition" ADD CONSTRAINT "DigestTopicEdition_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "DigestTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestTopicEditionItem" ADD CONSTRAINT "DigestTopicEditionItem_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "DigestTopicEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestTopicEditionItem" ADD CONSTRAINT "DigestTopicEditionItem_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestTopicReport" ADD CONSTRAINT "DigestTopicReport_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "DigestTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestTopicReport" ADD CONSTRAINT "DigestTopicReport_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestUserDailyOps" ADD CONSTRAINT "DigestUserDailyOps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTaskCharge" ADD CONSTRAINT "AgentTaskCharge_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AgentTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
