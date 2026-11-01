-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "shareWithCoach" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "coach_notes" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "text" VARCHAR(500) NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coach_notes_userId_readAt_idx" ON "coach_notes"("userId", "readAt");

-- CreateIndex
CREATE INDEX "coach_notes_enrollmentId_createdAt_idx" ON "coach_notes"("enrollmentId", "createdAt");

-- AddForeignKey
ALTER TABLE "coach_notes" ADD CONSTRAINT "coach_notes_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_notes" ADD CONSTRAINT "coach_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_notes" ADD CONSTRAINT "coach_notes_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
