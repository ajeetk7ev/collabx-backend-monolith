import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { getSocketIOInstance } from "../shared/socket/socket.service";

export class ChannelService {
  /**
   * Helper to broadcast a real-time event to all active workspace member socket rooms.
   */
  private static async broadcastToWorkspace(workspaceId: number, event: string, payload: any) {
    try {
      const io = getSocketIOInstance();
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId, status: "active" },
        select: { userId: true },
      });
      
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { ownerId: true },
      });

      const userIds = new Set<number>();
      if (workspace) userIds.add(workspace.ownerId);
      members.forEach((m) => userIds.add(m.userId));

      for (const id of userIds) {
        io.to(`user:${id}`).emit(event, payload);
      }
    } catch (err) {
      console.warn("Socket broadcast failed:", err);
    }
  }

  /**
   * List workspace channels with privacy filtering.
   */
  static async list(workspaceId: number, userId: number) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });

    const isWorkspaceOwner = workspace?.ownerId === userId;
    const isOwnerOrAdmin = isWorkspaceOwner || member?.role === "owner" || member?.role === "admin";

    const channels = await prisma.channel.findMany({
      where: { workspaceId },
      include: {
        creator: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            avatar: true,
          },
        },
        members: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (isOwnerOrAdmin) {
      return channels;
    }

    return channels.filter(
      (c) => !c.isPrivate || c.members.some((m) => m.userId === userId)
    );
  }

  /**
   * Create a channel.
   */
  static async create(
    workspaceId: number,
    creatorId: number,
    data: { name: string; description?: string; isPrivate?: boolean; memberIds?: number[] }
  ) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: creatorId, workspaceId } },
    });

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });

    const isWorkspaceOwner = workspace?.ownerId === creatorId;
    const isOwnerOrAdmin = isWorkspaceOwner || member?.role === "owner" || member?.role === "admin";

    if (!isOwnerOrAdmin) {
      throw new ApiError(403, "Access denied. Only workspace owners and admins can create channels.");
    }

    const connectMembers = data.memberIds && data.memberIds.length > 0
      ? {
          connect: await prisma.workspaceMember.findMany({
            where: {
              workspaceId,
              userId: { in: data.memberIds },
            },
            select: { id: true },
          }),
        }
      : undefined;

    const channel = await prisma.channel.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        isPrivate: data.isPrivate ?? false,
        workspaceId,
        creatorId,
        ...(connectMembers ? { members: connectMembers } : {}),
      },
      include: {
        creator: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            avatar: true,
          },
        },
        members: {
          select: {
            userId: true,
          },
        },
      },
    });

    await this.broadcastToWorkspace(workspaceId, "channel:created", channel);

    return channel;
  }

  /**
   * Update a channel.
   */
  static async update(
    id: number,
    workspaceId: number,
    data: { name?: string; description?: string; isPrivate?: boolean; memberIds?: number[] }
  ) {
    const existing = await prisma.channel.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      throw new ApiError(404, "Channel not found.");
    }

    let membersData = undefined;
    if (data.memberIds) {
      const workspaceMembers = await prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          userId: { in: data.memberIds },
        },
        select: { id: true },
      });
      membersData = {
        set: workspaceMembers,
      };
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description ?? null;
    if (data.isPrivate !== undefined) updateData.isPrivate = data.isPrivate;
    if (membersData !== undefined) updateData.members = membersData;

    const updated = await prisma.channel.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            avatar: true,
          },
        },
        members: {
          select: {
            userId: true,
          },
        },
      },
    });

    await this.broadcastToWorkspace(workspaceId, "channel:updated", updated);

    return updated;
  }

  /**
   * Delete a channel.
   */
  static async delete(id: number, workspaceId: number) {
    const existing = await prisma.channel.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      throw new ApiError(404, "Channel not found.");
    }

    await prisma.channel.delete({
      where: { id },
    });

    await this.broadcastToWorkspace(workspaceId, "channel:deleted", { id });

    return true;
  }

  /**
   * List messages in a channel using cursor-based pagination (infinite scroll).
   */
  static async listMessages(
    channelId: number,
    workspaceId: number,
    userId: number,
    cursor?: number,
    limit: number = 30
  ) {
    const channel = await prisma.channel.findFirst({
      where: { id: channelId, workspaceId },
    });
    if (!channel) {
      throw new ApiError(404, "Channel not found.");
    }

    const messages = await prisma.message.findMany({
      where: {
        channelId,
        parentId: null,
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: "desc" },
      include: {
        author: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            avatar: true,
          },
        },
        reactions: {
          select: {
            userId: true,
            emoji: true,
          },
        },
        files: true,
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    let nextCursor: number | null = null;
    let items = [...messages];
    if (items.length > limit) {
      const lastItem = items.pop();
      nextCursor = lastItem!.id;
    }

    const formatted = items.map((m) => {
      const reactionsGrouped = m.reactions.reduce((acc: any[], r) => {
        const existing = acc.find((x) => x.emoji === r.emoji);
        if (existing) {
          existing.count++;
          if (r.userId === userId) existing.mine = true;
        } else {
          acc.push({
            emoji: r.emoji,
            count: 1,
            mine: r.userId === userId,
          });
        }
        return acc;
      }, []);

      const { reactions, _count, ...rest } = m;
      return {
        ...rest,
        reactions: reactionsGrouped,
        replyCount: _count.replies,
      };
    });

    return {
      messages: formatted.reverse(),
      nextCursor,
    };
  }

  /**
   * Send a channel message (with threading & file supports).
   */
  static async sendMessage(
    channelId: number,
    workspaceId: number,
    authorId: number,
    data: { body: string; parentId?: number; fileIds?: number[] }
  ) {
    const channel = await prisma.channel.findFirst({
      where: { id: channelId, workspaceId },
    });
    if (!channel) {
      throw new ApiError(404, "Channel not found.");
    }

    if (data.parentId) {
      const parentMessage = await prisma.message.findFirst({
        where: { id: data.parentId, channelId },
      });
      if (!parentMessage) {
        throw new ApiError(404, "Thread parent message not found.");
      }
    }

    const message = await prisma.message.create({
      data: {
        body: data.body,
        channelId,
        authorId,
        parentId: data.parentId ?? null,
        ...(data.fileIds && data.fileIds.length > 0
          ? {
              files: {
                connect: data.fileIds.map((id) => ({ id })),
              },
            }
          : {}),
      },
      include: {
        author: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            avatar: true,
          },
        },
        reactions: {
          select: {
            userId: true,
            emoji: true,
          },
        },
        files: true,
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    const formatted = {
      ...message,
      reactions: [],
      replyCount: message._count.replies,
    };

    await this.broadcastToWorkspace(workspaceId, data.parentId ? "thread:reply" : "message:new", formatted);

    return formatted;
  }

  /**
   * Toggle emoji reaction.
   */
  static async toggleReaction(
    messageId: number,
    channelId: number,
    workspaceId: number,
    userId: number,
    emoji: string
  ) {
    const message = await prisma.message.findFirst({
      where: { id: messageId, channelId },
    });
    if (!message) {
      throw new ApiError(404, "Message not found.");
    }

    const existingReaction = await prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
    });

    if (existingReaction) {
      await prisma.messageReaction.delete({
        where: {
          messageId_userId_emoji: {
            messageId,
            userId,
            emoji,
          },
        },
      });
    } else {
      await prisma.messageReaction.create({
        data: {
          messageId,
          userId,
          emoji,
        },
      });
    }

    const allReactions = await prisma.messageReaction.findMany({
      where: { messageId },
    });

    const reactionsGrouped = allReactions.reduce((acc: any[], r) => {
      const existing = acc.find((x) => x.emoji === r.emoji);
      if (existing) {
        existing.count++;
        if (r.userId === userId) existing.mine = true;
      } else {
        acc.push({
          emoji: r.emoji,
          count: 1,
          mine: r.userId === userId,
        });
      }
      return acc;
    }, []);

    const payload = {
      messageId,
      channelId,
      reactions: reactionsGrouped,
    };

    await this.broadcastToWorkspace(workspaceId, "message:reaction", payload);

    return payload;
  }

  /**
   * Fetch thread replies.
   */
  static async listReplies(messageId: number, channelId: number, workspaceId: number, userId: number) {
    const message = await prisma.message.findFirst({
      where: { id: messageId, channelId },
    });
    if (!message) {
      throw new ApiError(404, "Message not found.");
    }

    const replies = await prisma.message.findMany({
      where: { parentId: messageId },
      orderBy: { id: "asc" },
      include: {
        author: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            avatar: true,
          },
        },
        reactions: {
          select: {
            userId: true,
            emoji: true,
          },
        },
        files: true,
      },
    });

    return replies.map((m) => {
      const reactionsGrouped = m.reactions.reduce((acc: any[], r) => {
        const existing = acc.find((x) => x.emoji === r.emoji);
        if (existing) {
          existing.count++;
          if (r.userId === userId) existing.mine = true;
        } else {
          acc.push({
            emoji: r.emoji,
            count: 1,
            mine: r.userId === userId,
          });
        }
        return acc;
      }, []);

      const { reactions, ...rest } = m;
      return {
        ...rest,
        reactions: reactionsGrouped,
      };
    });
  }
}
