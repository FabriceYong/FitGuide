-- AlterTable
ALTER TABLE "workouts" ADD COLUMN     "creatorId" TEXT,
ADD COLUMN     "reviewNote" VARCHAR(500),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'published';

-- AlterTable
ALTER TABLE "programs" ADD COLUMN     "inPerson" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "coach_profiles" (
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "bio" VARCHAR(1000) NOT NULL,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contactEmail" VARCHAR(200),
    "phone" VARCHAR(40),
    "location" VARCHAR(120),
    "reviewNote" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "coach_profiles_status_idx" ON "coach_profiles"("status");

-- CreateIndex
CREATE INDEX "workouts_creatorId_status_idx" ON "workouts"("creatorId", "status");

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_profiles" ADD CONSTRAINT "coach_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
