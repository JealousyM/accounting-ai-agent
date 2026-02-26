-- CreateEnum
CREATE TYPE "AIMemoryCategory" AS ENUM ('user_preference', 'business_fact', 'frequent_entity', 'workflow_pattern');

-- CreateEnum
CREATE TYPE "AIMemorySource" AS ENUM ('explicit', 'implicit', 'tool_usage');

-- CreateTable
CREATE TABLE "ai_memories" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "category" "AIMemoryCategory" NOT NULL,
    "source" "AIMemorySource" NOT NULL DEFAULT 'implicit',
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "metadata" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "accessCount" INTEGER NOT NULL DEFAULT 1,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversationId" UUID,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_tool_usage" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "toolName" TEXT NOT NULL,
    "arguments" JSONB,
    "conversationId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_tool_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_memories_userId_category_idx" ON "ai_memories"("userId", "category");

-- CreateIndex
CREATE INDEX "ai_memories_userId_isHidden_idx" ON "ai_memories"("userId", "isHidden");

-- CreateIndex
CREATE UNIQUE INDEX "ai_memories_userId_category_key_key" ON "ai_memories"("userId", "category", "key");

-- CreateIndex
CREATE INDEX "ai_tool_usage_userId_toolName_idx" ON "ai_tool_usage"("userId", "toolName");

-- CreateIndex
CREATE INDEX "ai_tool_usage_userId_createdAt_idx" ON "ai_tool_usage"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ai_memories" ADD CONSTRAINT "ai_memories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_tool_usage" ADD CONSTRAINT "ai_tool_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
