import { ZodError } from "zod";
import ApiError from "../utils/ApiError.js";

const DUPLICATE_LABELS = {
  email: "Email",
  code: "Employee code",
  name: "Name",
  date: "Date",
  month: "Month",
  key: "Setting",
};

const normalizeError = (err) => {
  if (err instanceof ApiError) {
    return {
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
      code: err.code,
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
      errors: Object.values(err.errors).map((fieldError) => ({
        field: fieldError.path,
        message: fieldError.message,
      })),
    };
  }

  if (err.name === "CastError") {
    return { statusCode: 400, message: `Invalid ${err.path}` };
  }

  if (err.code === 11000) {
    // The index that rejected the write names the field, so the client can say
    // which value is taken instead of a bare conflict.
    const [field] = Object.keys(err.keyPattern ?? err.keyValue ?? {});
    if (!field) return { statusCode: 409, message: "Resource already exists" };

    const label = DUPLICATE_LABELS[field] ?? field;
    return { statusCode: 409, message: `${label} is already in use` };
  }

  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return { statusCode: 401, message: "Invalid or expired token" };
  }

  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return { statusCode: 413, message: "File is too large" };
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
  const { statusCode, message, errors, code } = normalizeError(err);

  if (statusCode >= 500) {
    console.error(err.stack || err.message);
  }

  const body = { success: false, message };
  if (code) body.code = code;
  if (errors && errors.length > 0) body.errors = errors;

  res.status(statusCode).json(body);
};
