import { NotificationRepository } from "./notification.repository";
import { CreateNotificationInput, NotificationQueryFilters } from "./notification.types";
import { RedisService } from "../../shared/redis/redis.service";
import { sendToUser } from "../../shared/socket/socket.service";
import { createNotificationFromEvent } from "./notification.events";

export class NotificationService {
  static async createNotification(data: CreateNotificationInput) {
    return createNotificationFromEvent(data);
  }

  static async getNotifications(filters: NotificationQueryFilters) {
    return NotificationRepository.findMany(filters);
  }

  static async getUnreadCount(workspaceId: number, recipientId: number): Promise<number> {
    // Try retrieving count from Redis cache
    let count = await RedisService.getUnreadNotificationCount(workspaceId, recipientId);
    
    if (count === null) {
      // Cache miss: query Postgres and populate Redis
      count = await NotificationRepository.countUnread(workspaceId, recipientId);
      await RedisService.setUnreadNotificationCount(workspaceId, recipientId, count);
    }
    
    return count;
  }

  static async markRead(id: number, workspaceId: number, recipientId: number) {
    await NotificationRepository.markAsRead(id, workspaceId, recipientId);
    
    // Invalidate Redis count cache and compute new count
    await RedisService.deleteNotificationCountCache(workspaceId, recipientId);
    const count = await this.getUnreadCount(workspaceId, recipientId);

    // Broadcast count update to user
    await sendToUser(recipientId, "notifications:count", {
      workspaceId,
      unreadNotificationsCount: count,
    });
  }

  static async markAllRead(workspaceId: number, recipientId: number) {
    await NotificationRepository.markAllAsRead(workspaceId, recipientId);
    
    // Force Redis cache to 0
    await RedisService.clearUnreadNotificationCount(workspaceId, recipientId);

    // Broadcast count update to user
    await sendToUser(recipientId, "notifications:count", {
      workspaceId,
      unreadNotificationsCount: 0,
    });
  }

  static async deleteNotification(id: number, workspaceId: number, recipientId: number) {
    await NotificationRepository.delete(id, workspaceId, recipientId);

    // Invalidate Redis count cache and compute new count
    await RedisService.deleteNotificationCountCache(workspaceId, recipientId);
    const count = await this.getUnreadCount(workspaceId, recipientId);

    // Broadcast count update to user
    await sendToUser(recipientId, "notifications:count", {
      workspaceId,
      unreadNotificationsCount: count,
    });
  }
}
