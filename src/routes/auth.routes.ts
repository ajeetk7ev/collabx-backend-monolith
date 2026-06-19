import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { validateBody } from "../middlewares/validation.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { signUpSchema, signInSchema } from "../validation/auth.validation";

const router = Router();

router.post("/signup", validateBody(signUpSchema), asyncHandler(AuthController.signUp));
router.post("/signin", validateBody(signInSchema), asyncHandler(AuthController.signIn));
router.post("/logout", asyncHandler(AuthController.logout));
router.post("/refresh", asyncHandler(AuthController.refresh));

export default router;
