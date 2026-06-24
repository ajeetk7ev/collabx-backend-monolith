import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { TaskService } from "../services/task.service";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

export class TaskController {
  static async listTasks(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const userId = req.user!.id;
    if (isNaN(workspaceId)) {
      throw new ApiError(400, "Invalid workspace ID parameter.");
    }

    const tasks = await TaskService.listTasks(workspaceId, userId);

    // Map labels from JSON string back to array if stored as string
    const mappedTasks = tasks.map((t) => {
      let parsedLabels = [];
      try {
        parsedLabels = typeof t.labels === "string" ? JSON.parse(t.labels) : t.labels;
        if (!Array.isArray(parsedLabels)) parsedLabels = [];
      } catch {
        parsedLabels = [];
      }
      return {
        ...t,
        labels: parsedLabels,
      };
    });

    res.status(200).json(new ApiResponse(200, { tasks: mappedTasks }, "Tasks fetched successfully."));
  }

  static async createTask(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const creatorId = req.user!.id;

    if (isNaN(workspaceId)) {
      throw new ApiError(400, "Invalid workspace ID parameter.");
    }

    const { title, description, status, priority, assigneeId, dueDate, labels } = req.body;

    const task = await TaskService.createTask(workspaceId, creatorId, {
      title,
      description,
      status,
      priority,
      assigneeId: assigneeId ? parseInt(assigneeId, 10) : null,
      dueDate,
      labels,
    });

    let parsedLabels = [];
    try {
      parsedLabels = typeof task.labels === "string" ? JSON.parse(task.labels) : task.labels;
    } catch {
      parsedLabels = [];
    }

    res.status(201).json(new ApiResponse(201, { task: { ...task, labels: parsedLabels } }, "Task created successfully."));
  }

  static async updateTask(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const taskId = parseInt(req.params.id as string, 10);
    const userId = req.user!.id;

    if (isNaN(workspaceId) || isNaN(taskId)) {
      throw new ApiError(400, "Invalid request parameters.");
    }

    const { title, description, status, priority, assigneeId, dueDate, labels } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assigneeId !== undefined) {
      updateData.assigneeId = assigneeId ? parseInt(assigneeId, 10) : null;
    }
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (labels !== undefined) updateData.labels = labels;

    const task = await TaskService.updateTask(taskId, workspaceId, userId, updateData);

    let parsedLabels = [];
    try {
      parsedLabels = typeof task.labels === "string" ? JSON.parse(task.labels) : task.labels;
    } catch {
      parsedLabels = [];
    }

    res.status(200).json(new ApiResponse(200, { task: { ...task, labels: parsedLabels } }, "Task updated successfully."));
  }

  static async updateTaskStatus(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const taskId = parseInt(req.params.id as string, 10);
    const userId = req.user!.id;
    const { status } = req.body;

    if (isNaN(workspaceId) || isNaN(taskId)) {
      throw new ApiError(400, "Invalid request parameters.");
    }

    const task = await TaskService.updateTaskStatus(taskId, workspaceId, userId, status);

    res.status(200).json(new ApiResponse(200, { task }, "Task status updated successfully."));
  }

  static async deleteTask(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const taskId = parseInt(req.params.id as string, 10);
    const userId = req.user!.id;

    if (isNaN(workspaceId) || isNaN(taskId)) {
      throw new ApiError(400, "Invalid request parameters.");
    }

    await TaskService.deleteTask(taskId, workspaceId, userId);

    res.status(200).json(new ApiResponse(200, null, "Task deleted successfully."));
  }

  static async addComment(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const taskId = parseInt(req.params.id as string, 10);
    const authorId = req.user!.id;
    const { body } = req.body;

    if (isNaN(workspaceId) || isNaN(taskId)) {
      throw new ApiError(400, "Invalid request parameters.");
    }

    const comment = await TaskService.addComment(taskId, workspaceId, authorId, body);

    res.status(201).json(new ApiResponse(201, { comment }, "Comment added successfully."));
  }

  static async deleteComment(req: AuthRequest, res: Response): Promise<void> {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const taskId = parseInt(req.params.id as string, 10);
    const commentId = parseInt(req.params.commentId as string, 10);
    const userId = req.user!.id;

    if (isNaN(workspaceId) || isNaN(taskId) || isNaN(commentId)) {
      throw new ApiError(400, "Invalid request parameters.");
    }

    await TaskService.deleteComment(commentId, taskId, workspaceId, userId);

    res.status(200).json(new ApiResponse(200, null, "Comment deleted successfully."));
  }
}
