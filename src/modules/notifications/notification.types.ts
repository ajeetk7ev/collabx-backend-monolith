import { NotificationType } from "../../generated/prisma/client";

export interface CreateNotificationInput {
  workspaceId: number;
  recipientId: number;
  actorId: number;
  type: NotificationType;
  title: string;
  description?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  metadata?: any;
}

export interface NotificationQueryFilters {
  workspaceId: number;
  recipientId: number;
  isRead?: boolean;
  page?: number;
  limit?: number;
}
