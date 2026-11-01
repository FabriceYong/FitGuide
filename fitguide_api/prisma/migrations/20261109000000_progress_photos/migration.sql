-- CreateTable
CREATE TABLE "progress_photos" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "fileKey" TEXT NOT NULL,
    "note" VARCHAR(200) NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "progress_photos_fileKey_key" ON "progress_photos"("fileKey");

-- CreateIndex
CREATE INDEX "progress_photos_userId_date_idx" ON "progress_photos"("userId", "date");

-- AddForeignKey
ALTER TABLE "progress_photos" ADD CONSTRAINT "progress_photos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
