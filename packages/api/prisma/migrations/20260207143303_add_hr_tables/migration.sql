-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('board_resolution', 'employment', 'mandate_contract', 'work_contract', 'dividend');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('draft', 'active', 'terminated', 'expired');

-- CreateEnum
CREATE TYPE "AbsenceType" AS ENUM ('vacation', 'sick_leave', 'maternity', 'unpaid', 'other');

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "pesel" TEXT,
    "nip" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "email" TEXT,
    "phone" TEXT,
    "street" TEXT,
    "city" TEXT,
    "zip" TEXT,
    "country" TEXT NOT NULL DEFAULT 'PL',
    "bankAccount" TEXT,
    "taxOffice" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hiredAt" TIMESTAMP(3),
    "firedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_contracts" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "type" "PaymentType" NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'draft',
    "position" TEXT,
    "department" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "baseSalaryGross" DECIMAL(12,2) NOT NULL,
    "workHoursPerWeek" DECIMAL(4,1),
    "costDeductionRate" DECIMAL(5,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employment_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_records" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "period" TEXT NOT NULL,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "bonuses" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "zusEmerytalne" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "zusRentowe" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "zusChorobowe" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "zusZdrowotne" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "zusEmerytalneEmployer" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "zusRentoweEmployer" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "zusWypadkowe" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "zusFP" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "zusFGSP" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxBase" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "incomeTax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "totalEmployerCost" DECIMAL(12,2) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absences" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "type" "AbsenceType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "businessDays" INTEGER NOT NULL,
    "notes" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employees_userId_idx" ON "employees"("userId");

-- CreateIndex
CREATE INDEX "employees_userId_isActive_idx" ON "employees"("userId", "isActive");

-- CreateIndex
CREATE INDEX "employment_contracts_employeeId_idx" ON "employment_contracts"("employeeId");

-- CreateIndex
CREATE INDEX "employment_contracts_employeeId_status_idx" ON "employment_contracts"("employeeId", "status");

-- CreateIndex
CREATE INDEX "payroll_records_employeeId_idx" ON "payroll_records"("employeeId");

-- CreateIndex
CREATE INDEX "payroll_records_period_idx" ON "payroll_records"("period");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_records_employeeId_contractId_period_key" ON "payroll_records"("employeeId", "contractId", "period");

-- CreateIndex
CREATE INDEX "absences_employeeId_idx" ON "absences"("employeeId");

-- CreateIndex
CREATE INDEX "absences_employeeId_startDate_endDate_idx" ON "absences"("employeeId", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_contracts" ADD CONSTRAINT "employment_contracts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "employment_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absences" ADD CONSTRAINT "absences_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
