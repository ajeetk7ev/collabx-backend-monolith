import { Router } from "express";
import { TaskController } from "../controllers/task.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { verifyWorkspaceAccess } from "../middlewares/workspace-auth.middleware";
import { validateBody } from "../middlewares/validation.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  createCommentSchema,
} from "../validation/task.validation";

const router = Router({ mergeParams: true });

// All task routes require authentication and active workspace membership
router.use(authenticate as any);
router.use(verifyWorkspaceAccess as any);

router.get("/", asyncHandler(TaskController.listTasks as any));
router.post("/", validateBody(createTaskSchema) as any, asyncHandler(TaskController.createTask as any));
router.patch("/:id", validateBody(updateTaskSchema) as any, asyncHandler(TaskController.updateTask as any));
router.patch("/:id/status", validateBody(updateTaskStatusSchema) as any, asyncHandler(TaskController.updateTaskStatus as any));
router.delete("/:id", asyncHandler(TaskController.deleteTask as any));

router.post("/:id/comments", validateBody(createCommentSchema) as any, asyncHandler(TaskController.addComment as any));
router.delete("/:id/comments/:commentId", asyncHandler(TaskController.deleteComment as any));

export default router;
