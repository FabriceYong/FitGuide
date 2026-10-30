-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "category" TEXT NOT NULL,
    "coverImageUrl" VARCHAR(500),
    "takeaways" TEXT[],
    "sections" JSONB NOT NULL,
    "readMinutes" INTEGER NOT NULL,
    "authorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "reviewNote" VARCHAR(500),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");

-- CreateIndex
CREATE INDEX "articles_status_publishedAt_idx" ON "articles"("status", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "articles_authorId_idx" ON "articles"("authorId");

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
