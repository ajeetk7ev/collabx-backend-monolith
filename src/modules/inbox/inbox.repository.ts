import { prisma } from "../../config/prisma";
import { CreateInboxItemInput, InboxQueryFilters } from "./inbox.types";

export class InboxRepository {
  static async create(data: CreateInboxItemInput) {
    return prisma.inboxItem.create({
      data: {
        workspaceId: data.workspaceId,
        userId: data.userId,
        actorId: data.actorId,
        type: data.type,
        title: data.title,
        description: data.description ?? null,
        entityType: data.entityType ?? null,
        entityId: data.entityId ?? null,
        metadata: data.metadata || {},
      },
      include: {
        actor: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            avatar: true,
            email: true,
          },
        },
      },
    });
  }

  static async findMany(filters: InboxQueryFilters) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      workspaceId: filters.workspaceId,
      userId: filters.userId,
    };

    if (filters.isRead !== undefined) {
      where.isRead = filters.isRead;
    }

    const items = await prisma.inboxItem.findMany({
      where,
      skip,
      take: limit,
      include: {
        actor: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            avatar: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const total = await prisma.inboxItem.count({ where });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async countUnread(workspaceId: number, userId: number): Promise<number> {
    return prisma.inboxItem.count({
      where: {
        workspaceId,
        userId,
        isRead: false,
      },
    });
  }

  static async markAsRead(id: number, workspaceId: number, userId: number) {
    return prisma.inboxItem.updateMany({
      where: {
        id,
        workspaceId,
        userId,
      },
      data: {
        isRead: true,
      },
    });
  }

  static async markAllAsRead(workspaceId: number, userId: number) {
    return prisma.inboxItem.updateMany({
      where: {
        workspaceId,
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }
}
