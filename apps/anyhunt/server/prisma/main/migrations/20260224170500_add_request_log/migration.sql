-- CreateTable
CREATE TABLE "RequestLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "routeGroup" TEXT,
    "statusCode" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "authType" TEXT,
    "userId" TEXT,
    "apiKeyId" TEXT,
    "clientIp" TEXT NOT NULL,
    "forwardedFor" TEXT,
    "origin" TEXT,
    "referer" TEXT,
    "userAgent" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "retryAfter" TEXT,
    "rateLimitLimit" TEXT,
    "rateLimitRemaining" TEXT,
    "rateLimitReset" TEXT,
    "requestBytes" INTEGER,
    "responseBytes" INTEGER,

    CONSTRAINT "RequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequestLog_createdAt_idx" ON "RequestLog"("createdAt");

-- CreateIndex
CREATE INDEX "RequestLog_requestId_idx" ON "RequestLog"("requestId");

-- CreateIndex
CREATE INDEX "RequestLog_statusCode_createdAt_idx" ON "RequestLog"("statusCode", "createdAt");

-- CreateIndex
CREATE INDEX "RequestLog_routeGroup_createdAt_idx" ON "RequestLog"("routeGroup", "createdAt");

-- CreateIndex
CREATE INDEX "RequestLog_userId_createdAt_idx" ON "RequestLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RequestLog_apiKeyId_createdAt_idx" ON "RequestLog"("apiKeyId", "createdAt");

-- CreateIndex
CREATE INDEX "RequestLog_clientIp_createdAt_idx" ON "RequestLog"("clientIp", "createdAt");
