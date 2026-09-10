-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustResetPassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "boltProfileId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_boltProfileId_key" ON "User"("boltProfileId");

-- CreateTable
CREATE TABLE IF NOT EXISTS "Passenger" (
    "id" TEXT NOT NULL,
    "boltPassengerId" TEXT,
    "boltFlightRequestId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "weightLbs" DOUBLE PRECISION,
    "notes" TEXT,
    "address" TEXT,
    "passportNumber" TEXT,
    "passportExpirationDate" TIMESTAMP(3),
    "nationality" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "responseStatus" TEXT,
    "profileUserId" TEXT,
    "movementId" TEXT,
    "boltCreatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Passenger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Passenger_boltPassengerId_key" ON "Passenger"("boltPassengerId");
CREATE INDEX IF NOT EXISTS "Passenger_email_idx" ON "Passenger"("email");
CREATE INDEX IF NOT EXISTS "Passenger_boltFlightRequestId_idx" ON "Passenger"("boltFlightRequestId");
CREATE INDEX IF NOT EXISTS "Passenger_profileUserId_idx" ON "Passenger"("profileUserId");
CREATE INDEX IF NOT EXISTS "Passenger_movementId_idx" ON "Passenger"("movementId");

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "Passenger" ADD CONSTRAINT "Passenger_profileUserId_fkey" FOREIGN KEY ("profileUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
 ALTER TABLE "Passenger" ADD CONSTRAINT "Passenger_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "Movement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
