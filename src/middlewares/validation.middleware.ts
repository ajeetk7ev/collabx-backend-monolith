import { Request, Response, NextFunction, RequestHandler } from "express";
import { Schema } from "joi";

export const validateBody = (schema: Schema): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errorMap: Record<string, string> = {};
      error.details.forEach((detail) => {
        const key = detail.path.join(".");
        // Clean up double quotes from Joi's message (e.g. '"email" is required' -> 'email is required')
        errorMap[key] = detail.message.replace(/"/g, "");
      });

      res.status(400).json({
        success: false,
        message: "validation error",
        errors: errorMap,
      });
      return;
    }
    
    req.body = value;
    next();
  };
};
