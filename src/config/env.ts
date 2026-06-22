import dotenv from "dotenv";
dotenv.config();

const envVars = process.env;

export const env = {
  NODE_ENV: envVars.NODE_ENV || "development",
  PORT: envVars.PORT || "5001",
  DATABASE_URL: envVars.DATABASE_URL || "",
  FRONTEND_URL: envVars.FRONTEND_URL || "http://localhost:8080",

  ACCESS_TOKEN_SECRET: envVars.ACCESS_TOKEN_SECRET || "some_super_secret_access_token_key_12345",
  ACCESS_TOKEN_EXPIRY: envVars.ACCESS_TOKEN_EXPIRY || "1d",
  REFRESH_TOKEN_SECRET: envVars.REFRESH_TOKEN_SECRET || "some_super_secret_refresh_token_key_67890",
  REFRESH_TOKEN_EXPIRY: envVars.REFRESH_TOKEN_EXPIRY || "7d",

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: envVars.CLOUDINARY_CLOUD_NAME || "",
  CLOUDINARY_API_KEY: envVars.CLOUDINARY_API_KEY || "",
  CLOUDINARY_API_SECRET: envVars.CLOUDINARY_API_SECRET || "",

  // Redis
  REDIS_URL: envVars.REDIS_URL || "redis://127.0.0.1:6379",

  // RabbitMQ
  RABBITMQ_URL: envVars.RABBITMQ_URL || "amqp://localhost:5672",

  // Kafka
  KAFKA_BROKERS: envVars.KAFKA_BROKERS || "localhost:9092",
  KAFKA_CLIENT_ID: envVars.KAFKA_CLIENT_ID || "collabx-backend",
  KAFKA_SASL_USERNAME: envVars.KAFKA_SASL_USERNAME || "",
  KAFKA_SASL_PASSWORD: envVars.KAFKA_SASL_PASSWORD || "",
  KAFKA_SASL_MECHANISM: envVars.KAFKA_SASL_MECHANISM || "scram-sha-256",
  KAFKA_SSL: envVars.KAFKA_SSL || "false",
};

