import { Socket } from "socket.io";
import { logger } from "../../utils/logger";
import { NotificationService } from "./notification.service";

/**
 * Handle incoming real-time Socket.IO actions sent by clients.
 */
export function handleNotificationSocketEvents(socket: Socket) {
  const userId = socket.data.user.id;

  socket.on("notification:read", async (data: { id: number; workspaceId: number }) => {
    try {
      const { id, workspaceId } = data;
      if (!id || !workspaceId) return;

      logger.info(`Socket notification:read received from user ${userId} for ID ${id}`);
      await NotificationService.markRead(id, workspaceId, userId);
    } catch (err) {
      logger.error("Error handling socket notification:read:", err);
    }
  });
}
