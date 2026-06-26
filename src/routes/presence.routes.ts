import { Router } from "express";
import { PresenceController } from "../controllers/presence.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { verifyWorkspaceAccess } from "../middlewares/workspace-auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router({ mergeParams: true });

router.use(authenticate as any);
router.use(verifyWorkspaceAccess as any);

router.get("/", asyncHandler(PresenceController.getWorkspacePresence as any));

export default router;
