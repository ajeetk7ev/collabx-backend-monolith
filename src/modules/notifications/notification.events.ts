import { NotificationRepository } from "./notification.repository";
import { InboxRepository } from "../inbox/inbox.repository";
import { RedisService } from "../../shared/redis/redis.service";
import { sendToUser } from "../../shared/socket/socket.service";
import { publishToQueue, QUEUES } from "../../shared/rabbitmq/rabbitmq.service";
import { logger } from "../../utils/logger";
import { CreateNotificationInput } from "./notification.types";
import { registerConsumerHandler } from "../../shared/kafka/consumer";
import { TOPICS } from "../../shared/kafka/topics";
import { prisma } from "../../config/prisma";

/**
 * Generic handler to ingest an event and create both a Notification row,
 * an InboxItem row, update Redis caches, and dispatch Socket/Email actions.
 */
export async function createNotificationFromEvent(event: CreateNotificationInput) {
  try {
    logger.info(`Processing event "${event.type}" for recipient ID ${event.recipientId}`);

    // 1. Create database row in Notification
    const notification = await NotificationRepository.create(event);

    // 2. Create database row in InboxItem
    const inboxItem = await InboxRepository.create({
      workspaceId: event.workspaceId,
      userId: event.recipientId,
      actorId: event.actorId,
      type: event.type,
      title: event.title,
      description: event.description ?? null,
      entityType: event.entityType ?? null,
      entityId: event.entityId ?? null,
      metadata: event.metadata,
    });

    const { workspaceId, recipientId } = event;

    // 3. Invalidate Redis unread count caches
    await RedisService.deleteNotificationCountCache(workspaceId, recipientId);
    await RedisService.deleteInboxCountCache(workspaceId, recipientId);

    // 4. Fetch updated unread counts
    const unreadNotificationsCount = await NotificationRepository.countUnread(workspaceId, recipientId);
    const unreadInboxCount = await InboxRepository.countUnread(workspaceId, recipientId);

    // Populate updated counts to Redis cache
    await RedisService.setUnreadNotificationCount(workspaceId, recipientId, unreadNotificationsCount);
    await RedisService.setUnreadInboxCount(workspaceId, recipientId, unreadInboxCount);

    // 5. Emit Socket.IO events to the user's room
    // Emit event for new notification
    await sendToUser(recipientId, "notification:new", notification);
    
    // Emit event for new inbox item
    await sendToUser(recipientId, "inbox:new", inboxItem);

    // Emit event for updated count
    await sendToUser(recipientId, "notifications:count", {
      workspaceId,
      unreadNotificationsCount,
      unreadInboxCount,
    });

    // 6. Queue Email Delivery via RabbitMQ
    const recipientUser = await prisma.user.findUnique({ where: { id: recipientId } });
    if (recipientUser && recipientUser.email) {
      if (event.type === "WORKSPACE_INVITED") {
        await publishToQueue(QUEUES.WORKSPACE_INVITE_EMAILS, {
          email: recipientUser.email,
          workspaceId,
          title: event.title,
          description: event.description,
        });
      } else {
        await publishToQueue(QUEUES.NOTIFICATION_EMAILS, {
          email: recipientUser.email,
          type: event.type,
          title: event.title,
          description: event.description,
        });
      }
    }

    return { notification, inboxItem };
  } catch (error) {
    logger.error("Error creating notification from event:", error);
    throw error;
  }
}

/**
 * Register Kafka consumer topic mapping to generic handler.
 */
export function registerNotificationEvents() {
  // Topic: notification.created
  registerConsumerHandler(TOPICS.NOTIFICATION_CREATED, async (payload) => {
    await createNotificationFromEvent(payload);
  });

  // Topic: workspace.invited
  registerConsumerHandler(TOPICS.WORKSPACE_INVITED, async (payload) => {
    await createNotificationFromEvent({
      workspaceId: payload.workspaceId,
      recipientId: payload.recipientId,
      actorId: payload.actorId,
      type: "WORKSPACE_INVITED",
      title: payload.title || "Workspace Invitation",
      description: payload.description || "You have been invited to join a workspace.",
      metadata: payload.metadata,
    });
  });

  // Topic: member.joined
  registerConsumerHandler(TOPICS.MEMBER_JOINED, async (payload) => {
    await createNotificationFromEvent({
      workspaceId: payload.workspaceId,
      recipientId: payload.recipientId,
      actorId: payload.actorId,
      type: "SYSTEM",
      title: payload.title || "New Member Joined",
      description: payload.description || "A new member has joined the workspace.",
      metadata: payload.metadata,
    });
  });

  // Topic: role.changed
  registerConsumerHandler(TOPICS.ROLE_CHANGED, async (payload) => {
    await createNotificationFromEvent({
      workspaceId: payload.workspaceId,
      recipientId: payload.recipientId,
      actorId: payload.actorId,
      type: "ROLE_CHANGED",
      title: payload.title || "Role Updated",
      description: payload.description || "Your workspace role has been updated.",
      metadata: payload.metadata,
    });
  });

  // Topic: inbox.created
  registerConsumerHandler(TOPICS.INBOX_CREATED, async (payload) => {
    // Only write inbox record directly without notification
    try {
      await InboxRepository.create(payload);
      await RedisService.deleteInboxCountCache(payload.workspaceId, payload.recipientId || payload.userId);
      
      const unreadInboxCount = await InboxRepository.countUnread(payload.workspaceId, payload.recipientId || payload.userId);
      await RedisService.setUnreadInboxCount(payload.workspaceId, payload.recipientId || payload.userId, unreadInboxCount);
      
      await sendToUser(payload.recipientId || payload.userId, "inbox:new", payload);
    } catch (err) {
      logger.error("Error handling inbox.created Kafka event:", err);
    }
  });

  logger.info("Kafka consumer event handlers registered for Notification and Inbox Modules");
}
