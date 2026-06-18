import Joi from "joi";

// Strong password regex: 6+ characters, mix of letters, numbers, and symbols
const strongPasswordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{6,}$/;

export const signUpSchema = Joi.object({
  firstname: Joi.string().trim().required().messages({
    "any.required": "Firstname is required",
    "string.empty": "Firstname cannot be empty",
  }),
  lastname: Joi.string().trim().required().messages({
    "any.required": "Lastname is required",
    "string.empty": "Lastname cannot be empty",
  }),
  email: Joi.string().trim().email().required().messages({
    "any.required": "Email is required",
    "string.email": "Please enter a valid email address",
    "string.empty": "Email cannot be empty",
  }),
  password: Joi.string()
    .min(6)
    .pattern(strongPasswordRegex)
    .required()
    .messages({
      "any.required": "Password is required",
      "string.empty": "Password cannot be empty",
      "string.min": "Password must be at least 6 characters long",
      "string.pattern.base": "Password must contain a mix of letters, numbers, and symbols",
    }),
});

export const signInSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    "any.required": "Email is required",
    "string.email": "Please enter a valid email address",
    "string.empty": "Email cannot be empty",
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
    "string.empty": "Password cannot be empty",
  }),
});
