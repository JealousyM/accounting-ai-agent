-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('free', 'pro');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'canceled', 'past_due', 'trialing');

-- AlterTable: Add subscription and usage fields to users
ALTER TABLE "users" ADD COLUMN "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'free';
ALTER TABLE "users" ADD COLUMN "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'active';
ALTER TABLE "users" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "users" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "users" ADD COLUMN "subscriptionEndDate" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "aiMessagesUsed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "aiMessagesLimit" INTEGER NOT NULL DEFAULT 500;
ALTER TABLE "users" ADD COLUMN "aiMessagesResetAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "wfirmaRequestsUsed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "wfirmaRequestsLimit" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "users" ADD COLUMN "wfirmaRequestsResetAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "useOwnLLMKey" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "users"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeSubscriptionId_key" ON "users"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "users_stripeCustomerId_idx" ON "users"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "users_subscriptionPlan_idx" ON "users"("subscriptionPlan");
