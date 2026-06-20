import { Router } from "express";
import { WorkspaceMemberController } from "../controllers/workspace-member.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { validateBody } from "../middlewares/validation.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import {
  addWorkspaceMemberSchema,
  updateWorkspaceMemberSchema,
} from "../validation/workspace-member.validation";

const router = Router({ mergeParams: true });

router.use(authenticate as any);

router.post(
  "/",
  authorizeRoles("owner", "admin") as any,
  validateBody(addWorkspaceMemberSchema) as any,
  asyncHandler(WorkspaceMemberController.addMember as any)
);

router.get(
  "/",
  asyncHandler(WorkspaceMemberController.getMembers as any)
);

router.patch(
  "/:memberId",
  authorizeRoles("owner", "admin") as any,
  validateBody(updateWorkspaceMemberSchema) as any,
  asyncHandler(WorkspaceMemberController.updateMember as any)
);

router.delete(
  "/:memberId",
  authorizeRoles("owner", "admin") as any,
  asyncHandler(WorkspaceMemberController.removeMember as any)
);

export default router;
