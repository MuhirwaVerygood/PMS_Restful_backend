-- AlterTable
ALTER TABLE "SlotRequest" ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "preferredLocation" "Location",
ADD COLUMN     "startDate" TIMESTAMP(3);
