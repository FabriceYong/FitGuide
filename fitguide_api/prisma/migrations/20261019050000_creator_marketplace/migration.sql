-- AlterTable
ALTER TABLE "workouts" ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "programs" ADD COLUMN     "creatorId" TEXT,
ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewNote" VARCHAR(500),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'published';

-- CreateIndex
CREATE INDEX "programs_creatorId_status_idx" ON "programs"("creatorId", "status");

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

