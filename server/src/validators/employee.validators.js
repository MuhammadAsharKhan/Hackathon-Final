import { z } from "zod";
import { emailSchema, nameSchema } from "./auth.validators.js";
import {
  dateStringSchema,
  genderSchema,
  limitSchema,
  objectIdSchema,
  pageSchema,
} from "./common.validators.js";

const phoneSchema = z.string().trim().max(30, "Phone is too long");
const addressSchema = z.string().trim().max(300, "Address is too long");
const employeeStatusSchema = z.enum(
  ["probation", "active", "exited"],
  "Status must be probation, active or exited"
);
const salarySchema = z.coerce.number().positive("Basic salary must be greater than 0");
const percentSchema = z.coerce.number().min(0, "Percent cannot be negative").max(500);

export const employeeIdParamSchema = z.object({ id: objectIdSchema });

export const registerEmployeeSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  departmentId: objectIdSchema,
  designationId: objectIdSchema.nullable().optional(),
  joinDate: dateStringSchema,
  basicSalary: salarySchema,
  gender: genderSchema.optional(),
  phone: phoneSchema.optional(),
  address: addressSchema.optional(),
  dateOfBirth: dateStringSchema.optional(),
  status: z.enum(["probation", "active"], "Status must be probation or active").optional(),
});

export const updateEmployeeSchema = z
  .object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    address: addressSchema.optional(),
    gender: genderSchema.nullable().optional(),
    dateOfBirth: dateStringSchema.nullable().optional(),
    departmentId: objectIdSchema.optional(),
    designationId: objectIdSchema.nullable().optional(),
    joinDate: dateStringSchema.optional(),
    exitDate: dateStringSchema.nullable().optional(),
    status: employeeStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const updateSalarySchema = z.object({
  basicSalary: salarySchema,
  hraPercent: percentSchema.optional(),
  medicalPercent: percentSchema.optional(),
});

export const listEmployeesQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  departmentId: objectIdSchema.optional(),
  designationId: objectIdSchema.optional(),
  status: employeeStatusSchema.optional(),
  page: pageSchema,
  limit: limitSchema,
});

export const importQuerySchema = z.object({
  dryRun: z.enum(["true", "false"]).default("false"),
});

export const monthQuerySchema = z.object({
  month: z
    .string()
    .trim()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be YYYY-MM")
    .optional(),
});
