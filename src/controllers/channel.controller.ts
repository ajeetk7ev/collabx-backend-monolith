import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { ChannelService } from "../services/channel.service";
import { ApiResponse } from "../utils/ApiResponse";

export class ChannelController {
  static async list(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    if (isNaN(workspaceId)) {
      res.status(400).json(new ApiResponse(400, null, "Invalid workspace ID"));
      return;
    }

    const channels = await ChannelService.list(workspaceId, req.user!.id);
    res
      .status(200)
      .json(new ApiResponse(200, { channels }, "Channels fetched successfully"));
  }

  static async create(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    if (isNaN(workspaceId)) {
      res.status(400).json(new ApiResponse(400, null, "Invalid workspace ID"));
      return;
    }

    const channel = await ChannelService.create(
      workspaceId,
      req.user!.id,
      req.body
    );

    res
      .status(201)
      .json(new ApiResponse(201, { channel }, "Channel created successfully"));
  }

  static async update(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const id = parseInt(req.params.id as string, 10);

    if (isNaN(workspaceId) || isNaN(id)) {
      res.status(400).json(new ApiResponse(400, null, "Invalid parameters"));
      return;
    }

    const channel = await ChannelService.update(id, workspaceId, req.body);
    res
      .status(200)
      .json(new ApiResponse(200, { channel }, "Channel updated successfully"));
  }

  static async delete(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const id = parseInt(req.params.id as string, 10);

    if (isNaN(workspaceId) || isNaN(id)) {
      res.status(400).json(new ApiResponse(400, null, "Invalid parameters"));
      return;
    }

    await ChannelService.delete(id, workspaceId);
    res
      .status(200)
      .json(new ApiResponse(200, null, "Channel deleted successfully"));
  }

  static async listMessages(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const channelId = parseInt(req.params.id as string, 10);

    if (isNaN(workspaceId) || isNaN(channelId)) {
      res.status(400).json(new ApiResponse(400, null, "Invalid parameters"));
      return;
    }

    const cursor = req.query.cursor ? parseInt(req.query.cursor as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const result = await ChannelService.listMessages(
      channelId,
      workspaceId,
      req.user!.id,
      cursor,
      limit
    );

    res
      .status(200)
      .json(new ApiResponse(200, result, "Messages fetched successfully"));
  }

  static async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const channelId = parseInt(req.params.id as string, 10);

    if (isNaN(workspaceId) || isNaN(channelId)) {
      res.status(400).json(new ApiResponse(400, null, "Invalid parameters"));
      return;
    }

    const message = await ChannelService.sendMessage(
      channelId,
      workspaceId,
      req.user!.id,
      req.body
    );

    res
      .status(201)
      .json(new ApiResponse(201, { message }, "Message sent successfully"));
  }

  static async toggleReaction(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const channelId = parseInt(req.params.id as string, 10);
    const messageId = parseInt(req.params.messageId as string, 10);

    if (isNaN(workspaceId) || isNaN(channelId) || isNaN(messageId)) {
      res.status(400).json(new ApiResponse(400, null, "Invalid parameters"));
      return;
    }

    const { emoji } = req.body;
    if (!emoji) {
      res.status(400).json(new ApiResponse(400, null, "Emoji is required"));
      return;
    }

    const result = await ChannelService.toggleReaction(
      messageId,
      channelId,
      workspaceId,
      req.user!.id,
      emoji
    );

    res
      .status(200)
      .json(new ApiResponse(200, result, "Reaction updated successfully"));
  }

  static async listReplies(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const channelId = parseInt(req.params.id as string, 10);
    const messageId = parseInt(req.params.messageId as string, 10);

    if (isNaN(workspaceId) || isNaN(channelId) || isNaN(messageId)) {
      res.status(400).json(new ApiResponse(400, null, "Invalid parameters"));
      return;
    }

    const replies = await ChannelService.listReplies(
      messageId,
      channelId,
      workspaceId,
      req.user!.id
    );

    res
      .status(200)
      .json(new ApiResponse(200, { replies }, "Replies fetched successfully"));
  }
}
