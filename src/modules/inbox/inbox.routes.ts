import { Router } from "express";
import { InboxController } from "./inbox.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { verifyWorkspaceAccess } from "../../middlewares/workspace-auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router({ mergeParams: true });

// Ensure user is logged in and belongs to the workspace
router.use(authenticate as any);
router.use(verifyWorkspaceAccess as any);

router.get("/", asyncHandler(InboxController.getActivities as any));
router.get("/unread-count", asyncHandler(InboxController.getUnreadCount as any));
router.patch("/:id/read", asyncHandler(InboxController.markRead as any));
router.patch("/read-all", asyncHandler(InboxController.markAllRead as any));

export default router;
