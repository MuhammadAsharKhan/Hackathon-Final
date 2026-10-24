import AuditLog from "../models/AuditLog.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { addDays } from "../utils/dates.js";

export const listAuditLogs = asyncHandler(async (req, res) => {
  const { actor, action, entity, from, to, page, limit } = req.query;
  const filter = {};

  if (actor) filter.actorId = actor;
  if (action) filter.action = action;
  if (entity) filter.entity = entity;

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
    // The end date is inclusive, so the filter stops at the next midnight.
    if (to) filter.createdAt.$lt = new Date(`${addDays(to, 1)}T00:00:00.000Z`);
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
});
