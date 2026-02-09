-- CreateEnum
CREATE TYPE "VideoTranscriptTaskStatus" AS ENUM (
    'PENDING',
    'DOWNLOADING',
    'EXTRACTING_AUDIO',
    'TRANSCRIBING',
    'UPLOADING',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);

-- CreateEnum
CREATE TYPE "VideoTranscriptExecutor" AS ENUM ('LOCAL', 'CLOUD_FALLBACK');

-- CreateTable
CREATE TABLE "VideoTranscriptTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "status" "VideoTranscriptTaskStatus" NOT NULL DEFAULT 'PENDING',
    "executor" "VideoTranscriptExecutor",
    "localStartedAt" TIMESTAMP(3),
    "artifacts" JSONB,
    "result" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoTranscriptTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoTranscriptTask_userId_createdAt_idx" ON "VideoTranscriptTask"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoTranscriptTask_status_createdAt_idx" ON "VideoTranscriptTask"("status", "createdAt");

-- CreateIndex
CREATE INDEX "VideoTranscriptTask_executor_createdAt_idx" ON "VideoTranscriptTask"("executor", "createdAt");

-- CreateIndex
CREATE INDEX "VideoTranscriptTask_localStartedAt_idx" ON "VideoTranscriptTask"("localStartedAt");

-- CreateIndex
CREATE INDEX "VideoTranscriptTask_sourceUrl_idx" ON "VideoTranscriptTask"("sourceUrl");

-- AddForeignKey
ALTER TABLE "VideoTranscriptTask" ADD CONSTRAINT "VideoTranscriptTask_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
