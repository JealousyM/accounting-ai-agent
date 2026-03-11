-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('admin', 'member');
CREATE TYPE "OrgMembershipStatus" AS ENUM ('active', 'pending', 'rejected');

-- AlterTable: Add org role and membership status to users
ALTER TABLE "users" ADD COLUMN "orgRole" "OrgRole" NOT NULL DEFAULT 'member';
ALTER TABLE "users" ADD COLUMN "orgMembershipStatus" "OrgMembershipStatus" NOT NULL DEFAULT 'active';

-- Data migration: Set first member of each organization as admin
UPDATE "users" u
SET "orgRole" = 'admin'
WHERE u."organizationId" IS NOT NULL
  AND u."id" = (
    SELECT u2."id"
    FROM "users" u2
    WHERE u2."organizationId" = u."organizationId"
      AND u2."deletedAt" IS NULL
    ORDER BY u2."createdAt" ASC
    LIMIT 1
  );
