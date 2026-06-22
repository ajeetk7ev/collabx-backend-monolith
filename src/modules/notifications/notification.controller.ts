import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { NotificationService } from "./notification.service";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";

export class NotificationController {
  static async getNotifications(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const recipientId = req.user!.id;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const data = await NotificationService.getNotifications({
      workspaceId,
      recipientId,
      page,
      limit,
    });

    res.status(200).json(new ApiResponse(200, data, "Notifications retrieved successfully"));
  }

  static async getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const recipientId = req.user!.id;

    const unreadCount = await NotificationService.getUnreadCount(workspaceId, recipientId);

    res.status(200).json(new ApiResponse(200, { unreadCount }, "Unread count retrieved successfully"));
  }

  static async markRead(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    const recipientId = req.user!.id;

    if (isNaN(id)) {
      throw new ApiError(400, "Invalid notification ID");
    }

    await NotificationService.markRead(id, workspaceId, recipientId);

    res.status(200).json(new ApiResponse(200, null, "Notification marked as read"));
  }

  static async markAllRead(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const recipientId = req.user!.id;

    await NotificationService.markAllRead(workspaceId, recipientId);

    res.status(200).json(new ApiResponse(200, null, "All notifications marked as read"));
  }

  static async deleteNotification(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    const recipientId = req.user!.id;

    if (isNaN(id)) {
      throw new ApiError(400, "Invalid notification ID");
    }

    await NotificationService.deleteNotification(id, workspaceId, recipientId);

    res.status(200).json(new ApiResponse(200, null, "Notification deleted successfully"));
  }
}
