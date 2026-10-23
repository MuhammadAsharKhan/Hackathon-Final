import ApiError from "../utils/ApiError.js";

export const validate = (schema, target = "body") => (req, res, next) => {
  const parsed = schema.safeParse(req[target]);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => ({
      field: issue.path.length > 0 ? issue.path.join(".") : target,
      message: issue.message,
    }));
    return next(new ApiError(400, "Validation failed", errors));
  }

  // Express exposes req.query through a getter, so a plain assignment would
  // not replace it. Redefine the property with the cleaned value.
  Object.defineProperty(req, target, {
    value: parsed.data,
    writable: true,
    enumerable: true,
    configurable: true,
  });

  return next();
};
