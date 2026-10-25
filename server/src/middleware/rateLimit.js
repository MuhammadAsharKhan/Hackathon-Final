import rateLimit from "express-rate-limit";

const tooManyRequests = {
  success: false,
  message: "Too many requests, try again later",
};

// A person clicking through the app never reaches this. The demo and role
// check scripts walk every route in a minute, so the ceiling leaves room for a
// full pass while still stopping a flood.
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 2000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: tooManyRequests,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: tooManyRequests,
});

export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: tooManyRequests,
});

// Enrolment writes the biometric template, so the ceiling is low per person.
export const faceEnrollLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  message: {
    success: false,
    message: "Too many face enrolments, try again in an hour",
  },
});

// Every AI route shares this bucket, so one person cannot spend the model
// budget through several endpoints.
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  message: {
    success: false,
    message: "You reached the hourly limit for the assistant",
    code: "ai_rate_limited",
  },
});
