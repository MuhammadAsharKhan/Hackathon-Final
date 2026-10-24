import { z } from "zod";
import {
  dateStringSchema,
  limitSchema,
  objectIdSchema,
  pageSchema,
} from "./common.validators.js";

const leaveTypeCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Leave type is required")
  .max(40, "Leave type is too long");

const leaveYearSchema = z.coerce.number().int().min(2000).max(2100);

export const balanceQuerySchema = z.object({
  year: leaveYearSchema.optional(),
});

export const previewLeaveSchema = z.object({
  leaveTypeCode: leaveTypeCodeSchema,
  startDate: dateStringSchema,
  endDate: dateStringSchema,
});

export const createLeaveRequestSchema = z.object({
  leaveTypeCode: leaveTypeCodeSchema,
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  reason: z
    .string()
    .trim()
    .min(3, "Reason must be at least 3 characters")
    .max(300, "Reason is too long"),
});

export const leaveRequestListQuerySchema = z.object({
  status: z
    .enum(["pending", "approved", "rejected", "cancelled"], "Unknown leave status")
    .optional(),
  employeeId: objectIdSchema.optional(),
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
  page: pageSchema,
  limit: limitSchema,
});

export const leaveRequestIdParamSchema = z.object({ id: objectIdSchema });

export const leaveDecisionSchema = z.object({
  decision: z.enum(["approve", "reject"], "Decision must be approve or reject"),
  comment: z.string().trim().max(300, "Comment is too long").optional(),
});
