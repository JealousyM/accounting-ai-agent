-- CreateTable
CREATE TABLE "org_prompt_shortcuts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "prompt" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_prompt_shortcuts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "org_prompt_shortcuts_organizationId_sortOrder_idx" ON "org_prompt_shortcuts"("organizationId", "sortOrder");

-- AddForeignKey
ALTER TABLE "org_prompt_shortcuts" ADD CONSTRAINT "org_prompt_shortcuts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_prompt_shortcuts" ADD CONSTRAINT "org_prompt_shortcuts_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON UPDATE CASCADE;
