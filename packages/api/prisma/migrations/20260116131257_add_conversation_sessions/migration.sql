-- CreateEnum
CREATE TYPE "conversation_status" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "conversation_sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "status" "conversation_status" NOT NULL DEFAULT 'ACTIVE',
    "collectedData" JSONB NOT NULL,
    "currentStep" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "companyData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "conversation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_sessions_userId_idx" ON "conversation_sessions"("userId");

-- CreateIndex
CREATE INDEX "conversation_sessions_status_idx" ON "conversation_sessions"("status");

-- CreateIndex
CREATE INDEX "conversation_sessions_createdAt_idx" ON "conversation_sessions"("createdAt");

-- CreateIndex
CREATE INDEX "conversation_sessions_userId_status_idx" ON "conversation_sessions"("userId", "status");

-- AddForeignKey
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
