import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { WorkspaceMemberService } from "../services/workspace-member.service";
import { ApiResponse } from "../utils/ApiResponse";

export class WorkspaceMemberController {
  static async addMember(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const { firstname, lastname, email, password, role, status, presence } =
      req.body;

    if (isNaN(workspaceId)) {
      res.status(400).json(new ApiResponse(400, null, "Invalid workspace ID"));
      return;
    }

    const member = await WorkspaceMemberService.addMember(workspaceId, {
      firstname,
      lastname,
      email,
      password,
      role,
      status,
      presence,
      ...(req.file && { avatarBuffer: req.file.buffer }),
    });

    res
      .status(201)
      .json(new ApiResponse(201, { member }, "Member added successfully"));
  }

  static async getMembers(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const q = (req.query.q as string) || "";
    const role = (req.query.role as string) || "all";

    if (isNaN(workspaceId)) {
      res.status(400).json(new ApiResponse(400, null, "Invalid workspace ID"));
      return;
    }

    const { members, meta } = await WorkspaceMemberService.getMembers(workspaceId, {
      page,
      limit,
      q,
      role,
    });

    res
      .status(200)
      .json(new ApiResponse(200, { members, meta }, "Members fetched successfully"));
  }

  static async updateMember(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const memberId = parseInt(req.params.memberId as string, 10);
    const { role, status, presence } = req.body;

    if (isNaN(workspaceId) || isNaN(memberId)) {
      res.status(400).json(new ApiResponse(400, null, "Invalid ID"));
      return;
    }

    const member = await WorkspaceMemberService.updateMember(
      workspaceId,
      memberId,
      {
        role,
        status,
        presence,
        ...(req.file && { avatarBuffer: req.file.buffer }),
      },
    );

    res
      .status(200)
      .json(new ApiResponse(200, { member }, "Member updated successfully"));
  }

  static async removeMember(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const memberId = parseInt(req.params.memberId as string, 10);

    if (isNaN(workspaceId) || isNaN(memberId)) {
      res.status(400).json(new ApiResponse(400, null, "Invalid ID"));
      return;
    }

    await WorkspaceMemberService.removeMember(workspaceId, memberId);

    res
      .status(200)
      .json(new ApiResponse(200, null, "Member removed successfully"));
  }
}
