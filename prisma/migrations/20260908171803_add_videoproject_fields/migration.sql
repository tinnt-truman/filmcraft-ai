-- AlterTable
ALTER TABLE "VideoProject" ADD COLUMN     "subtitleMode" TEXT NOT NULL DEFAULT 'auto',
ADD COLUMN     "videoModel" TEXT NOT NULL DEFAULT 'seedance-2.5';
