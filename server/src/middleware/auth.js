import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// A forced password change locks every route except the four that let the user
// finish it or leave.
const PASSWORD_CHANGE_ROUTES = new Set([
  "POST /auth/change-password",
  "GET /auth/me",
  "POST /auth/logout",
  "POST /auth/refresh",
]);

const routeKey = (req) => {
  const path = req.originalUrl.split("?")[0].replace(/^\/api/, "");
  return `${req.method} ${path}`;
};

export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    throw new ApiError(401, "Not authenticated");
  }

  const token = header.slice(7).trim();
  if (!token) throw new ApiError(401, "Not authenticated");

  let tokenPayload;
  try {
    tokenPayload = jwt.verify(token, config.jwtAccessSecret);
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }

  const user = await User.findById(tokenPayload.sub);
  if (!user) throw new ApiError(401, "Not authenticated");
  if (!user.isActive) throw new ApiError(401, "This account is inactive");

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    employeeId: user.employeeId ? String(user.employeeId) : null,
    mustChangePassword: user.mustChangePassword,
  };

  if (user.mustChangePassword && !PASSWORD_CHANGE_ROUTES.has(routeKey(req))) {
    throw new ApiError(
      403,
      "Change your password to continue",
      undefined,
      "PASSWORD_CHANGE_REQUIRED"
    );
  }

  next();
});

export const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(new ApiError(401, "Not authenticated"));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "Forbidden"));
    }
    return next();
  };
