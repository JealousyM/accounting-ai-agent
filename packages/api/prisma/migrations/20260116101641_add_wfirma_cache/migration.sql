-- CreateTable
CREATE TABLE "wfirma_cache" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "dataType" TEXT NOT NULL,
    "wfirmaId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "wfirma_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wfirma_cache_userId_dataType_idx" ON "wfirma_cache"("userId", "dataType");

-- CreateIndex
CREATE INDEX "wfirma_cache_expiresAt_idx" ON "wfirma_cache"("expiresAt");

-- CreateIndex
CREATE INDEX "wfirma_cache_isValid_idx" ON "wfirma_cache"("isValid");

-- CreateIndex
CREATE UNIQUE INDEX "wfirma_cache_userId_dataType_wfirmaId_key" ON "wfirma_cache"("userId", "dataType", "wfirmaId");

-- AddForeignKey
ALTER TABLE "wfirma_cache" ADD CONSTRAINT "wfirma_cache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
