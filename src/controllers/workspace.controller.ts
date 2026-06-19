import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { WorkspaceService } from "../services/workspace.service";
import { ApiResponse } from "../utils/ApiResponse";

export class WorkspaceController {
  /**
   * POST /api/v1/workspaces
   * Create a new workspace (multipart/form-data with optional logo).
   */
  static async create(req: AuthRequest, res: Response): Promise<void> {
    const { name, slug } = req.body;
    const logoBuffer = req.file?.buffer;

    console.log("Printing the file buffer in to the controller ", logoBuffer);

    const workspace = await WorkspaceService.create(
      { name, slug },
      req.user!.id,
      logoBuffer,
    );

    res
      .status(201)
      .json(
        new ApiResponse(201, { workspace }, "Workspace created successfully"),
      );
  }

  /**
   * GET /api/v1/workspaces
   * Get all workspaces owned by the authenticated user.
   */
  static async getMyWorkspaces(req: AuthRequest, res: Response): Promise<void> {
    const workspaces = await WorkspaceService.getByOwnerId(req.user!.id);

    res
      .status(200)
      .json(
        new ApiResponse(200, { workspaces }, "Workspaces fetched successfully"),
      );
  }

  /**
   * GET /api/v1/workspaces/:id
   * Get a single workspace by ID.
   */
  static async getById(req: AuthRequest, res: Response): Promise<void> {
    const id = parseInt(req.params.id as string, 10);

    if (isNaN(id)) {
      res.status(400).json(new ApiResponse(400, null, "Invalid workspace ID"));
      return;
    }

    const workspace = await WorkspaceService.getById(id);

    res
      .status(200)
      .json(
        new ApiResponse(200, { workspace }, "Workspace fetched successfully"),
      );
  }

  /**
   * PATCH /api/v1/workspaces/:id
   * Update a workspace (multipart/form-data with optional new logo).
   */
  static async update(req: AuthRequest, res: Response): Promise<void> {
    const id = parseInt(req.params.id as string, 10);

    if (isNaN(id)) {
      res.status(400).json(new ApiResponse(400, null, "Invalid workspace ID"));
      return;
    }

    const { name, slug } = req.body;
    const logoBuffer = req.file?.buffer;

    const workspace = await WorkspaceService.update(
      id,
      { name, slug },
      req.user!.id,
      logoBuffer,
    );

    res
      .status(200)
      .json(
        new ApiResponse(200, { workspace }, "Workspace updated successfully"),
      );
  }

  /**
   * DELETE /api/v1/workspaces/:id
   * Delete a workspace.
   */
  static async delete(req: AuthRequest, res: Response): Promise<void> {
    const id = parseInt(req.params.id as string, 10);

    if (isNaN(id)) {
      res.status(400).json(new ApiResponse(400, null, "Invalid workspace ID"));
      return;
    }

    await WorkspaceService.delete(id, req.user!.id);

    res
      .status(200)
      .json(new ApiResponse(200, null, "Workspace deleted successfully"));
  }
}
