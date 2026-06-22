import { connect, ChannelModel, Channel } from "amqplib";
import { logger } from "../../utils/logger";

const rabbitmqUrl = process.env.RABBITMQ_URL || "amqp://localhost:5672";

export const QUEUES = {
  NOTIFICATION_EMAILS: "notification-emails",
  WORKSPACE_INVITE_EMAILS: "workspace-invite-emails",
  DAILY_DIGEST: "daily-digest",
} as const;

export type QueueName = typeof QUEUES[keyof typeof QUEUES];

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export async function initRabbitMQ() {
  try {
    logger.info("Connecting to RabbitMQ...");
    connection = await connect(rabbitmqUrl);
    channel = await connection.createChannel();
    logger.info(`Successfully connected to RabbitMQ at: ${rabbitmqUrl.split("@").pop()}`);

    // Assert queues
    for (const q of Object.values(QUEUES)) {
      await channel.assertQueue(q, { durable: true });
      logger.info(`RabbitMQ asserted queue: ${q}`);
    }

    // Start workers
    await startWorkers();
  } catch (error) {
    logger.error("Failed to connect RabbitMQ. Continuing server boot:", error);
  }
}

export async function publishToQueue(queue: QueueName, data: any) {
  if (!channel) {
    logger.error(`RabbitMQ channel not initialized. Cannot publish message to ${queue}`);
    return;
  }
  try {
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), {
      persistent: true,
    });
    logger.debug(`Published message to queue: ${queue}`);
  } catch (error) {
    logger.error(`Error publishing to queue ${queue}:`, error);
  }
}

export async function shutdownRabbitMQ() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    logger.info("RabbitMQ connection closed");
  } catch (error) {
    logger.error("Error shutting down RabbitMQ:", error);
  }
}

// Workers scaffolding
async function startWorkers() {
  if (!channel) return;

  // Consume notification-emails queue
  await channel.consume(QUEUES.NOTIFICATION_EMAILS, (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      logger.info(`[Worker: notification-emails] Sending email alert to ${payload.email} for type ${payload.type}`);
      // Scaffolding: Simulated email delivery
      channel!.ack(msg);
    } catch (err) {
      logger.error("[Worker: notification-emails] Error processing message:", err);
      // Nack and discard or place back in queue (we'll nack and requeue = false for demo safety)
      channel!.nack(msg, false, false);
    }
  });

  // Consume workspace-invite-emails queue
  await channel.consume(QUEUES.WORKSPACE_INVITE_EMAILS, (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      logger.info(`[Worker: workspace-invite-emails] Sending workspace invitation email to ${payload.email}`);
      // Scaffolding: Simulated email delivery
      channel!.ack(msg);
    } catch (err) {
      logger.error("[Worker: workspace-invite-emails] Error processing message:", err);
      channel!.nack(msg, false, false);
    }
  });

  // Consume daily-digest queue
  await channel.consume(QUEUES.DAILY_DIGEST, (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      logger.info(`[Worker: daily-digest] Generating summary email for user ${payload.userId} in workspace ${payload.workspaceId}`);
      // Scaffolding: Mentions, replies, notifications, tasks checklist aggregator
      channel!.ack(msg);
    } catch (err) {
      logger.error("[Worker: daily-digest] Error processing message:", err);
      channel!.nack(msg, false, false);
    }
  });

  logger.info("RabbitMQ workers started successfully");
}
