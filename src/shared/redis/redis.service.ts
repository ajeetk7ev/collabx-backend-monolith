import Redis from "ioredis";
import { logger } from "../../utils/logger";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const isTls = redisUrl.startsWith("rediss://");

// Support cloud URL (rediss://) TLS configuration, ignoring self-signed/untrusted cert limits for flexibility
export const redis = new Redis(redisUrl, {
  tls: isTls ? { rejectUnauthorized: false } : undefined,
  maxRetriesPerRequest: null,
});

redis.on("connect", () => {
  logger.info(`Successfully connected to Redis at: ${redisUrl.split("@").pop()}`);
});

redis.on("error", (err) => {
  logger.error("Redis connection error:", err);
});

export class RedisService {
  // Key helpers
  private static getNotificationKey(workspaceId: number, userId: number): string {
    return `unread:notifications:${workspaceId}:${userId}`;
  }

  private static getInboxKey(workspaceId: number, userId: number): string {
    return `unread:inbox:${workspaceId}:${userId}`;
  }

  private static getOnlineKey(userId: number): string {
    return `online:user:${userId}`;
  }

  private static getLastSeenKey(userId: number): string {
    return `lastseen:${userId}`;
  }

  // --- Notification Unread Counts ---

  static async getUnreadNotificationCount(workspaceId: number, userId: number): Promise<number | null> {
    const val = await redis.get(this.getNotificationKey(workspaceId, userId));
    return val !== null ? parseInt(val, 10) : null;
  }

  static async setUnreadNotificationCount(workspaceId: number, userId: number, count: number): Promise<void> {
    await redis.set(this.getNotificationKey(workspaceId, userId), count.toString());
  }

  static async incrementUnreadNotificationCount(workspaceId: number, userId: number): Promise<void> {
    const key = this.getNotificationKey(workspaceId, userId);
    const exists = await redis.exists(key);
    if (exists) {
      await redis.incr(key);
    }
  }

  static async clearUnreadNotificationCount(workspaceId: number, userId: number): Promise<void> {
    await redis.set(this.getNotificationKey(workspaceId, userId), "0");
  }

  static async deleteNotificationCountCache(workspaceId: number, userId: number): Promise<void> {
    await redis.del(this.getNotificationKey(workspaceId, userId));
  }

  // --- Inbox Unread Counts ---

  static async getUnreadInboxCount(workspaceId: number, userId: number): Promise<number | null> {
    const val = await redis.get(this.getInboxKey(workspaceId, userId));
    return val !== null ? parseInt(val, 10) : null;
  }

  static async setUnreadInboxCount(workspaceId: number, userId: number, count: number): Promise<void> {
    await redis.set(this.getInboxKey(workspaceId, userId), count.toString());
  }

  static async incrementUnreadInboxCount(workspaceId: number, userId: number): Promise<void> {
    const key = this.getInboxKey(workspaceId, userId);
    const exists = await redis.exists(key);
    if (exists) {
      await redis.incr(key);
    }
  }

  static async clearUnreadInboxCount(workspaceId: number, userId: number): Promise<void> {
    await redis.set(this.getInboxKey(workspaceId, userId), "0");
  }

  static async deleteInboxCountCache(workspaceId: number, userId: number): Promise<void> {
    await redis.del(this.getInboxKey(workspaceId, userId));
  }

  // --- Online User Management ---

  static async setUserOnline(userId: number, socketId: string): Promise<void> {
    const key = this.getOnlineKey(userId);
    await redis.sadd(key, socketId);
  }

  static async setUserOffline(userId: number, socketId: string): Promise<void> {
    const key = this.getOnlineKey(userId);
    await redis.srem(key, socketId);
    // Track last seen when they have no active socket connections
    const size = await redis.scard(key);
    if (size === 0) {
      await this.updateLastSeen(userId);
    }
  }

  static async getUserOnlineSockets(userId: number): Promise<string[]> {
    return redis.smembers(this.getOnlineKey(userId));
  }

  static async isUserOnline(userId: number): Promise<boolean> {
    const size = await redis.scard(this.getOnlineKey(userId));
    return size > 0;
  }

  // --- Last Seen ---

  static async updateLastSeen(userId: number): Promise<void> {
    await redis.set(this.getLastSeenKey(userId), new Date().toISOString());
  }

  static async getLastSeen(userId: number): Promise<string | null> {
    return redis.get(this.getLastSeenKey(userId));
  }
}
