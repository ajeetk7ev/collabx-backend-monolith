import { kafka } from "./client";
import { logger } from "../../utils/logger";
import { KafkaTopic } from "./topics";

const producer = kafka.producer();
let isConnected = false;

export async function connectProducer() {
  try {
    await producer.connect();
    isConnected = true;
    logger.info("Kafka Producer connected successfully");
  } catch (error) {
    logger.error("Failed to connect Kafka Producer:", error);
    throw error;
  }
}

export async function disconnectProducer() {
  if (isConnected) {
    try {
      await producer.disconnect();
      isConnected = false;
      logger.info("Kafka Producer disconnected");
    } catch (error) {
      logger.error("Error disconnecting Kafka Producer:", error);
    }
  }
}

export async function publishEvent(topic: KafkaTopic, payload: any) {
  if (!isConnected) {
    logger.warn(`Kafka Producer not connected, connecting now before sending to topic: ${topic}`);
    await connectProducer();
  }
  try {
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(payload) }],
    });
    logger.debug(`Published event to Kafka topic ${topic}`);
  } catch (error) {
    logger.error(`Error publishing event to Kafka topic ${topic}:`, error);
    throw error;
  }
}
