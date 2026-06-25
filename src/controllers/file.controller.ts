import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { FileService } from "../services/file.service";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

export class FileController {
  /**
   * Handle uploading a generic file in a workspace.
   */
  static async uploadFile(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const userId = req.user!.id;
    const channelId = req.body.channelId ? parseInt(req.body.channelId as string, 10) : undefined;

    if (isNaN(workspaceId)) {
      throw new ApiError(400, "Invalid workspace ID");
    }

    if (!req.file) {
      throw new ApiError(400, "No file provided for upload");
    }

    const file = await FileService.uploadFile(workspaceId, userId, req.file, channelId);

    res.status(201).json(new ApiResponse(201, file, "File uploaded successfully"));
  }

  /**
   * Handle listing all files in a workspace (with search).
   * Enforces that regular members only see their own files.
   */
  static async listFiles(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const userId = req.user!.id;
    const q = req.query.q as string | undefined;

    if (isNaN(workspaceId)) {
      throw new ApiError(400, "Invalid workspace ID");
    }

    const files = await FileService.listFiles(workspaceId, userId, { q });

    res.status(200).json(new ApiResponse(200, files, "Files fetched successfully"));
  }

  /**
   * Handle deleting a file from the workspace.
   * Enforces uploader or workspace admin/owner permission check.
   */
  static async deleteFile(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const fileId = parseInt(req.params.id as string, 10);
    const userId = req.user!.id;

    if (isNaN(workspaceId)) {
      throw new ApiError(400, "Invalid workspace ID");
    }
    if (isNaN(fileId)) {
      throw new ApiError(400, "Invalid file ID");
    }

    await FileService.deleteFile(workspaceId, userId, fileId);

    res.status(200).json(new ApiResponse(200, null, "File deleted successfully"));
  }
}
