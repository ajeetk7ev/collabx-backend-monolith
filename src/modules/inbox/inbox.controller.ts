import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { InboxService } from "./inbox.service";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";

export class InboxController {
  static async getActivities(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const data = await InboxService.getActivities({
      workspaceId,
      userId,
      page,
      limit,
    });

    res.status(200).json(new ApiResponse(200, data, "Inbox activities retrieved successfully"));
  }

  static async getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const userId = req.user!.id;

    const unreadCount = await InboxService.getUnreadCount(workspaceId, userId);

    res.status(200).json(new ApiResponse(200, { unreadCount }, "Unread count retrieved successfully"));
  }

  static async markRead(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    const userId = req.user!.id;

    if (isNaN(id)) {
      throw new ApiError(400, "Invalid inbox item ID");
    }

    await InboxService.markRead(id, workspaceId, userId);

    res.status(200).json(new ApiResponse(200, null, "Inbox item marked as read"));
  }

  static async markAllRead(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const userId = req.user!.id;

    await InboxService.markAllRead(workspaceId, userId);

    res.status(200).json(new ApiResponse(200, null, "All inbox items marked as read"));
  }
}
