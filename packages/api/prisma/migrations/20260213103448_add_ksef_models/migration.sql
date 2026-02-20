-- CreateEnum
CREATE TYPE "KSeFSessionStatus" AS ENUM ('active', 'expired', 'terminated', 'failed');

-- CreateEnum
CREATE TYPE "KSeFInvoiceStatusEnum" AS ENUM ('pending', 'sending', 'sent', 'accepted', 'rejected', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "KSeFAdapterType" AS ENUM ('wfirma', 'direct');

-- CreateTable
CREATE TABLE "ksef_config" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "preferredAdapter" "KSeFAdapterType" NOT NULL DEFAULT 'wfirma',
    "autoSendEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoSendOnCreate" BOOLEAN NOT NULL DEFAULT false,
    "environment" TEXT NOT NULL DEFAULT 'test',
    "defaultCertId" UUID,
    "notifyOnAccepted" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnRejected" BOOLEAN NOT NULL DEFAULT true,
    "notificationEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ksef_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ksef_certificates" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "certificateData" TEXT NOT NULL,
    "password" TEXT,
    "subject" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ksef_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ksef_sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "certificateId" UUID,
    "status" "KSeFSessionStatus" NOT NULL DEFAULT 'active',
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "terminatedAt" TIMESTAMP(3),
    "environment" TEXT NOT NULL DEFAULT 'test',
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ksef_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ksef_invoice_status" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "wfirmaInvoiceId" TEXT,
    "ksefReferenceNumber" TEXT,
    "ksefInvoiceNumber" TEXT,
    "status" "KSeFInvoiceStatusEnum" NOT NULL DEFAULT 'pending',
    "adapter" "KSeFAdapterType" NOT NULL DEFAULT 'wfirma',
    "direction" TEXT NOT NULL DEFAULT 'sent',
    "sessionId" UUID,
    "upoDownloaded" BOOLEAN NOT NULL DEFAULT false,
    "upoContent" BYTEA,
    "upoDownloadedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ksef_invoice_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ksef_config_userId_key" ON "ksef_config"("userId");

-- CreateIndex
CREATE INDEX "ksef_certificates_userId_idx" ON "ksef_certificates"("userId");

-- CreateIndex
CREATE INDEX "ksef_certificates_validUntil_idx" ON "ksef_certificates"("validUntil");

-- CreateIndex
CREATE INDEX "ksef_sessions_userId_idx" ON "ksef_sessions"("userId");

-- CreateIndex
CREATE INDEX "ksef_sessions_expiresAt_idx" ON "ksef_sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ksef_invoice_status_ksefReferenceNumber_key" ON "ksef_invoice_status"("ksefReferenceNumber");

-- CreateIndex
CREATE INDEX "ksef_invoice_status_userId_idx" ON "ksef_invoice_status"("userId");

-- CreateIndex
CREATE INDEX "ksef_invoice_status_wfirmaInvoiceId_idx" ON "ksef_invoice_status"("wfirmaInvoiceId");

-- CreateIndex
CREATE INDEX "ksef_invoice_status_status_idx" ON "ksef_invoice_status"("status");

-- CreateIndex
CREATE INDEX "ksef_invoice_status_sentAt_idx" ON "ksef_invoice_status"("sentAt");

-- CreateIndex
CREATE INDEX "ksef_invoice_status_userId_status_idx" ON "ksef_invoice_status"("userId", "status");

-- CreateIndex
CREATE INDEX "ksef_invoice_status_userId_direction_idx" ON "ksef_invoice_status"("userId", "direction");

-- AddForeignKey
ALTER TABLE "ksef_config" ADD CONSTRAINT "ksef_config_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ksef_certificates" ADD CONSTRAINT "ksef_certificates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ksef_sessions" ADD CONSTRAINT "ksef_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ksef_sessions" ADD CONSTRAINT "ksef_sessions_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "ksef_certificates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ksef_invoice_status" ADD CONSTRAINT "ksef_invoice_status_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ksef_invoice_status" ADD CONSTRAINT "ksef_invoice_status_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ksef_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
