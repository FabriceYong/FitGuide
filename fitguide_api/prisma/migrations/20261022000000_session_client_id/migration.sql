-- AlterTable
ALTER TABLE "workout_sessions" ADD COLUMN "clientId" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "workout_sessions_userId_clientId_key" ON "workout_sessions"("userId", "clientId");
