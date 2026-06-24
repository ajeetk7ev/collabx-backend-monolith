import Joi from "joi";

const taskStatuses = ["backlog", "todo", "in_progress", "review", "done"];
const taskPriorities = ["urgent", "high", "medium", "low"];

export const createTaskSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required().messages({
    "any.required": "Task title is required",
    "string.empty": "Task title cannot be empty",
    "string.max": "Task title cannot exceed 200 characters",
  }),
  description: Joi.string().trim().allow("").optional(),
  status: Joi.string().valid(...taskStatuses).default("todo").optional(),
  priority: Joi.string().valid(...taskPriorities).default("medium").optional(),
  assigneeId: Joi.number().integer().positive().allow(null).optional(),
  dueDate: Joi.string().trim().allow("").optional(),
  labels: Joi.array().items(Joi.string().trim()).default([]).optional(),
});

export const updateTaskSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).optional(),
  description: Joi.string().trim().allow("").optional(),
  status: Joi.string().valid(...taskStatuses).optional(),
  priority: Joi.string().valid(...taskPriorities).optional(),
  assigneeId: Joi.number().integer().positive().allow(null).optional(),
  dueDate: Joi.string().trim().allow("").optional(),
  labels: Joi.array().items(Joi.string().trim()).optional(),
}).min(1).messages({
  "object.min": "At least one field must be provided to update",
});

export const updateTaskStatusSchema = Joi.object({
  status: Joi.string().valid(...taskStatuses).required().messages({
    "any.required": "Status is required",
    "any.only": "Invalid status value",
  }),
});

export const createCommentSchema = Joi.object({
  body: Joi.string().trim().min(1).required().messages({
    "any.required": "Comment body is required",
    "string.empty": "Comment body cannot be empty",
  }),
});
