ALTER TABLE "ScrapeJob" ADD COLUMN "quotaBreakdown" JSONB;
ALTER TABLE "BatchScrapeJob" ADD COLUMN "quotaBreakdown" JSONB;
ALTER TABLE "CrawlJob" ADD COLUMN "quotaBreakdown" JSONB;

