import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { logger } from "../utils/logger";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let errors: any[] = [];

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof Error) {
    message = err.message;
  }

  // Log the error using winston logger
  logger.error(
    `${req.method} ${req.originalUrl} - Status: ${statusCode} - Message: ${message}`
  );
  if (err.stack) {
    logger.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};
