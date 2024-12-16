/*
  Warnings:

  - You are about to drop the column `thumbnail_url` on the `Video` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Video" DROP COLUMN "thumbnail_url",
ADD COLUMN     "thumbnailId" TEXT;
