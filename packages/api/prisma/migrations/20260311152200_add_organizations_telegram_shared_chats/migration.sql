-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "nameNorm" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "telegramUsername" TEXT,
    "telegramFirstName" TEXT,
    "activeConversationId" UUID,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_links_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add organizationId to users
ALTER TABLE "users" ADD COLUMN "organizationId" UUID;

-- AlterTable: Add shared conversation fields to ai_conversations
ALTER TABLE "ai_conversations" ADD COLUMN "organizationId" UUID;
ALTER TABLE "ai_conversations" ADD COLUMN "isShared" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ai_conversations" ADD COLUMN "sharedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_nameNorm_key" ON "organizations"("nameNorm");
CREATE INDEX "organizations_nameNorm_idx" ON "organizations"("nameNorm");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_links_userId_key" ON "telegram_links"("userId");
CREATE UNIQUE INDEX "telegram_links_telegramUserId_key" ON "telegram_links"("telegramUserId");
CREATE INDEX "telegram_links_telegramUserId_idx" ON "telegram_links"("telegramUserId");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");
CREATE INDEX "ai_conversations_organizationId_isShared_createdAt_idx" ON "ai_conversations"("organizationId", "isShared", "createdAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "telegram_links" ADD CONSTRAINT "telegram_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: Create organizations from existing users with companyName
INSERT INTO "organizations" ("id", "name", "nameNorm", "createdAt", "updatedAt")
SELECT DISTINCT ON (lower(trim(config->>'companyName')))
    gen_random_uuid(),
    config->>'companyName',
    lower(trim(config->>'companyName')),
    NOW(),
    NOW()
FROM (
    SELECT "wfirmaConfig" AS config
    FROM "users"
    WHERE "wfirmaConfig" IS NOT NULL
      AND "wfirmaConfig"::text != 'null'
      AND ("wfirmaConfig"->>'companyName') IS NOT NULL
      AND trim("wfirmaConfig"->>'companyName') != ''
) AS sub;

-- Link existing users to their organizations
UPDATE "users" u
SET "organizationId" = o."id"
FROM "organizations" o
WHERE u."wfirmaConfig" IS NOT NULL
  AND u."wfirmaConfig"::text != 'null'
  AND (u."wfirmaConfig"->>'companyName') IS NOT NULL
  AND trim(u."wfirmaConfig"->>'companyName') != ''
  AND o."nameNorm" = lower(trim(u."wfirmaConfig"->>'companyName'));
