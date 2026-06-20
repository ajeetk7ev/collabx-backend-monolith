import Joi from "joi";

export const addWorkspaceMemberSchema = Joi.object({
  firstname: Joi.string().trim().min(2).max(50).required().messages({
    "string.empty": "First name cannot be empty",
    "string.min": "First name must be at least 2 characters",
    "string.max": "First name cannot exceed 50 characters",
    "any.required": "First name is required",
  }),
  lastname: Joi.string().trim().min(2).max(50).required().messages({
    "string.empty": "Last name cannot be empty",
    "string.min": "Last name must be at least 2 characters",
    "string.max": "Last name cannot exceed 50 characters",
    "any.required": "Last name is required",
  }),
  email: Joi.string().trim().email().required().messages({
    "string.empty": "Email cannot be empty",
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(6).optional().messages({
    "string.empty": "Password cannot be empty",
    "string.min": "Password must be at least 6 characters",
  }),
  role: Joi.string().valid("owner", "admin", "member").required().messages({
    "any.only": "Role must be either owner, admin, or member",
    "any.required": "Role is required",
  }),
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "Status must be active or inactive",
    "any.required": "Status is required",
  }),
  presence: Joi.string().valid("online", "away", "offline").required().messages({
    "any.only": "Presence must be online, away, or offline",
    "any.required": "Presence is required",
  }),
}).unknown(true);

export const updateWorkspaceMemberSchema = Joi.object({
  role: Joi.string().valid("owner", "admin", "member").optional().messages({
    "any.only": "Role must be either owner, admin, or member",
  }),
  status: Joi.string().valid("active", "inactive").optional().messages({
    "any.only": "Status must be active or inactive",
  }),
  presence: Joi.string().valid("online", "away", "offline").optional().messages({
    "any.only": "Presence must be online, away, or offline",
  }),
})
  .min(1)
  .unknown(true)
  .messages({
    "object.min": "At least one field must be provided to update",
  });
