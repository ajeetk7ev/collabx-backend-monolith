import { NotificationType } from "../../generated/prisma/client";

export interface CreateInboxItemInput {
  workspaceId: number;
  userId: number;
  actorId: number;
  type: NotificationType;
  title: string;
  description?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  metadata?: any;
}

export interface InboxQueryFilters {
  workspaceId: number;
  userId: number;
  isRead?: boolean;
  page?: number;
  limit?: number;
}
