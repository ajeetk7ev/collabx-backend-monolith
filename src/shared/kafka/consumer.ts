import { kafka } from "./client";
import { logger } from "../../utils/logger";
import { KafkaTopic } from "./topics";

const consumer = kafka.consumer({ groupId: "collabx-notification-group" });

type ConsumerHandler = (payload: any) => Promise<void>;
const handlers = new Map<string, ConsumerHandler>();

export function registerConsumerHandler(topic: KafkaTopic, handler: ConsumerHandler) {
  handlers.set(topic, handler);
}

export async function startConsumer() {
  try {
    await consumer.connect();
    logger.info("Kafka Consumer connected successfully");

    // Subscribe to all topics that have registered handlers
    for (const topic of handlers.keys()) {
      await consumer.subscribe({ topic, fromBeginning: false });
      logger.info(`Kafka Consumer subscribed to topic: ${topic}`);
    }

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const valueStr = message.value?.toString();
        if (!valueStr) return;

        try {
          const payload = JSON.parse(valueStr);
          logger.info(`Kafka received message from topic "${topic}"`);
          
          const handler = handlers.get(topic);
          if (handler) {
            await handler(payload);
          } else {
            logger.warn(`No handler registered for topic "${topic}"`);
          }
        } catch (err) {
          logger.error(`Error processing message from topic "${topic}":`, err);
        }
      },
    });
  } catch (error) {
    logger.error("Failed to start Kafka Consumer:", error);
  }
}

export async function disconnectConsumer() {
  try {
    await consumer.disconnect();
    logger.info("Kafka Consumer disconnected");
  } catch (error) {
    logger.error("Error disconnecting Kafka Consumer:", error);
  }
}
