CREATE TABLE "PendingEmailSignup" (
  "email" TEXT NOT NULL,
  "otpHash" TEXT NOT NULL,
  "otpExpiresAt" TIMESTAMP(3) NOT NULL,
  "otpAttemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastOtpSentAt" TIMESTAMP(3) NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "completionTokenHash" TEXT,
  "completionTokenExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PendingEmailSignup_pkey" PRIMARY KEY ("email")
);

CREATE UNIQUE INDEX "PendingEmailSignup_completionTokenHash_key"
ON "PendingEmailSignup"("completionTokenHash");
