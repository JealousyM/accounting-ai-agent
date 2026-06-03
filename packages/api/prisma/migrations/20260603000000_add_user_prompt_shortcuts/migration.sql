-- CreateTable
CREATE TABLE "user_prompt_shortcuts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "prompt" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_prompt_shortcuts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_prompt_shortcuts_userId_sortOrder_idx" ON "user_prompt_shortcuts"("userId", "sortOrder");

-- AddForeignKey
ALTER TABLE "user_prompt_shortcuts" ADD CONSTRAINT "user_prompt_shortcuts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
