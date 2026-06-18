import express from "express";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

app.get("/", (_, res) => {
  res.status(200).json({ message: "API is running" });
});

// Global error handler
app.use(errorHandler);

export { app };
