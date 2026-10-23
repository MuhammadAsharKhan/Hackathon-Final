import { ZodError } from "zod";
import ApiError from "../utils/ApiError.js";

const toResponse = (err) => {
  if (err instanceof ApiError) {
    return {
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
    };
  }

  if (err instanceof ZodError) {
    return {
      statusCode: 400,
      message: "Validation failed",
      errors: err.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  if (err.name === "ValidationError") {
    return {
      statusCode: 400,
      message: "Validation failed",
      errors: Object.values(err.errors).map((entry) => ({
        field: entry.path,
        message: entry.message,
      })),
    };
  }

  if (err.name === "CastError") {
    return { statusCode: 400, message: `Invalid ${err.path}` };
  }

  if (err.code === 11000) {
    return { statusCode: 409, message: "Resource already exists" };
  }

  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return { statusCode: 401, message: "Invalid or expired token" };
  }

  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return { statusCode: 413, message: "Image must be 2 MB or smaller" };
    }
    return { statusCode: 400, message: "Upload failed" };
  }

  if (err.type === "entity.parse.failed") {
    return { statusCode: 400, message: "Invalid JSON payload" };
  }

  if (err.type === "entity.too.large") {
    return { statusCode: 413, message: "Payload too large" };
  }

  return { statusCode: 500, message: "Something went wrong" };
};

export const errorHandler = (err, req, res, next) => {
  const { statusCode, message, errors } = toResponse(err);

  if (statusCode >= 500) {
    console.error(err.stack || err.message);
  }

  const body = { success: false, message };
  if (errors && errors.length > 0) body.errors = errors;

  res.status(statusCode).json(body);
};
