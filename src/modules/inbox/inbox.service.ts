import { InboxRepository } from "./inbox.repository";
import { CreateInboxItemInput, InboxQueryFilters } from "./inbox.types";
import { RedisService } from "../../shared/redis/redis.service";
import { sendToUser } from "../../shared/socket/socket.service";

export class InboxService {
  static async createInboxItem(data: CreateInboxItemInput) {
    const inboxItem = await InboxRepository.create(data);
    
    // Invalidate Redis unread count cache
    await RedisService.deleteInboxCountCache(data.workspaceId, data.userId);
    const count = await this.getUnreadCount(data.workspaceId, data.userId);

    // Broadcast new inbox item and updated counts via sockets
    await sendToUser(data.userId, "inbox:new", inboxItem);
    await sendToUser(data.userId, "notifications:count", {
      workspaceId: data.workspaceId,
      unreadInboxCount: count,
    });

    return inboxItem;
  }

  static async getActivities(filters: InboxQueryFilters) {
    return InboxRepository.findMany(filters);
  }

  static async getUnreadCount(workspaceId: number, userId: number): Promise<number> {
    // Try retrieving count from Redis cache
    let count = await RedisService.getUnreadInboxCount(workspaceId, userId);
    
    if (count === null) {
      // Cache miss: query database and write to Redis
      count = await InboxRepository.countUnread(workspaceId, userId);
      await RedisService.setUnreadInboxCount(workspaceId, userId, count);
    }
    
    return count;
  }

  static async markRead(id: number, workspaceId: number, userId: number) {
    await InboxRepository.markAsRead(id, workspaceId, userId);

    // Invalidate Redis unread count cache
    await RedisService.deleteInboxCountCache(workspaceId, userId);
    const count = await this.getUnreadCount(workspaceId, userId);

    // Broadcast updated counts
    await sendToUser(userId, "notifications:count", {
      workspaceId,
      unreadInboxCount: count,
    });
  }

  static async markAllRead(workspaceId: number, userId: number) {
    await InboxRepository.markAllAsRead(workspaceId, userId);

    // Force count cache to 0
    await RedisService.clearUnreadInboxCount(workspaceId, userId);

    // Broadcast updated counts
    await sendToUser(userId, "notifications:count", {
      workspaceId,
      unreadInboxCount: 0,
    });
  }
}
