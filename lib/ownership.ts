// lib/ownership.ts — helper tra cứu entity kèm kiểm tra quyền sở hữu
// (userId), dùng chung giữa nhiều route handler để tránh lặp code.

import { prisma } from "./prisma";

export function findOwnedEpisode(userId: string, episodeId: string) {
  return prisma.episode.findFirst({
    where: { id: episodeId, project: { userId } },
    include: { project: { include: { summary: true } } },
  });
}

export function findOwnedSegment(userId: string, segmentId: string) {
  return prisma.segment.findFirst({
    where: { id: segmentId, episode: { project: { userId } } },
    include: { lines: { orderBy: { order: "asc" } } },
  });
}

export function findOwnedVideoProject(userId: string, videoProjectId: string) {
  return prisma.videoProject.findFirst({ where: { id: videoProjectId, userId } });
}

export function findOwnedAsset(userId: string, assetId: string) {
  return prisma.asset.findFirst({ where: { id: assetId, userId } });
}
