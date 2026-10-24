import { z } from "zod";
import { limitSchema, pageSchema } from "./common.validators.js";

export const notificationQuerySchema = z.object({
  unread: z.enum(["true", "false"]).optional(),
  page: pageSchema,
  limit: limitSchema,
});
