-- CreateEnum
CREATE TYPE "DigestTopicReportReason" AS ENUM ('SPAM', 'COPYRIGHT', 'INAPPROPRIATE', 'MISLEADING', 'OTHER');

-- CreateEnum
CREATE TYPE "DigestTopicReportStatus" AS ENUM ('PENDING', 'RESOLVED_VALID', 'RESOLVED_INVALID', 'DISMISSED');

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

-- AddForeignKey
ALTER TABLE "DigestTopicReport" ADD CONSTRAINT "DigestTopicReport_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "DigestTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestTopicReport" ADD CONSTRAINT "DigestTopicReport_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestUserDailyOps" ADD CONSTRAINT "DigestUserDailyOps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
