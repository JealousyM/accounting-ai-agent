-- CreateTable
CREATE TABLE "ksef_contractors" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "nip" TEXT,
    "email" TEXT,
    "street" TEXT,
    "city" TEXT,
    "zip" TEXT,
    "country" TEXT NOT NULL DEFAULT 'PL',
    "source" TEXT NOT NULL DEFAULT 'local',
    "wfirmaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ksef_contractors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ksef_contractors_userId_idx" ON "ksef_contractors"("userId");

-- CreateIndex
CREATE INDEX "ksef_contractors_userId_source_idx" ON "ksef_contractors"("userId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "ksef_contractors_userId_wfirmaId_key" ON "ksef_contractors"("userId", "wfirmaId");

-- AddForeignKey
ALTER TABLE "ksef_contractors" ADD CONSTRAINT "ksef_contractors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
