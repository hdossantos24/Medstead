-- AlterTable
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paidBy" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paymentReference" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paymentNote" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PaymentRecord" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidBy" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "amountUsd" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "priorInvoiceStatus" TEXT NOT NULL,
    "bookingStatusAfter" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PaymentRecord_bookingId_idx" ON "PaymentRecord"("bookingId");

DO $$ BEGIN
  ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
