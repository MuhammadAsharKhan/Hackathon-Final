import { z } from "zod";
import { dateStringSchema, limitSchema, objectIdSchema, pageSchema } from "./common.validators.js";

export const auditQuerySchema = z.object({
  actor: objectIdSchema.optional(),
  action: z.string().trim().max(60).optional(),
  entity: z.string().trim().max(60).optional(),
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
  page: pageSchema,
  limit: limitSchema,
});
