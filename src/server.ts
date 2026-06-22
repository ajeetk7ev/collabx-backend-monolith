import { createServer } from "http";
import { app } from "./app";
import { env } from "./config/env";
import { initSocketIO } from "./shared/socket/socket.service";
import { initKafka } from "./shared/kafka/kafka.service";
import { initRabbitMQ } from "./shared/rabbitmq/rabbitmq.service";
import { registerNotificationEvents } from "./modules/notifications/notification.events";
import { logger } from "./utils/logger";

const startServer = async () => {
  try {
    const server = createServer(app);

    // Initialize Socket.io
    initSocketIO(server);

    // Register Kafka consumer event mappings
    registerNotificationEvents();

    // Boot up Kafka (producer and consumer group)
    await initKafka();

    // Boot up RabbitMQ client and workers
    await initRabbitMQ();

    server.listen(env.PORT, () => {
      logger.info(`Server is running on port ${env.PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start collabx backend server:", error);
    process.exit(1);
  }
};

startServer();
