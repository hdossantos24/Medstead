-- Staff roles + assignments + airline integration seam on the owned freight store.
-- CUSTOMER remains the default so existing account rows stay freight customers.

CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'ADMIN', 'STAFF', 'PILOT', 'CARGO');
CREATE TYPE "AssignmentKind" AS ENUM ('NEXT_ACTION', 'TRACKING_UPDATE', 'INVOICE', 'RECEIVE_CARGO', 'FLIGHT_TRIP');
CREATE TYPE "AssignmentStatus" AS ENUM ('OPEN', 'DONE');
CREATE TYPE "MovementKind" AS ENUM ('CARGO', 'PASSENGER');
CREATE TYPE "MovementStatus" AS ENUM ('REQUESTED', 'SCHEDULED', 'DISPATCHED', 'COMPLETE', 'HOLD');
CREATE TYPE "DocumentKind" AS ENUM ('COMMERCIAL_INVOICE', 'PACKING_LIST', 'AIR_WAYBILL', 'CUSTOMS_DECLARATION', 'MANIFEST');

ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER';
ALTER TABLE "User" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "Movement" (
    "id" TEXT NOT NULL,
    "movementCode" TEXT NOT NULL,
    "kind" "MovementKind" NOT NULL,
    "status" "MovementStatus" NOT NULL DEFAULT 'REQUESTED',
    "originCode" TEXT NOT NULL,
    "destCode" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "capacityWeightLb" DOUBLE PRECISION,
    "capacityPieces" INTEGER,
    "capacitySeats" INTEGER,
    "operatorName" TEXT NOT NULL DEFAULT 'MTG Airways',
    "notes" TEXT,
    "assignedPilotId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkAssignment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "kind" "AssignmentKind" NOT NULL DEFAULT 'NEXT_ACTION',
    "status" "AssignmentStatus" NOT NULL DEFAULT 'OPEN',
    "assigneeId" TEXT NOT NULL,
    "assignerId" TEXT,
    "bookingId" TEXT,
    "movementId" TEXT,
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StaffRule" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "key" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,

    CONSTRAINT "StaffRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MovementDocument" (
    "id" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "reference" TEXT NOT NULL,
    "note" TEXT,
    "movementId" TEXT,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovementDocument_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Booking" ADD COLUMN "movementId" TEXT;

CREATE UNIQUE INDEX "Movement_movementCode_key" ON "Movement"("movementCode");
CREATE INDEX "Movement_kind_status_idx" ON "Movement"("kind", "status");
CREATE INDEX "Movement_scheduledAt_idx" ON "Movement"("scheduledAt");
CREATE INDEX "WorkAssignment_assigneeId_status_idx" ON "WorkAssignment"("assigneeId", "status");
CREATE INDEX "WorkAssignment_bookingId_idx" ON "WorkAssignment"("bookingId");
CREATE INDEX "WorkAssignment_movementId_idx" ON "WorkAssignment"("movementId");
CREATE UNIQUE INDEX "StaffRule_role_key_key" ON "StaffRule"("role", "key");
CREATE INDEX "MovementDocument_movementId_idx" ON "MovementDocument"("movementId");
CREATE INDEX "MovementDocument_bookingId_idx" ON "MovementDocument"("bookingId");

ALTER TABLE "Movement" ADD CONSTRAINT "Movement_assignedPilotId_fkey" FOREIGN KEY ("assignedPilotId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkAssignment" ADD CONSTRAINT "WorkAssignment_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkAssignment" ADD CONSTRAINT "WorkAssignment_assignerId_fkey" FOREIGN KEY ("assignerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkAssignment" ADD CONSTRAINT "WorkAssignment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkAssignment" ADD CONSTRAINT "WorkAssignment_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "Movement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "Movement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MovementDocument" ADD CONSTRAINT "MovementDocument_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "Movement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MovementDocument" ADD CONSTRAINT "MovementDocument_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
