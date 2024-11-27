/*
  Warnings:

  - You are about to drop the column `thumbnail` on the `Video` table. All the data in the column will be lost.
  - Added the required column `thumbnail_url` to the `Video` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Channel" ALTER COLUMN "subscriber_count" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Video" DROP COLUMN "thumbnail",
ADD COLUMN     "thumbnail_url" TEXT NOT NULL;
