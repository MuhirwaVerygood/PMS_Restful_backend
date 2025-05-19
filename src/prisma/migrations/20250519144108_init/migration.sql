/*
  Warnings:

  - The values [UNAVAILABLE] on the enum `SlotStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SlotStatus_new" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE');
ALTER TABLE "ParkingSlot" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ParkingSlot" ALTER COLUMN "status" TYPE "SlotStatus_new" USING ("status"::text::"SlotStatus_new");
ALTER TYPE "SlotStatus" RENAME TO "SlotStatus_old";
ALTER TYPE "SlotStatus_new" RENAME TO "SlotStatus";
DROP TYPE "SlotStatus_old";
ALTER TABLE "ParkingSlot" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE';
COMMIT;
