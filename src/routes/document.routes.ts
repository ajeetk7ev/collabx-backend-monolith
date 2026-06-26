import { Router } from "express";
import { DocumentController } from "../controllers/document.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { verifyWorkspaceAccess } from "../middlewares/workspace-auth.middleware";
import { validateBody } from "../middlewares/validation.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import {
  createDocumentSchema,
  updateDocumentSchema,
} from "../validation/document.validation";

const router = Router({ mergeParams: true });

// All document routes require authentication and active workspace membership
router.use(authenticate as any);
router.use(verifyWorkspaceAccess as any);

router.get("/", asyncHandler(DocumentController.list as any));
router.post("/", validateBody(createDocumentSchema) as any, asyncHandler(DocumentController.create as any));
router.get("/:id", asyncHandler(DocumentController.getById as any));
router.patch("/:id", validateBody(updateDocumentSchema) as any, asyncHandler(DocumentController.update as any));
router.delete("/:id", asyncHandler(DocumentController.delete as any));
router.post("/:id/favorite", asyncHandler(DocumentController.toggleFavorite as any));

export default router;
