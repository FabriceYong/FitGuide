-- AlterTable
ALTER TABLE "users" ADD COLUMN     "daysPerWeek" INTEGER,
ADD COLUMN     "equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "focusAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "limitations" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "workoutMinutes" INTEGER;
