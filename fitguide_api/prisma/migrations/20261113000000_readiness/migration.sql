-- CreateTable
CREATE TABLE "readiness_checks" (
    "userId" TEXT NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "energy" INTEGER NOT NULL,
    "soreness" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "readiness_checks_pkey" PRIMARY KEY ("userId","date")
);

-- AddForeignKey
ALTER TABLE "readiness_checks" ADD CONSTRAINT "readiness_checks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
