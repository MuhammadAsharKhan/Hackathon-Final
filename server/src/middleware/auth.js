import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    throw new ApiError(401, "Not authenticated");
  }

  const token = header.slice(7).trim();
  if (!token) throw new ApiError(401, "Not authenticated");

  let payload;
  try {
    payload = jwt.verify(token, config.jwtAccessSecret);
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, "Not authenticated");

  req.user = {
    id: user.id,
    uid: user.uid,
    name: user.name,
    email: user.email,
    age: user.age ?? null,
    gender: user.gender ?? null,
    avatarUrl: user.avatarUrl ?? "",
    hasPassword: user.hasPassword,
    role: user.role,
  };

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
