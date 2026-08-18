-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('SUGGESTED', 'QUEUED');

-- DropIndex
DROP INDEX "QueueItem_roomId_position_idx";

-- AlterTable
ALTER TABLE "QueueItem" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "QueueStatus" NOT NULL DEFAULT 'QUEUED';

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "thumbnailUrl" TEXT;

-- CreateIndex
CREATE INDEX "QueueItem_roomId_status_position_idx" ON "QueueItem"("roomId", "status", "position");

