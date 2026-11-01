-- AlterTable
ALTER TABLE "workouts" ADD COLUMN "builtFrom" JSONB,
ADD COLUMN "ownerId" TEXT;

-- CreateIndex
CREATE INDEX "workouts_ownerId_idx" ON "workouts"("ownerId");

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
