-- AlterTable
ALTER TABLE "Video" ALTER COLUMN "duration" DROP NOT NULL,
ALTER COLUMN "duration" DROP DEFAULT,
ALTER COLUMN "duration" SET DATA TYPE TEXT,
ALTER COLUMN "timeStamp" SET DATA TYPE TEXT;
