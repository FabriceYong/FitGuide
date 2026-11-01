-- AlterTable
ALTER TABLE "users" ADD COLUMN "reminderDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN "reminderTime" TEXT NOT NULL DEFAULT '18:00',
ADD COLUMN "streakReminder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "timeZone" TEXT,
ADD COLUMN "workoutReminderOn" TEXT,
ADD COLUMN "streakReminderOn" TEXT;

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
