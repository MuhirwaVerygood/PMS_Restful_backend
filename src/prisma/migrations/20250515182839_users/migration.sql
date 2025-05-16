/*
  Warnings:

  - You are about to drop the column `created_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `names` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password_reset_code` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password_reset_expires` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password_reset_status` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `profile_picture` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `telephone` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `verification_code` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `verification_expires` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `verification_status` on the `users` table. All the data in the column will be lost.
  - Added the required column `username` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "users_telephone_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "created_at",
DROP COLUMN "names",
DROP COLUMN "password_reset_code",
DROP COLUMN "password_reset_expires",
DROP COLUMN "password_reset_status",
DROP COLUMN "profile_picture",
DROP COLUMN "telephone",
DROP COLUMN "updated_at",
DROP COLUMN "verification_code",
DROP COLUMN "verification_expires",
DROP COLUMN "verification_status",
ADD COLUMN     "username" TEXT NOT NULL,
ALTER COLUMN "role" DROP DEFAULT;

-- DropEnum
DROP TYPE "password_reset_status";

-- DropEnum
DROP TYPE "verification_status";
