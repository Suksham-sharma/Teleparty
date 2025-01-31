/*
  Warnings:

  - You are about to drop the column `subscriber_count` on the `Channel` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Channel" DROP COLUMN "subscriber_count",
ADD COLUMN     "currentVideo" TEXT;
