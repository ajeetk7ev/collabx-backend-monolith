import Joi from "joi";

export const createChannelSchema = Joi.object({
  name: Joi.string().trim().min(1).max(80).required().messages({
    "any.required": "Channel name is required",
    "string.empty": "Channel name cannot be empty",
    "string.max": "Channel name cannot exceed 80 characters",
  }),
  description: Joi.string().trim().allow("").max(250).optional(),
  isPrivate: Joi.boolean().default(false).optional(),
  memberIds: Joi.array().items(Joi.number().integer().positive()).optional(),
});

export const updateChannelSchema = Joi.object({
  name: Joi.string().trim().min(1).max(80).optional(),
  description: Joi.string().trim().allow("").max(250).optional(),
  isPrivate: Joi.boolean().optional(),
  memberIds: Joi.array().items(Joi.number().integer().positive()).optional(),
}).min(1).messages({
  "object.min": "At least one field must be provided to update",
});

export const sendMessageSchema = Joi.object({
  body: Joi.string().trim().min(1).required().messages({
    "any.required": "Message body is required",
    "string.empty": "Message body cannot be empty",
  }),
  parentId: Joi.number().integer().positive().allow(null).optional(),
  fileIds: Joi.array().items(Joi.number().integer().positive()).optional(),
});
