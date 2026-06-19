import Joi from "joi";

// Slug regex: lowercase letters, numbers, hyphens. No leading/trailing hyphens.
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createWorkspaceSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required().messages({
    "any.required": "Workspace name is required",
    "string.empty": "Workspace name cannot be empty",
    "string.min": "Workspace name must be at least 2 characters",
    "string.max": "Workspace name cannot exceed 50 characters",
  }),
  slug: Joi.string()
    .trim()
    .lowercase()
    .min(3)
    .max(30)
    .pattern(slugRegex)
    .required()
    .messages({
      "any.required": "Workspace URL is required",
      "string.empty": "Workspace URL cannot be empty",
      "string.min": "Workspace URL must be at least 3 characters",
      "string.max": "Workspace URL cannot exceed 30 characters",
      "string.pattern.base":
        "Workspace URL can only contain lowercase letters, numbers, and hyphens",
    }),
});

export const updateWorkspaceSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).messages({
    "string.empty": "Workspace name cannot be empty",
    "string.min": "Workspace name must be at least 2 characters",
    "string.max": "Workspace name cannot exceed 50 characters",
  }),
  slug: Joi.string()
    .trim()
    .lowercase()
    .min(3)
    .max(30)
    .pattern(slugRegex)
    .messages({
      "string.empty": "Workspace URL cannot be empty",
      "string.min": "Workspace URL must be at least 3 characters",
      "string.max": "Workspace URL cannot exceed 30 characters",
      "string.pattern.base":
        "Workspace URL can only contain lowercase letters, numbers, and hyphens",
    }),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided to update",
  });
