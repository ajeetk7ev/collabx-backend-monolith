import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { RedisService } from "../redis/redis.service";
import { handleNotificationSocketEvents } from "../../modules/notifications/notification.socket";

let io: Server | null = null;

export function initSocketIO(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:8080",
      credentials: true,
    },
  });

  // Socket middleware for JWT verification
  io.use(async (socket: Socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      if (!token) {
        // Attempt parsing from Authorization header
        const authHeader = socket.handshake.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          token = authHeader.replace("Bearer ", "");
        } else {
          // Attempt parsing from Cookie header
          const cookieHeader = socket.handshake.headers.cookie;
          if (cookieHeader) {
            const cookies = Object.fromEntries(
              cookieHeader.split(";").map((c) => c.trim().split("="))
            );
            token = cookies.accessToken;
          }
        }
      }

      if (!token) {
        return next(new Error("Authentication error: Access token is missing."));
      }

      const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET) as {
        id: number;
        email: string;
        role: string;
      };

      socket.data.user = {
        id: decoded.id,
        email: decoded.email,
      };

      next();
    } catch (err) {
      logger.error("Socket.io authentication middleware failed:", err);
      next(new Error("Authentication error: Invalid or expired access token."));
    }
  });

  io.on("connection", async (socket: Socket) => {
    const userId = socket.data.user.id;
    const userRoom = `user:${userId}`;

    // Connect user to their personal room
    await socket.join(userRoom);
    logger.info(`Socket connected: ${socket.id} (User: ${userId}) - joined room: ${userRoom}`);

    // Mark online in Redis
    await RedisService.setUserOnline(userId, socket.id);

    // Register module-specific handlers
    handleNotificationSocketEvents(socket);

    socket.on("disconnect", async () => {
      logger.info(`Socket disconnected: ${socket.id} (User: ${userId})`);
      // Mark offline in Redis (updates last seen if all sockets disconnect)
      await RedisService.setUserOffline(userId, socket.id);
    });
  });

  return io;
}

export function getSocketIOInstance(): Server {
  if (!io) {
    throw new Error("Socket.io server instance is not initialized yet.");
  }
  return io;
}

/**
 * Sends a real-time event directly to a user's private room.
 */
export async function sendToUser(userId: number, event: string, payload: any) {
  if (!io) {
    logger.warn(`Socket.io server not initialized. Dropping event: ${event} for user: ${userId}`);
    return;
  }
  const room = `user:${userId}`;
  io.to(room).emit(event, payload);
  logger.debug(`Socket.io emitted event "${event}" to "${room}"`);
}
export { io };
