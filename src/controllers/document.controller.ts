import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { DocumentService } from "../services/document.service";
import { ApiResponse } from "../utils/ApiResponse";

export class DocumentController {
  /**
   * GET /api/v1/workspaces/:workspaceId/docs
   */
  static async list(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    if (isNaN(workspaceId)) {
      res.status(400).json(new ApiResponse(400, null, "Invalid workspace ID"));
      return;
    }

    const docs = await DocumentService.list(workspaceId, req.user!.id);
    res
      .status(200)
      .json(new ApiResponse(200, { docs }, "Documents fetched successfully"));
  }

  /**
   * GET /api/v1/workspaces/:workspaceId/docs/:id
   */
  static async getById(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const id = parseInt(req.params.id as string, 10);

    if (isNaN(workspaceId) || isNaN(id)) {
      res.status(400).json(new ApiResponse(400, null, "Invalid parameters"));
      return;
    }

    const doc = await DocumentService.getById(id, workspaceId, req.user!.id);
    res
      .status(200)
      .json(new ApiResponse(200, { doc }, "Document fetched successfully"));
  }

  /**
   * POST /api/v1/workspaces/:workspaceId/docs
   */
  static async create(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    if (isNaN(workspaceId)) {
      res.status(400).json(new ApiResponse(400, null, "Invalid workspace ID"));
      return;
    }

    const doc = await DocumentService.create(
      workspaceId,
      req.user!.id,
      req.body
    );

    res
      .status(201)
      .json(new ApiResponse(201, { doc }, "Document created successfully"));
  }

  /**
   * PATCH /api/v1/workspaces/:workspaceId/docs/:id
   */
  static async update(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const id = parseInt(req.params.id as string, 10);

    if (isNaN(workspaceId) || isNaN(id)) {
      res.status(400).json(new ApiResponse(400, null, "Invalid parameters"));
      return;
    }

    const doc = await DocumentService.update(
      id,
      workspaceId,
      req.user!.id,
      req.body
    );

    res
      .status(200)
      .json(new ApiResponse(200, { doc }, "Document updated successfully"));
  }

  /**
   * DELETE /api/v1/workspaces/:workspaceId/docs/:id
   */
  static async delete(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const id = parseInt(req.params.id as string, 10);

    if (isNaN(workspaceId) || isNaN(id)) {
      res.status(400).json(new ApiResponse(400, null, "Invalid parameters"));
      return;
    }

    await DocumentService.delete(id, workspaceId);
    res
      .status(200)
      .json(new ApiResponse(200, null, "Document deleted successfully"));
  }

  /**
   * POST /api/v1/workspaces/:workspaceId/docs/:id/favorite
   */
  static async toggleFavorite(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const id = parseInt(req.params.id as string, 10);

    if (isNaN(workspaceId) || isNaN(id)) {
      res.status(400).json(new ApiResponse(400, null, "Invalid parameters"));
      return;
    }

    const result = await DocumentService.toggleFavorite(
      id,
      workspaceId,
      req.user!.id
    );

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          result,
          result.isFavorite ? "Added to favorites" : "Removed from favorites"
        )
      );
  }
}
