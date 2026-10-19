-- AlterTable
ALTER TABLE "programs" ADD COLUMN     "generatedFrom" JSONB,
ADD COLUMN     "ownerId" TEXT;

-- CreateTable
CREATE TABLE "coach_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "display" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coach_messages_userId_createdAt_idx" ON "coach_messages"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "programs_ownerId_idx" ON "programs"("ownerId");

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_messages" ADD CONSTRAINT "coach_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

