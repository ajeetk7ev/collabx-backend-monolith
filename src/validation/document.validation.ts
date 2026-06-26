import Joi from "joi";

export const createDocumentSchema = Joi.object({
  title: Joi.string().trim().max(200).default("Untitled").optional(),
  emoji: Joi.string().trim().max(10).default("📄").optional(),
  summary: Joi.string().trim().allow("").max(500).optional(),
  body: Joi.string().trim().allow("").optional(),
});

export const updateDocumentSchema = Joi.object({
  title: Joi.string().trim().max(200).optional(),
  emoji: Joi.string().trim().max(10).optional(),
  summary: Joi.string().trim().allow("").max(500).optional(),
  body: Joi.string().trim().allow("").optional(),
}).min(1).messages({
  "object.min": "At least one field must be provided to update",
});
