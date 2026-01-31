-- CreateEnum
CREATE TYPE "invoice_status" AS ENUM ('DRAFT', 'ISSUED', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "recommendation_status" AS ENUM ('PENDING', 'REVIEWED', 'IMPLEMENTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "recommendation_category" AS ENUM ('TAX_OPTIMIZATION', 'CASH_FLOW', 'EXPENSE_REDUCTION', 'REVENUE_GROWTH', 'COMPLIANCE', 'AUTOMATION', 'REPORTING', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "googleId" TEXT,
    "githubId" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "wfirmaConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wfirma_invoices" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceIdWFirma" TEXT NOT NULL,
    "customerId" UUID,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "customerNip" TEXT,
    "customerAddress" JSONB,
    "amount" DECIMAL(12,2) NOT NULL,
    "vat" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "status" "invoice_status" NOT NULL DEFAULT 'DRAFT',
    "items" JSONB,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "wfirma_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wfirma_customers" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "customerIdWFirma" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "nip" TEXT,
    "address" JSONB,
    "totalRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalInvoices" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "wfirma_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT,
    "messages" JSONB NOT NULL,
    "graphState" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_recommendations" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "conversationId" UUID,
    "category" "recommendation_category" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impactScore" DECIMAL(5,2) NOT NULL,
    "confidenceScore" DECIMAL(5,2) NOT NULL,
    "status" "recommendation_status" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "implementedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ai_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "users_githubId_key" ON "users"("githubId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_googleId_idx" ON "users"("googleId");

-- CreateIndex
CREATE INDEX "users_githubId_idx" ON "users"("githubId");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "wfirma_invoices_invoiceIdWFirma_key" ON "wfirma_invoices"("invoiceIdWFirma");

-- CreateIndex
CREATE INDEX "wfirma_invoices_userId_idx" ON "wfirma_invoices"("userId");

-- CreateIndex
CREATE INDEX "wfirma_invoices_customerId_idx" ON "wfirma_invoices"("customerId");

-- CreateIndex
CREATE INDEX "wfirma_invoices_status_idx" ON "wfirma_invoices"("status");

-- CreateIndex
CREATE INDEX "wfirma_invoices_issueDate_idx" ON "wfirma_invoices"("issueDate");

-- CreateIndex
CREATE INDEX "wfirma_invoices_dueDate_idx" ON "wfirma_invoices"("dueDate");

-- CreateIndex
CREATE INDEX "wfirma_invoices_invoiceNumber_idx" ON "wfirma_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "wfirma_invoices_userId_status_idx" ON "wfirma_invoices"("userId", "status");

-- CreateIndex
CREATE INDEX "wfirma_invoices_userId_issueDate_idx" ON "wfirma_invoices"("userId", "issueDate");

-- CreateIndex
CREATE UNIQUE INDEX "wfirma_customers_customerIdWFirma_key" ON "wfirma_customers"("customerIdWFirma");

-- CreateIndex
CREATE UNIQUE INDEX "wfirma_customers_nip_key" ON "wfirma_customers"("nip");

-- CreateIndex
CREATE INDEX "wfirma_customers_userId_idx" ON "wfirma_customers"("userId");

-- CreateIndex
CREATE INDEX "wfirma_customers_nip_idx" ON "wfirma_customers"("nip");

-- CreateIndex
CREATE INDEX "wfirma_customers_email_idx" ON "wfirma_customers"("email");

-- CreateIndex
CREATE INDEX "wfirma_customers_userId_totalRevenue_idx" ON "wfirma_customers"("userId", "totalRevenue");

-- CreateIndex
CREATE INDEX "ai_conversations_userId_idx" ON "ai_conversations"("userId");

-- CreateIndex
CREATE INDEX "ai_conversations_createdAt_idx" ON "ai_conversations"("createdAt");

-- CreateIndex
CREATE INDEX "ai_conversations_userId_createdAt_idx" ON "ai_conversations"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_recommendations_userId_idx" ON "ai_recommendations"("userId");

-- CreateIndex
CREATE INDEX "ai_recommendations_conversationId_idx" ON "ai_recommendations"("conversationId");

-- CreateIndex
CREATE INDEX "ai_recommendations_status_idx" ON "ai_recommendations"("status");

-- CreateIndex
CREATE INDEX "ai_recommendations_category_idx" ON "ai_recommendations"("category");

-- CreateIndex
CREATE INDEX "ai_recommendations_impactScore_idx" ON "ai_recommendations"("impactScore");

-- CreateIndex
CREATE INDEX "ai_recommendations_userId_status_idx" ON "ai_recommendations"("userId", "status");

-- CreateIndex
CREATE INDEX "ai_recommendations_userId_category_idx" ON "ai_recommendations"("userId", "category");

-- CreateIndex
CREATE INDEX "ai_recommendations_createdAt_idx" ON "ai_recommendations"("createdAt");

-- AddForeignKey
ALTER TABLE "wfirma_invoices" ADD CONSTRAINT "wfirma_invoices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wfirma_invoices" ADD CONSTRAINT "wfirma_invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "wfirma_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wfirma_customers" ADD CONSTRAINT "wfirma_customers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
