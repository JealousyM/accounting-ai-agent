-- CreateEnum
CREATE TYPE "uchwala_type" AS ENUM ('ZARZADU', 'DYWIDENDA', 'RADA_NADZORCZA', 'TANTIEMA');

-- CreateEnum
CREATE TYPE "uchwala_status" AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'SCHEDULED', 'SENT', 'CONFIRMED', 'FAILED');

-- CreateTable
CREATE TABLE "uchwaly" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "uchwala_type" NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "uchwala_status" NOT NULL DEFAULT 'DRAFT',
    "data" JSONB NOT NULL,
    "wfirmaCompanyId" TEXT,
    "taxCalculation" JSONB,
    "documentUrl" TEXT,
    "signatureRequestId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "uchwaly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "uchwalaId" UUID NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientAccount" TEXT NOT NULL,
    "recipientNip" TEXT,
    "wfirmaContractorId" TEXT,
    "amountGross" DECIMAL(12,2) NOT NULL,
    "amountNet" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL,
    "zusAmount" DECIMAL(12,2),
    "status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "processedDate" TIMESTAMP(3),
    "bankReference" TEXT,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uchwala_invoices" (
    "id" UUID NOT NULL,
    "uchwalaId" UUID NOT NULL,
    "wfirmaInvoiceId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "status" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uchwala_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "uchwalaId" UUID,
    "userId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldData" JSONB,
    "newData" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uchwala_templates" (
    "id" UUID NOT NULL,
    "type" "uchwala_type" NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'pl',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "requiredFields" TEXT[],
    "version" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uchwala_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uchwaly_number_key" ON "uchwaly"("number");

-- CreateIndex
CREATE INDEX "uchwaly_userId_idx" ON "uchwaly"("userId");

-- CreateIndex
CREATE INDEX "uchwaly_type_idx" ON "uchwaly"("type");

-- CreateIndex
CREATE INDEX "uchwaly_status_idx" ON "uchwaly"("status");

-- CreateIndex
CREATE INDEX "uchwaly_createdAt_idx" ON "uchwaly"("createdAt");

-- CreateIndex
CREATE INDEX "uchwaly_userId_type_idx" ON "uchwaly"("userId", "type");

-- CreateIndex
CREATE INDEX "uchwaly_userId_status_idx" ON "uchwaly"("userId", "status");

-- CreateIndex
CREATE INDEX "uchwaly_wfirmaCompanyId_idx" ON "uchwaly"("wfirmaCompanyId");

-- CreateIndex
CREATE INDEX "payments_uchwalaId_idx" ON "payments"("uchwalaId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_scheduledDate_idx" ON "payments"("scheduledDate");

-- CreateIndex
CREATE INDEX "payments_wfirmaContractorId_idx" ON "payments"("wfirmaContractorId");

-- CreateIndex
CREATE UNIQUE INDEX "uchwala_invoices_wfirmaInvoiceId_key" ON "uchwala_invoices"("wfirmaInvoiceId");

-- CreateIndex
CREATE INDEX "uchwala_invoices_uchwalaId_idx" ON "uchwala_invoices"("uchwalaId");

-- CreateIndex
CREATE INDEX "uchwala_invoices_wfirmaInvoiceId_idx" ON "uchwala_invoices"("wfirmaInvoiceId");

-- CreateIndex
CREATE INDEX "uchwala_invoices_status_idx" ON "uchwala_invoices"("status");

-- CreateIndex
CREATE INDEX "audit_logs_uchwalaId_idx" ON "audit_logs"("uchwalaId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "uchwala_templates_type_locale_isActive_idx" ON "uchwala_templates"("type", "locale", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "uchwala_templates_type_locale_version_key" ON "uchwala_templates"("type", "locale", "version");

-- AddForeignKey
ALTER TABLE "uchwaly" ADD CONSTRAINT "uchwaly_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_uchwalaId_fkey" FOREIGN KEY ("uchwalaId") REFERENCES "uchwaly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uchwala_invoices" ADD CONSTRAINT "uchwala_invoices_uchwalaId_fkey" FOREIGN KEY ("uchwalaId") REFERENCES "uchwaly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_uchwalaId_fkey" FOREIGN KEY ("uchwalaId") REFERENCES "uchwaly"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
