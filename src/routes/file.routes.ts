import { Router } from "express";
import { FileController } from "../controllers/file.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { uploadGenericFile } from "../config/multer";

const router = Router({ mergeParams: true });

// All file routes require authentication
router.use(authenticate as any);

// POST /api/v1/workspaces/:workspaceId/files — Upload a file
router.post(
  "/",
  uploadGenericFile.single("file"),
  asyncHandler(FileController.uploadFile as any)
);

// GET /api/v1/workspaces/:workspaceId/files — List files in workspace (with role restrictions)
router.get(
  "/",
  asyncHandler(FileController.listFiles as any)
);

// DELETE /api/v1/workspaces/:workspaceId/files/:id — Delete a file
router.delete(
  "/:id",
  asyncHandler(FileController.deleteFile as any)
);

export default router;
