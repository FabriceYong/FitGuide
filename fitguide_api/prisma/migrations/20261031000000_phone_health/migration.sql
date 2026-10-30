-- AlterTable
ALTER TABLE "workout_sessions" ADD COLUMN     "avgHr" INTEGER,
ADD COLUMN     "calorieSource" TEXT NOT NULL DEFAULT 'estimate',
ADD COLUMN     "maxHr" INTEGER;

-- CreateTable
CREATE TABLE "blood_pressure_readings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "systolic" INTEGER NOT NULL,
    "diastolic" INTEGER NOT NULL,
    "pulse" INTEGER,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blood_pressure_readings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blood_pressure_readings_userId_measuredAt_idx" ON "blood_pressure_readings"("userId", "measuredAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "blood_pressure_readings_userId_source_measuredAt_key" ON "blood_pressure_readings"("userId", "source", "measuredAt");

-- AddForeignKey
ALTER TABLE "blood_pressure_readings" ADD CONSTRAINT "blood_pressure_readings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
