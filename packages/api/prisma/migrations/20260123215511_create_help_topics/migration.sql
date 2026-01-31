-- CreateTable
CREATE TABLE "help_topics" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "titlePl" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleRu" TEXT NOT NULL,
    "contentPl" TEXT NOT NULL,
    "contentEn" TEXT NOT NULL,
    "contentRu" TEXT NOT NULL,
    "searchKeywordsPl" TEXT[],
    "searchKeywordsEn" TEXT[],
    "searchKeywordsRu" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "help_topics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "help_topics_slug_key" ON "help_topics"("slug");

-- CreateIndex
CREATE INDEX "help_topics_category_idx" ON "help_topics"("category");

-- CreateIndex
CREATE INDEX "help_topics_isPublished_idx" ON "help_topics"("isPublished");

-- CreateIndex
CREATE INDEX "help_topics_slug_idx" ON "help_topics"("slug");
