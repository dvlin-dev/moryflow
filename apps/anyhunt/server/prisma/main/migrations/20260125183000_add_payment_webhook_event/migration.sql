-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "userId" TEXT,
    "creemObjectId" TEXT,
    "creemOrderId" TEXT,
    "eventCreatedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_eventId_key" ON "PaymentWebhookEvent"("eventId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_userId_idx" ON "PaymentWebhookEvent"("userId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_eventCreatedAt_idx" ON "PaymentWebhookEvent"("eventCreatedAt");
