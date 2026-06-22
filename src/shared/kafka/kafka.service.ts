import { connectProducer, disconnectProducer } from "./producer";
import { startConsumer, disconnectConsumer } from "./consumer";
import { logger } from "../../utils/logger";
import { kafka } from "./client";

export async function initKafka() {
  try {
    logger.info("Initializing Kafka connection...");
    await connectProducer();
    await startConsumer();
    logger.info("Kafka initialized successfully");
  } catch (err) {
    logger.error(
      "Kafka initialization failed. Server starting without active Kafka connection:",
      err,
    );
  }
}

export async function shutdownKafka() {
  try {
    await disconnectProducer();
    await disconnectConsumer();
    logger.info("Kafka connections shutdown successfully");
  } catch (err) {
    logger.error("Error during Kafka shutdown:", err);
  }
}
