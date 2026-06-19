import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";
import { ApiError } from "../utils/ApiError";

/**
 * Factory middleware that restricts access to users with specific roles.
 * Must be placed AFTER the `authenticate` middleware in the chain.
 *
 * @param roles - Allowed roles (e.g., "owner", "admin")
 */
export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required before role check.");
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Access denied. Required role(s): ${roles.join(", ")}. Your role: ${req.user.role}.`
      );
    }

    next();
  };
};
