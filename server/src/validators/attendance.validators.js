import { z } from "zod";
import {
  dateStringSchema,
  limitSchema,
  objectIdSchema,
  pageSchema,
  timeStringSchema,
} from "./common.validators.js";
import { DAY_STATUSES } from "../services/attendanceCalc.js";

const finiteNumber = (message) =>
  z
    .number({ error: message })
    .finite({ error: message });

const latitudeSchema = finiteNumber("Latitude must be a finite number")
  .min(-90)
  .max(90);
const longitudeSchema = finiteNumber("Longitude must be a finite number")
  .min(-180)
  .max(180);

export const descriptorSchema = z
  .array(finiteNumber("Descriptor values must be finite numbers").min(-2).max(2))
  .length(128, "A face descriptor must have 128 numbers");

const locationShape = {
  lat: latitudeSchema.optional(),
  lng: longitudeSchema.optional(),
  accuracy: finiteNumber("Accuracy must be a finite number").min(0).max(100000).optional(),
  faceCount: finiteNumber("Face count must be a finite number").int().min(0).max(10).optional(),
  source: z.enum(["web", "camera"]).optional(),
  descriptor: descriptorSchema.optional(),
};

export const checkInSchema = z
  .object(locationShape)
  .refine((value) => (value.lat === undefined) === (value.lng === undefined), {
    message: "Send both lat and lng, or neither",
  });

export const checkOutSchema = z
  .object({ ...locationShape })
  .refine((value) => (value.lat === undefined) === (value.lng === undefined), {
    message: "Send both lat and lng, or neither",
  });

export const attendanceMonthQuerySchema = z.object({
  month: z
    .string()
    .trim()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be YYYY-MM")
    .optional(),
});

export const boardQuerySchema = z.object({
  date: dateStringSchema.optional(),
  departmentId: objectIdSchema.optional(),
  search: z.string().trim().max(80).optional(),
  status: z.enum(DAY_STATUSES, "Unknown attendance status").optional(),
  page: pageSchema,
  limit: limitSchema,
});

export const employeeAttendanceParamsSchema = z.object({
  employeeId: objectIdSchema,
});

export const correctionIdParamSchema = z.object({ id: objectIdSchema });

export const createCorrectionSchema = z
  .object({
    date: dateStringSchema,
    requestedCheckIn: timeStringSchema.nullable().optional(),
    requestedCheckOut: timeStringSchema.nullable().optional(),
    reason: z
      .string()
      .trim()
      .min(5, "Reason must be at least 5 characters")
      .max(300, "Reason is too long"),
  })
  .refine(
    (value) => Boolean(value.requestedCheckIn) || Boolean(value.requestedCheckOut),
    { message: "Send a check-in time, a check-out time, or both" }
  );

export const correctionListQuerySchema = z.object({
  status: z
    .enum(["pending", "approved", "rejected"], "Unknown correction status")
    .optional(),
  page: pageSchema,
  limit: limitSchema,
});

export const correctionDecisionSchema = z.object({
  decision: z.enum(["approve", "reject"], "Decision must be approve or reject"),
  comment: z.string().trim().max(300, "Comment is too long").optional(),
});

export const faceEnrollSchema = z.object({
  descriptor: descriptorSchema,
});

export const faceRemoveParamsSchema = z.object({
  employeeId: objectIdSchema,
});
