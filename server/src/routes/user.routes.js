import { Router } from "express";
import {
  createHrUser,
  listUsers,
  resetUserPassword,
  setUserActive,
} from "../controllers/user.controller.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { objectIdSchema } from "../validators/common.validators.js";
import {
  createHrUserSchema,
  listUsersQuerySchema,
  setUserActiveSchema,
} from "../validators/user.validators.js";
import { z } from "zod";

const router = Router();
const idSchema = z.object({ id: objectIdSchema });

router.use(protect, restrictTo("admin"));

router.get("/", validate(listUsersQuerySchema, "query"), listUsers);
router.post("/hr", validate(createHrUserSchema), createHrUser);
router.patch(
  "/:id/active",
  validate(idSchema, "params"),
  validate(setUserActiveSchema),
  setUserActive
);
router.post("/:id/reset-password", validate(idSchema, "params"), resetUserPassword);

export default router;
