import { prisma } from "../../config/prisma";
import { CreateNotificationInput, NotificationQueryFilters } from "./notification.types";

export class NotificationRepository {
  static async create(data: CreateNotificationInput) {
    return prisma.notification.create({
      data: {
        workspaceId: data.workspaceId,
        recipientId: data.recipientId,
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

  static async findMany(filters: NotificationQueryFilters) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      workspaceId: filters.workspaceId,
      recipientId: filters.recipientId,
    };

    if (filters.isRead !== undefined) {
      where.isRead = filters.isRead;
    }

    const items = await prisma.notification.findMany({
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

    const total = await prisma.notification.count({ where });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async countUnread(workspaceId: number, recipientId: number): Promise<number> {
    return prisma.notification.count({
      where: {
        workspaceId,
        recipientId,
        isRead: false,
      },
    });
  }

  static async markAsRead(id: number, workspaceId: number, recipientId: number) {
    return prisma.notification.updateMany({
      where: {
        id,
        workspaceId,
        recipientId,
      },
      data: {
        isRead: true,
      },
    });
  }

  static async markAllAsRead(workspaceId: number, recipientId: number) {
    return prisma.notification.updateMany({
      where: {
        workspaceId,
        recipientId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  static async delete(id: number, workspaceId: number, recipientId: number) {
    return prisma.notification.deleteMany({
      where: {
        id,
        workspaceId,
        recipientId,
      },
    });
  }
}
