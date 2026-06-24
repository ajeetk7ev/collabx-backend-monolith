import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { publishEvent } from "../shared/kafka/producer";
import { TOPICS } from "../shared/kafka/topics";
import { TaskStatus, TaskPriority } from "../generated/prisma/client";

export class TaskService {
  /**
   * Helper to verify if the user has owner or admin privileges in the workspace.
   */
  static async checkWorkspaceRole(workspaceId: number, userId: number): Promise<{ isOwnerOrAdmin: boolean; role: string }> {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });

    if (!workspace) {
      throw new ApiError(404, "Workspace not found");
    }

    if (workspace.ownerId === userId) {
      return { isOwnerOrAdmin: true, role: "owner" };
    }

    const member = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
      select: { role: true, status: true },
    });

    if (!member || member.status !== "active") {
      throw new ApiError(403, "Access denied. You are not an active member of this workspace.");
    }

    const isOwnerOrAdmin = member.role === "owner" || member.role === "admin";
    return { isOwnerOrAdmin, role: member.role };
  }

  /**
   * Fetch all tasks in a workspace (or only assigned tasks if the user has a member role),
   * including comments and related user details.
   */
  static async listTasks(workspaceId: number, userId: number) {
    const { isOwnerOrAdmin } = await this.checkWorkspaceRole(workspaceId, userId);

    const items = await prisma.task.findMany({
      where: {
        workspaceId,
        ...(!isOwnerOrAdmin && { assigneeId: userId }),
      },
      include: {
        creator: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            avatar: true,
          },
        },
        assignee: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            avatar: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
    });
    const userToMemberMap = new Map<number, number>();
    for (const m of members) {
      userToMemberMap.set(m.userId, m.id);
    }

    return items.map((t) => {
      const assigneeMemberId = t.assigneeId ? userToMemberMap.get(t.assigneeId) : null;
      const creatorMemberId = userToMemberMap.get(t.creatorId);

      const mappedComments = t.comments.map((c) => {
        const commentAuthorMemberId = userToMemberMap.get(c.authorId);
        return {
          ...c,
          id: String(c.id),
          taskId: String(c.taskId),
          authorId: commentAuthorMemberId ? String(commentAuthorMemberId) : String(c.authorId),
        };
      });

      return {
        ...t,
        id: String(t.id),
        workspaceId: String(t.workspaceId),
        assigneeId: assigneeMemberId ? String(assigneeMemberId) : undefined,
        creatorId: creatorMemberId ? String(creatorMemberId) : String(t.creatorId),
        comments: mappedComments,
        assignee: t.assignee ? {
          id: t.assignee.id,
          firstname: t.assignee.firstname,
          lastname: t.assignee.lastname,
          email: t.assignee.email,
          avatar: t.assignee.avatar,
        } : null,
      };
    });
  }

  /**
   * Create a new task. Only owner and admin roles can perform this action.
   */
  static async createTask(
    workspaceId: number,
    creatorId: number,
    data: {
      title: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: number | null; // This is the WorkspaceMember ID from the frontend
      dueDate?: string;
      labels?: string[];
    }
  ) {
    // 1. Verify permissions
    const { isOwnerOrAdmin } = await this.checkWorkspaceRole(workspaceId, creatorId);
    if (!isOwnerOrAdmin) {
      throw new ApiError(403, "Access denied. Only owners and admins can create tasks.");
    }

    // 2. Resolve WorkspaceMember assigneeId to User ID
    let userAssigneeId: number | null = null;
    if (data.assigneeId) {
      const activeAssignee = await prisma.workspaceMember.findFirst({
        where: {
          id: data.assigneeId,
          workspaceId,
          status: "active",
        },
      });
      if (!activeAssignee) {
        throw new ApiError(400, "The specified assignee is not an active member of this workspace.");
      }
      userAssigneeId = activeAssignee.userId;
    }

    // 3. Generate unique sequential task key CX-<num> for the workspace
    const lastTask = await prisma.task.findFirst({
      where: { workspaceId },
      orderBy: { id: "desc" },
    });

    let num = 201; // Start suffix at 201 to match frontend seed numbers
    if (lastTask) {
      const match = lastTask.key.match(/CX-(\d+)/);
      if (match && match[1]) {
        num = parseInt(match[1], 10) + 1;
      }
    }
    const key = `CX-${num}`;

    // 4. Insert task
    const task = await prisma.task.create({
      data: {
        key,
        title: data.title,
        description: data.description ?? null,
        status: data.status ?? TaskStatus.todo,
        priority: data.priority ?? TaskPriority.medium,
        dueDate: data.dueDate ?? null,
        labels: data.labels ? JSON.stringify(data.labels) : "[]",
        workspaceId,
        assigneeId: userAssigneeId,
        creatorId,
      },
      include: {
        comments: {
          include: {
            author: true,
          },
        },
        assignee: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // 5. If task is assigned on creation, dispatch Kafka notification event
    if (task.assigneeId) {
      try {
        await publishEvent(TOPICS.NOTIFICATION_CREATED, {
          workspaceId,
          recipientId: task.assigneeId,
          actorId: creatorId,
          type: "TASK_ASSIGNED",
          title: "New Task Assigned",
          description: `You have been assigned the task: ${task.title}`,
          entityType: "TASK",
          entityId: task.id,
          metadata: { taskId: task.id, key: task.key },
        });
      } catch (err) {
        console.error("Failed to publish TASK_ASSIGNED Kafka notification event:", err);
      }
    }

    // Map response keys back to frontend format
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
    });
    const userToMemberMap = new Map<number, number>();
    for (const m of members) {
      userToMemberMap.set(m.userId, m.id);
    }

    const assigneeMemberId = task.assigneeId ? userToMemberMap.get(task.assigneeId) : null;
    const creatorMemberId = userToMemberMap.get(task.creatorId);

    return {
      ...task,
      id: String(task.id),
      workspaceId: String(task.workspaceId),
      assigneeId: assigneeMemberId ? String(assigneeMemberId) : undefined,
      creatorId: creatorMemberId ? String(creatorMemberId) : String(task.creatorId),
      comments: [],
      assignee: task.assignee ? {
        id: task.assignee.id,
        firstname: task.assignee.firstname,
        lastname: task.assignee.lastname,
        email: task.assignee.email,
        avatar: task.assignee.avatar,
      } : null,
    };
  }

  /**
   * Update task properties. Only owner and admin roles can perform this action.
   */
  static async updateTask(
    taskId: number,
    workspaceId: number,
    userId: number,
    data: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: number | null; // WorkspaceMember ID
      dueDate?: string;
      labels?: string[];
    }
  ) {
    // 1. Verify permissions
    const { isOwnerOrAdmin } = await this.checkWorkspaceRole(workspaceId, userId);
    if (!isOwnerOrAdmin) {
      throw new ApiError(403, "Access denied. Only owners and admins can update task configurations.");
    }

    // 2. Fetch current task state
    const currentTask = await prisma.task.findUnique({
      where: { id: taskId, workspaceId },
    });

    if (!currentTask) {
      throw new ApiError(404, "Task not found");
    }

    // 3. Resolve WorkspaceMember assigneeId to User ID if changing
    let userAssigneeId: number | null | undefined = undefined;
    if (data.assigneeId !== undefined) {
      if (data.assigneeId === null) {
        userAssigneeId = null;
      } else {
        const activeAssignee = await prisma.workspaceMember.findFirst({
          where: {
            id: data.assigneeId,
            workspaceId,
            status: "active",
          },
        });
        if (!activeAssignee) {
          throw new ApiError(400, "The specified assignee is not an active member of this workspace.");
        }
        userAssigneeId = activeAssignee.userId;
      }
    }

    // 4. Run update query
    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description ?? null }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(userAssigneeId !== undefined && { assigneeId: userAssigneeId }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ?? null }),
        ...(data.labels !== undefined && { labels: JSON.stringify(data.labels) }),
      },
      include: {
        comments: {
          include: {
            author: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        assignee: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // 5. Fire Kafka notification if assignee changed or newly assigned
    if (updated.assigneeId && updated.assigneeId !== currentTask.assigneeId) {
      try {
        await publishEvent(TOPICS.NOTIFICATION_CREATED, {
          workspaceId,
          recipientId: updated.assigneeId,
          actorId: userId,
          type: "TASK_ASSIGNED",
          title: "New Task Assigned",
          description: `You have been assigned the task: ${updated.title}`,
          entityType: "TASK",
          entityId: updated.id,
          metadata: { taskId: updated.id, key: updated.key },
        });
      } catch (err) {
        console.error("Failed to publish TASK_ASSIGNED Kafka notification event:", err);
      }
    }

    // Resolve workspace member IDs for return payload
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
    });
    const userToMemberMap = new Map<number, number>();
    for (const m of members) {
      userToMemberMap.set(m.userId, m.id);
    }

    const assigneeMemberId = updated.assigneeId ? userToMemberMap.get(updated.assigneeId) : null;
    const creatorMemberId = userToMemberMap.get(updated.creatorId);

    const mappedComments = updated.comments.map((c) => {
      const commentAuthorMemberId = userToMemberMap.get(c.authorId);
      return {
        ...c,
        id: String(c.id),
        taskId: String(c.taskId),
        authorId: commentAuthorMemberId ? String(commentAuthorMemberId) : String(c.authorId),
      };
    });

    return {
      ...updated,
      id: String(updated.id),
      workspaceId: String(updated.workspaceId),
      assigneeId: assigneeMemberId ? String(assigneeMemberId) : undefined,
      creatorId: creatorMemberId ? String(creatorMemberId) : String(updated.creatorId),
      comments: mappedComments,
      assignee: updated.assignee ? {
        id: updated.assignee.id,
        firstname: updated.assignee.firstname,
        lastname: updated.assignee.lastname,
        email: updated.assignee.email,
        avatar: updated.assignee.avatar,
      } : null,
    };
  }

  /**
   * Update task status. Both members and admin/owners are authorized to call this endpoint.
   */
  static async updateTaskStatus(taskId: number, workspaceId: number, userId: number, status: TaskStatus) {
    // verify active membership exists in this workspace (throws error if not)
    await this.checkWorkspaceRole(workspaceId, userId);

    const task = await prisma.task.findUnique({
      where: { id: taskId, workspaceId },
    });

    if (!task) {
      throw new ApiError(404, "Task not found");
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { status },
      include: {
        assignee: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // Map response IDs
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
    });
    const userToMemberMap = new Map<number, number>();
    for (const m of members) {
      userToMemberMap.set(m.userId, m.id);
    }

    const assigneeMemberId = updated.assigneeId ? userToMemberMap.get(updated.assigneeId) : null;
    const creatorMemberId = userToMemberMap.get(updated.creatorId);

    return {
      ...updated,
      id: String(updated.id),
      workspaceId: String(updated.workspaceId),
      assigneeId: assigneeMemberId ? String(assigneeMemberId) : undefined,
      creatorId: creatorMemberId ? String(creatorMemberId) : String(updated.creatorId),
      assignee: updated.assignee ? {
        id: updated.assignee.id,
        firstname: updated.assignee.firstname,
        lastname: updated.assignee.lastname,
        email: updated.assignee.email,
        avatar: updated.assignee.avatar,
      } : null,
    };
  }

  /**
   * Delete a task. Only owners and admins can perform this action.
   */
  static async deleteTask(taskId: number, workspaceId: number, userId: number) {
    const { isOwnerOrAdmin } = await this.checkWorkspaceRole(workspaceId, userId);
    if (!isOwnerOrAdmin) {
      throw new ApiError(403, "Access denied. Only owners and admins can delete tasks.");
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId, workspaceId },
    });

    if (!task) {
      throw new ApiError(404, "Task not found");
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    return true;
  }

  /**
   * Add comment to a task. Any active member in the workspace is authorized.
   */
  static async addComment(taskId: number, workspaceId: number, authorId: number, body: string) {
    await this.checkWorkspaceRole(workspaceId, authorId);

    const task = await prisma.task.findUnique({
      where: { id: taskId, workspaceId },
    });

    if (!task) {
      throw new ApiError(404, "Task not found");
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId,
        authorId,
        body,
      },
      include: {
        author: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // Resolve author Member ID
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
    });
    const authorMember = members.find((m) => m.userId === authorId);

    return {
      ...comment,
      id: String(comment.id),
      taskId: String(comment.taskId),
      authorId: authorMember ? String(authorMember.id) : String(comment.authorId),
    };
  }

  /**
   * Delete comment from a task. Only the author, or workspace owner/admins can delete it.
   */
  static async deleteComment(commentId: number, taskId: number, workspaceId: number, userId: number) {
    const { isOwnerOrAdmin } = await this.checkWorkspaceRole(workspaceId, userId);

    const comment = await prisma.taskComment.findUnique({
      where: { id: commentId, taskId },
    });

    if (!comment) {
      throw new ApiError(404, "Comment not found");
    }

    if (comment.authorId !== userId && !isOwnerOrAdmin) {
      throw new ApiError(403, "Access denied. You cannot delete this comment.");
    }

    await prisma.taskComment.delete({
      where: { id: commentId },
    });

    return true;
  }
}
