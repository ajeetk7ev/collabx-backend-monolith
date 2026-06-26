import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { prisma } from "../config/prisma";
import { RedisService } from "../shared/redis/redis.service";
import { ApiResponse } from "../utils/ApiResponse";

export class PresenceController {
  /**
   * GET /api/v1/workspaces/:workspaceId/presence
   * Returns online status and last seen timestamps of all workspace members.
   */
  static async getWorkspacePresence(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    if (isNaN(workspaceId)) {
      res.status(400).json(new ApiResponse(400, null, "Invalid workspace ID"));
      return;
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId, status: "active" },
      select: { userId: true },
    });

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });

    const userIds = new Set<number>();
    if (workspace) userIds.add(workspace.ownerId);
    members.forEach((m) => userIds.add(m.userId));

    const presence: Record<number, { online: boolean; lastSeen: string | null }> = {};
    for (const userId of userIds) {
      const online = await RedisService.isUserOnline(userId);
      const lastSeen = await RedisService.getLastSeen(userId);
      presence[userId] = { online, lastSeen };
    }

    res
      .status(200)
      .json(new ApiResponse(200, { presence }, "Presence details fetched successfully"));
  }
}
