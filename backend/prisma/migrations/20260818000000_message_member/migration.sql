-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "memberId" TEXT;

-- CreateIndex
CREATE INDEX "Message_memberId_idx" ON "Message"("memberId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "RoomMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
