-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isFirstLogin" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "user_api_credentials" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "wfirmaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "wfirmaAccessKey" TEXT,
    "wfirmaSecretKey" TEXT,
    "wfirmaCompanyId" TEXT,
    "llmProvider" TEXT,
    "llmApiKey" TEXT,
    "wfirmaLastValidated" TIMESTAMP(3),
    "llmLastValidated" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_api_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_api_credentials_userId_key" ON "user_api_credentials"("userId");

-- CreateIndex
CREATE INDEX "user_api_credentials_userId_idx" ON "user_api_credentials"("userId");

-- AddForeignKey
ALTER TABLE "user_api_credentials" ADD CONSTRAINT "user_api_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
