import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/errorHandler";
import authRoutes from "./routes/auth.routes";
import workspaceRoutes from "./routes/workspace.routes";
import notificationRoutes from "./modules/notifications/notification.routes";
import inboxRoutes from "./modules/inbox/inbox.routes";
import fileRoutes from "./routes/file.routes";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:8080",
    credentials: true,
  }),
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

app.get("/", (_, res) => {
  res.status(200).json({ message: "API is running" });
});

// Auth Routes
app.use("/api/v1/auth", authRoutes);

// Workspace Routes
app.use("/api/v1/workspaces", workspaceRoutes);

// Notification, Inbox and File Routes
app.use("/api/v1/workspaces/:workspaceId/notifications", notificationRoutes);
app.use("/api/v1/workspaces/:workspaceId/inbox", inboxRoutes);
app.use("/api/v1/workspaces/:workspaceId/files", fileRoutes);

// Global error handler
app.use(errorHandler);

export { app };
