import { z } from "zod";
import { dateStringSchema, objectIdSchema } from "./common.validators.js";

export const dashboardQuerySchema = z.object({
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
  department: objectIdSchema.optional(),
});
