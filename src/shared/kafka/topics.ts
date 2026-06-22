export const TOPICS = {
  WORKSPACE_INVITED: "workspace.invited",
  MEMBER_JOINED: "member.joined",
  ROLE_CHANGED: "role.changed",
  NOTIFICATION_CREATED: "notification.created",
  INBOX_CREATED: "inbox.created",
} as const;

export type KafkaTopic = typeof TOPICS[keyof typeof TOPICS];
