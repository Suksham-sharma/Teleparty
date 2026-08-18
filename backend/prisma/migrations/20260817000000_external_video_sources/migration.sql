-- CreateEnum
CREATE TYPE "VideoSource" AS ENUM ('UPLOAD', 'FILE', 'HLS', 'YOUTUBE');

-- DropForeignKey
ALTER TABLE "Video" DROP CONSTRAINT "Video_channelId_fkey";

-- DropForeignKey
ALTER TABLE "Video" DROP CONSTRAINT "Video_creatorId_fkey";

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "source" "VideoSource" NOT NULL DEFAULT 'UPLOAD',
ADD COLUMN     "sourceUrl" TEXT,
ALTER COLUMN "channelId" DROP NOT NULL,
ALTER COLUMN "creatorId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Video_sourceUrl_key" ON "Video"("sourceUrl");

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "Room" SET "currentVideoId" = NULL
WHERE "currentVideoId" IS NOT NULL
  AND "currentVideoId" NOT IN (SELECT "id" FROM "Video");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_currentVideoId_fkey" FOREIGN KEY ("currentVideoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;
