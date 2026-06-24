import { Router } from "express";
import { WorkspaceController } from "../controllers/workspace.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { validateBody } from "../middlewares/validation.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { upload } from "../config/multer";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
} from "../validation/workspace.validation";
import workspaceMemberRoutes from "./workspace-member.routes";
import taskRoutes from "./task.routes";

const router = Router();

router.use("/:workspaceId/members", workspaceMemberRoutes);
router.use("/:workspaceId/tasks", taskRoutes);

// All workspace routes require authentication
router.use(authenticate as any);

// POST /api/v1/workspaces — Create workspace (owner only)
router.post(
  "/",
  authorizeRoles("owner") as any,
  upload.single("logo"),
  validateBody(createWorkspaceSchema),
  asyncHandler(WorkspaceController.create as any)
);

// GET /api/v1/workspaces — Get my workspaces
router.get(
  "/",
  asyncHandler(WorkspaceController.getMyWorkspaces as any)
);

// GET /api/v1/workspaces/:id — Get workspace by ID
router.get(
  "/:id",
  asyncHandler(WorkspaceController.getById as any)
);

// PATCH /api/v1/workspaces/:id — Update workspace (owner only)
router.patch(
  "/:id",
  authorizeRoles("owner") as any,
  upload.single("logo"),
  validateBody(updateWorkspaceSchema),
  asyncHandler(WorkspaceController.update as any)
);

// DELETE /api/v1/workspaces/:id — Delete workspace (owner only)
router.delete(
  "/:id",
  authorizeRoles("owner") as any,
  asyncHandler(WorkspaceController.delete as any)
);

export default router;
