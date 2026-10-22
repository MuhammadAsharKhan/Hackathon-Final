import ApiError from "../utils/ApiError.js";

export const validate = (schema, target = "body") => (req, res, next) => {
  const result = schema.safeParse(req[target]);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.length > 0 ? issue.path.join(".") : target,
      message: issue.message,
    }));
    return next(new ApiError(400, "Validation failed", errors));
  }

  Object.defineProperty(req, target, {
    value: result.data,
    writable: true,
    enumerable: true,
    configurable: true,
  });

  return next();
};
