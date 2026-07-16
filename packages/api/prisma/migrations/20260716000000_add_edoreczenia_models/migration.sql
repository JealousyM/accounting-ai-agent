-- CreateEnum
CREATE TYPE "EDoreczeniaStatus" AS ENUM ('pending_csr', 'pending_cert', 'active', 'degraded', 'cert_expiring', 'cert_expired');

-- CreateEnum
CREATE TYPE "EDoreczeniaLetterStatus" AS ENUM ('new', 'needs_action', 'done');

-- CreateEnum
CREATE TYPE "EDoreczeniaAnalysisStatus" AS ENUM ('pending', 'done', 'failed', 'unavailable');

-- CreateEnum
CREATE TYPE "EDoreczeniaSenderType" AS ENUM ('us', 'zus', 'court', 'other', 'unknown');

-- CreateEnum
CREATE TYPE "EDoreczeniaDeadlineType" AS ENUM ('response_deadline', 'fikcja_doreczenia', 'custom');

-- CreateEnum
CREATE TYPE "EDoreczeniaDeadlineStatus" AS ENUM ('active', 'met', 'missed', 'dismissed');

-- CreateTable
CREATE TABLE "edoreczenia_config" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "adeAddress" TEXT,
    "status" "EDoreczeniaStatus" NOT NULL DEFAULT 'pending_csr',
    "privateKeyEnc" TEXT,
    "certificateEnc" TEXT,
    "certExpiresAt" TIMESTAMP(3),
    "autoReceive" BOOLEAN NOT NULL DEFAULT false,
    "notifyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notifyLeadDays" INTEGER NOT NULL DEFAULT 3,
    "environment" TEXT NOT NULL DEFAULT 'int',
    "provider" TEXT NOT NULL DEFAULT 'poczta_polska',
    "lastPolledAt" TIMESTAMP(3),
    "lastPollError" TEXT,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "edoreczenia_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edoreczenia_letters" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "configId" UUID NOT NULL,
    "messageId" TEXT NOT NULL,
    "senderName" TEXT,
    "senderType" "EDoreczeniaSenderType" NOT NULL DEFAULT 'unknown',
    "subject" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "bodyText" TEXT,
    "attachmentsMeta" JSONB,
    "analysis" JSONB,
    "status" "EDoreczeniaLetterStatus" NOT NULL DEFAULT 'new',
    "analysisStatus" "EDoreczeniaAnalysisStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "edoreczenia_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edoreczenia_deadlines" (
    "id" UUID NOT NULL,
    "letterId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "EDoreczeniaDeadlineType" NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "status" "EDoreczeniaDeadlineStatus" NOT NULL DEFAULT 'active',
    "remindersSent" INTEGER NOT NULL DEFAULT 0,
    "lastRemindedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "edoreczenia_deadlines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "edoreczenia_config_userId_key" ON "edoreczenia_config"("userId");

-- CreateIndex
CREATE INDEX "edoreczenia_letters_userId_idx" ON "edoreczenia_letters"("userId");

-- CreateIndex
CREATE INDEX "edoreczenia_letters_userId_status_idx" ON "edoreczenia_letters"("userId", "status");

-- CreateIndex
CREATE INDEX "edoreczenia_letters_configId_idx" ON "edoreczenia_letters"("configId");

-- CreateIndex
CREATE UNIQUE INDEX "edoreczenia_letters_userId_messageId_key" ON "edoreczenia_letters"("userId", "messageId");

-- CreateIndex
CREATE INDEX "edoreczenia_deadlines_userId_idx" ON "edoreczenia_deadlines"("userId");

-- CreateIndex
CREATE INDEX "edoreczenia_deadlines_status_dueDate_idx" ON "edoreczenia_deadlines"("status", "dueDate");

-- CreateIndex
CREATE INDEX "edoreczenia_deadlines_letterId_idx" ON "edoreczenia_deadlines"("letterId");

-- AddForeignKey
ALTER TABLE "edoreczenia_config" ADD CONSTRAINT "edoreczenia_config_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edoreczenia_letters" ADD CONSTRAINT "edoreczenia_letters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edoreczenia_letters" ADD CONSTRAINT "edoreczenia_letters_configId_fkey" FOREIGN KEY ("configId") REFERENCES "edoreczenia_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edoreczenia_deadlines" ADD CONSTRAINT "edoreczenia_deadlines_letterId_fkey" FOREIGN KEY ("letterId") REFERENCES "edoreczenia_letters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edoreczenia_deadlines" ADD CONSTRAINT "edoreczenia_deadlines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

