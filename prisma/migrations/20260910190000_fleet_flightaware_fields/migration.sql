-- CreateTable
CREATE TABLE IF NOT EXISTS "Aircraft" (
    "id" TEXT NOT NULL,
    "tailNumber" TEXT NOT NULL,
    "label" TEXT,
    "typeName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Aircraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Aircraft_tailNumber_key" ON "Aircraft"("tailNumber");

-- AlterTable Movement: FlightAware + aircraft link
ALTER TABLE "Movement" ADD COLUMN IF NOT EXISTS "aircraftId" TEXT;
ALTER TABLE "Movement" ADD COLUMN IF NOT EXISTS "flightIdent" TEXT;
ALTER TABLE "Movement" ADD COLUMN IF NOT EXISTS "faFlightId" TEXT;
ALTER TABLE "Movement" ADD COLUMN IF NOT EXISTS "faStatus" TEXT;
ALTER TABLE "Movement" ADD COLUMN IF NOT EXISTS "faStatusText" TEXT;
ALTER TABLE "Movement" ADD COLUMN IF NOT EXISTS "faDelaySeconds" INTEGER;
ALTER TABLE "Movement" ADD COLUMN IF NOT EXISTS "lastSyncedAt" TIMESTAMP(3);
ALTER TABLE "Movement" ADD COLUMN IF NOT EXISTS "scheduledOut" TIMESTAMP(3);
ALTER TABLE "Movement" ADD COLUMN IF NOT EXISTS "actualOut" TIMESTAMP(3);
ALTER TABLE "Movement" ADD COLUMN IF NOT EXISTS "scheduledIn" TIMESTAMP(3);
ALTER TABLE "Movement" ADD COLUMN IF NOT EXISTS "actualIn" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Movement_flightIdent_idx" ON "Movement"("flightIdent");
CREATE INDEX IF NOT EXISTS "Movement_aircraftId_idx" ON "Movement"("aircraftId");
CREATE INDEX IF NOT EXISTS "Movement_faStatus_idx" ON "Movement"("faStatus");

DO $$ BEGIN
  ALTER TABLE "Movement" ADD CONSTRAINT "Movement_aircraftId_fkey"
    FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
