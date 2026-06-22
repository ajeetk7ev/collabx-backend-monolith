import { Kafka, SASLOptions, KafkaConfig } from "kafkajs";

const brokersString = process.env.KAFKA_BROKERS || "localhost:9092";
const brokers = brokersString.split(",").map((b) => b.trim());
const clientId = process.env.KAFKA_CLIENT_ID || "collabx-backend";

const saslUsername = process.env.KAFKA_SASL_USERNAME;
const saslPassword = process.env.KAFKA_SASL_PASSWORD;
const saslMechanism = process.env.KAFKA_SASL_MECHANISM || "scram-sha-256";
const sslEnv = process.env.KAFKA_SSL;

let ssl: boolean | object = false;
let sasl: SASLOptions | undefined = undefined;

// Configure SASL and SSL if credentials are provided in env
if (saslUsername && saslPassword) {
  ssl = sslEnv === "false" ? false : { rejectUnauthorized: false };
  sasl = {
    mechanism: saslMechanism as any,
    username: saslUsername,
    password: saslPassword,
  };
} else if (sslEnv === "true") {
  ssl = { rejectUnauthorized: false };
}

const kafkaConfig: KafkaConfig = {
  clientId,
  brokers,
  connectionTimeout: 10000,
  requestTimeout: 25000,
};

if (ssl) {
  kafkaConfig.ssl = ssl;
}
if (sasl) {
  kafkaConfig.sasl = sasl;
}

export const kafka = new Kafka(kafkaConfig);
