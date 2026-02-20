-- AlterTable
ALTER TABLE "ksef_invoice_status" ADD COLUMN     "contractorName" TEXT,
ADD COLUMN     "contractorNip" TEXT,
ADD COLUMN     "currency" TEXT DEFAULT 'PLN',
ADD COLUMN     "invoiceDate" TIMESTAMP(3),
ADD COLUMN     "totalGross" DECIMAL(12,2);
