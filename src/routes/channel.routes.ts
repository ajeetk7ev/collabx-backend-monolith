import { Router } from "express";
import { ChannelController } from "../controllers/channel.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { verifyWorkspaceAccess } from "../middlewares/workspace-auth.middleware";
import { validateBody } from "../middlewares/validation.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import {
  createChannelSchema,
  updateChannelSchema,
  sendMessageSchema,
} from "../validation/channel.validation";

const router = Router({ mergeParams: true });

// All channel routes require authentication and active workspace membership
router.use(authenticate as any);
router.use(verifyWorkspaceAccess as any);

router.get("/", asyncHandler(ChannelController.list as any));
router.post("/", validateBody(createChannelSchema) as any, asyncHandler(ChannelController.create as any));
router.patch("/:id", validateBody(updateChannelSchema) as any, asyncHandler(ChannelController.update as any));
router.delete("/:id", asyncHandler(ChannelController.delete as any));

// Messaging
router.get("/:id/messages", asyncHandler(ChannelController.listMessages as any));
router.post("/:id/messages", validateBody(sendMessageSchema) as any, asyncHandler(ChannelController.sendMessage as any));

// Reactions & Threading
router.post("/:id/messages/:messageId/reactions", asyncHandler(ChannelController.toggleReaction as any));
router.get("/:id/messages/:messageId/replies", asyncHandler(ChannelController.listReplies as any));

export default router;
