import { Router } from "express";
import { NotificationController } from "./notification.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { verifyWorkspaceAccess } from "../../middlewares/workspace-auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router({ mergeParams: true });

// Ensure user is logged in and belongs to the workspace
router.use(authenticate as any);
router.use(verifyWorkspaceAccess as any);

router.get("/", asyncHandler(NotificationController.getNotifications as any));
router.get("/unread-count", asyncHandler(NotificationController.getUnreadCount as any));
router.patch("/:id/read", asyncHandler(NotificationController.markRead as any));
router.patch("/read-all", asyncHandler(NotificationController.markAllRead as any));
router.delete("/:id", asyncHandler(NotificationController.deleteNotification as any));

export default router;
