import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";
import { ApiError } from "../utils/ApiError";
import { prisma } from "../config/prisma";

/**
 * Middleware to verify that the authenticated user is either the owner
 * or an active member of the specified workspace.
 */
export const verifyWorkspaceAccess = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, "Authentication required.");
    }

    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    if (isNaN(workspaceId)) {
      throw new ApiError(400, "Invalid workspace ID parameter.");
    }

    const userId = req.user.id;

    // Check if the workspace exists and if the user is the owner OR a member
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId,
                status: "active",
              },
            },
          },
        ],
      },
    });

    if (!workspace) {
      throw new ApiError(
        403,
        "Access denied. You are not authorized to view this workspace's resources."
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};
