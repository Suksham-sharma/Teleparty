/*
  Warnings:

  - Added the required column `description` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `video_urls` to the `Video` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "video_urls" JSONB NOT NULL,
ALTER COLUMN "view_count" SET DEFAULT 0,
ALTER COLUMN "thumbnail_url" DROP NOT NULL;
