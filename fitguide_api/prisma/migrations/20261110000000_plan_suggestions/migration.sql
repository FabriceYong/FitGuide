-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "hiddenSuggestion" TEXT,
ADD COLUMN     "hiddenSuggestionUntil" VARCHAR(10),
ADD COLUMN     "shifts" JSONB NOT NULL DEFAULT '[]';
