-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('DRAFT', 'GENERATING', 'COMPLETED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "EpisodeStatus" AS ENUM ('DRAFT', 'STORYBOARD_READY', 'RENDERED');

-- CreateEnum
CREATE TYPE "CharacterType" AS ENUM ('PROTAGONIST', 'DEUTERAGONIST', 'ANTAGONIST', 'SUPPORTING', 'GROUP');

-- CreateEnum
CREATE TYPE "AssetCategory" AS ENUM ('CHARACTER', 'SCENE', 'PROP', 'VOICE');

-- CreateEnum
CREATE TYPE "ShotSize" AS ENUM ('WIDE', 'MEDIUM', 'CLOSE_UP', 'EXTREME_CLOSE_UP', 'MONTAGE');

-- CreateEnum
CREATE TYPE "TxType" AS ENUM ('TOPUP', 'USAGE_HOLD', 'USAGE_SETTLE', 'REFUND');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('SCRIPT', 'SUMMARY', 'CHARACTER_IMAGE', 'SHOT_IMAGE', 'SHOT_VIDEO', 'VOICE', 'STORYBOARD');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "SegmentStatus" AS ENUM ('PENDING', 'GENERATING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "SegmentLineTag" AS ENUM ('SUBTITLE_CONFIG', 'BGM', 'DIALOGUE', 'VISUAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DramaProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "coverGradient" TEXT NOT NULL DEFAULT 'from-indigo-400 to-slate-700',
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DramaProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSummary" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "episodeCount" INTEGER NOT NULL DEFAULT 8,
    "storyGenre" TEXT NOT NULL DEFAULT '',
    "targetAudience" TEXT NOT NULL DEFAULT '',
    "coreHook" TEXT NOT NULL DEFAULT '',
    "logline" TEXT NOT NULL DEFAULT '',
    "fullSummary" TEXT NOT NULL DEFAULT '',
    "visualStyle" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "characterType" "CharacterType" NOT NULL DEFAULT 'SUPPORTING',
    "visualDescription" TEXT NOT NULL DEFAULT '',
    "coreTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "background" TEXT NOT NULL DEFAULT '',
    "personality" TEXT NOT NULL DEFAULT '',
    "referenceImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "scriptRaw" TEXT NOT NULL DEFAULT '',
    "status" "EpisodeStatus" NOT NULL DEFAULT 'DRAFT',
    "ratio" TEXT NOT NULL DEFAULT '9:16',
    "resolution" TEXT NOT NULL DEFAULT '720p',
    "videoModel" TEXT NOT NULL DEFAULT 'Seedance 2.5',
    "subtitleMode" TEXT NOT NULL DEFAULT 'auto',
    "stitchEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "sceneNumber" INTEGER NOT NULL,
    "timeOfDay" TEXT,
    "interiorExterior" TEXT,
    "location" TEXT NOT NULL DEFAULT '',
    "subLocation" TEXT,
    "charactersPresent" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shot" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "shotSize" "ShotSize" NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "durationSec" DOUBLE PRECISION,

    CONSTRAINT "Shot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DialogueLine" (
    "id" TEXT NOT NULL,
    "shotId" TEXT NOT NULL,
    "characterName" TEXT NOT NULL,
    "direction" TEXT,
    "text" TEXT NOT NULL,
    "voiceUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DialogueLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Segment" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL DEFAULT '',
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "status" "SegmentStatus" NOT NULL DEFAULT 'PENDING',
    "videoUrl" TEXT,
    "lastFrameUrl" TEXT,

    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SegmentLine" (
    "id" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "tag" "SegmentLineTag" NOT NULL DEFAULT 'VISUAL',
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "characterName" TEXT,
    "direction" TEXT,
    "shotType" TEXT,
    "text" TEXT NOT NULL,

    CONSTRAINT "SegmentLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "VideoStatus" NOT NULL DEFAULT 'DRAFT',
    "templateId" TEXT NOT NULL DEFAULT '',
    "topic" TEXT NOT NULL DEFAULT '',
    "durationRange" TEXT NOT NULL DEFAULT '1-3',
    "audience" TEXT NOT NULL DEFAULT '',
    "visualStyleId" TEXT NOT NULL DEFAULT '',
    "characterStyleId" TEXT NOT NULL DEFAULT '',
    "voiceId" TEXT NOT NULL DEFAULT '',
    "ratio" TEXT NOT NULL DEFAULT '16:9',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoScene" (
    "id" TEXT NOT NULL,
    "videoProjectId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startSec" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "endSec" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "videoUrl" TEXT,

    CONSTRAINT "VideoScene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "category" "AssetCategory" NOT NULL DEFAULT 'CHARACTER',
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "heldAmount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "TxType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "estimatedCost" INTEGER NOT NULL DEFAULT 0,
    "actualCost" INTEGER,
    "resultUrl" TEXT,
    "error" TEXT,
    "provider" TEXT,
    "requestPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "videoProjectId" TEXT,
    "segmentId" TEXT,

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "DramaProject_userId_status_idx" ON "DramaProject"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSummary_projectId_key" ON "ProjectSummary"("projectId");

-- CreateIndex
CREATE INDEX "Character_projectId_idx" ON "Character"("projectId");

-- CreateIndex
CREATE INDEX "Episode_projectId_idx" ON "Episode"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_projectId_index_key" ON "Episode"("projectId", "index");

-- CreateIndex
CREATE INDEX "Scene_episodeId_idx" ON "Scene"("episodeId");

-- CreateIndex
CREATE INDEX "Shot_sceneId_idx" ON "Shot"("sceneId");

-- CreateIndex
CREATE INDEX "DialogueLine_shotId_idx" ON "DialogueLine"("shotId");

-- CreateIndex
CREATE INDEX "Segment_episodeId_idx" ON "Segment"("episodeId");

-- CreateIndex
CREATE INDEX "SegmentLine_segmentId_idx" ON "SegmentLine"("segmentId");

-- CreateIndex
CREATE INDEX "VideoProject_userId_idx" ON "VideoProject"("userId");

-- CreateIndex
CREATE INDEX "VideoScene_videoProjectId_idx" ON "VideoScene"("videoProjectId");

-- CreateIndex
CREATE INDEX "Asset_userId_category_idx" ON "Asset"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "Transaction_walletId_idx" ON "Transaction"("walletId");

-- CreateIndex
CREATE INDEX "GenerationJob_userId_status_idx" ON "GenerationJob"("userId", "status");

-- CreateIndex
CREATE INDEX "GenerationJob_targetType_targetId_idx" ON "GenerationJob"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "DramaProject" ADD CONSTRAINT "DramaProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSummary" ADD CONSTRAINT "ProjectSummary_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DramaProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DramaProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DramaProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shot" ADD CONSTRAINT "Shot_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DialogueLine" ADD CONSTRAINT "DialogueLine_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "Shot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SegmentLine" ADD CONSTRAINT "SegmentLine_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "Segment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoProject" ADD CONSTRAINT "VideoProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoScene" ADD CONSTRAINT "VideoScene_videoProjectId_fkey" FOREIGN KEY ("videoProjectId") REFERENCES "VideoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_videoProjectId_fkey" FOREIGN KEY ("videoProjectId") REFERENCES "VideoProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "Segment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
