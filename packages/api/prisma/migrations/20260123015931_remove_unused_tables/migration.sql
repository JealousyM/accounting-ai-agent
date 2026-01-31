-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_uchwalaId_fkey";

-- DropForeignKey
ALTER TABLE "uchwala_invoices" DROP CONSTRAINT IF EXISTS "uchwala_invoices_uchwalaId_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_uchwalaId_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "wfirma_invoices" DROP CONSTRAINT IF EXISTS "wfirma_invoices_userId_fkey";

-- DropForeignKey
ALTER TABLE "wfirma_invoices" DROP CONSTRAINT IF EXISTS "wfirma_invoices_customerId_fkey";

-- DropForeignKey
ALTER TABLE "wfirma_customers" DROP CONSTRAINT IF EXISTS "wfirma_customers_userId_fkey";

-- DropForeignKey
ALTER TABLE "ai_recommendations" DROP CONSTRAINT IF EXISTS "ai_recommendations_userId_fkey";

-- DropForeignKey
ALTER TABLE "ai_recommendations" DROP CONSTRAINT IF EXISTS "ai_recommendations_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "conversation_sessions" DROP CONSTRAINT IF EXISTS "conversation_sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "uchwaly" DROP CONSTRAINT IF EXISTS "uchwaly_userId_fkey";

-- DropTable
DROP TABLE IF EXISTS "payments";

-- DropTable
DROP TABLE IF EXISTS "uchwala_invoices";

-- DropTable
DROP TABLE IF EXISTS "audit_logs";

-- DropTable
DROP TABLE IF EXISTS "uchwala_templates";

-- DropTable
DROP TABLE IF EXISTS "uchwaly";

-- DropTable
DROP TABLE IF EXISTS "conversation_sessions";

-- DropTable
DROP TABLE IF EXISTS "ai_recommendations";

-- DropTable
DROP TABLE IF EXISTS "wfirma_invoices";

-- DropTable
DROP TABLE IF EXISTS "wfirma_customers";

-- DropEnum
DROP TYPE IF EXISTS "payment_status";

-- DropEnum
DROP TYPE IF EXISTS "uchwala_status";

-- DropEnum
DROP TYPE IF EXISTS "uchwala_type";

-- DropEnum
DROP TYPE IF EXISTS "conversation_status";

-- DropEnum
DROP TYPE IF EXISTS "recommendation_status";

-- DropEnum
DROP TYPE IF EXISTS "recommendation_category";

-- DropEnum
DROP TYPE IF EXISTS "invoice_status";
