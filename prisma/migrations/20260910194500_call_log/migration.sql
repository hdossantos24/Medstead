-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CallType" AS ENUM ('ORGAN_RESCUE', 'MEDICAL_CARGO', 'DOCTOR_CHARTER', 'OTHER_URGENT_MEDICAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CallUrgency" AS ENUM ('ROUTINE', 'URGENT', 'ORGAN_CLOCK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "CallLog" (
    "id" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "callerName" TEXT NOT NULL,
    "callerPhone" TEXT NOT NULL,
    "callbackPhone" TEXT,
    "callerOrg" TEXT,
    "callType" "CallType" NOT NULL,
    "origin" TEXT,
    "destination" TEXT NOT NULL,
    "notes" TEXT,
    "urgency" "CallUrgency" NOT NULL DEFAULT 'URGENT',
    "source" TEXT NOT NULL DEFAULT '+1-954-228-4551',
    "routedTo" TEXT NOT NULL DEFAULT 'DEL',
    "movementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CallLog_receivedAt_idx" ON "CallLog"("receivedAt");
CREATE INDEX IF NOT EXISTS "CallLog_callType_idx" ON "CallLog"("callType");
CREATE INDEX IF NOT EXISTS "CallLog_movementId_idx" ON "CallLog"("movementId");

DO $$ BEGIN
  ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_movementId_fkey"
    FOREIGN KEY ("movementId") REFERENCES "Movement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
