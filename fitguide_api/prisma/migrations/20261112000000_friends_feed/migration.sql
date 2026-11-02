-- AlterTable
ALTER TABLE "users" ADD COLUMN     "shareActivity" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "cheers" (
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cheers_pkey" PRIMARY KEY ("sessionId","userId")
);

-- CreateIndex
CREATE INDEX "cheers_userId_idx" ON "cheers"("userId");

-- AddForeignKey
ALTER TABLE "cheers" ADD CONSTRAINT "cheers_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheers" ADD CONSTRAINT "cheers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
