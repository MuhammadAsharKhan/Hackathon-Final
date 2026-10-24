import { Router } from "express";
import {
  createDesignation,
  deleteDesignation,
  listDesignations,
  updateDesignation,
} from "../controllers/designation.controller.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { objectIdSchema } from "../validators/common.validators.js";
import {
  createDesignationSchema,
  updateDesignationSchema,
} from "../validators/designation.validators.js";
import { z } from "zod";

const router = Router();
const idSchema = z.object({ id: objectIdSchema });
const querySchema = z.object({ departmentId: objectIdSchema.optional() });

router.use(protect);

router.get("/", validate(querySchema, "query"), listDesignations);
router.post("/", restrictTo("admin"), validate(createDesignationSchema), createDesignation);
router.patch(
  "/:id",
  restrictTo("admin"),
  validate(idSchema, "params"),
  validate(updateDesignationSchema),
  updateDesignation
);
router.delete("/:id", restrictTo("admin"), validate(idSchema, "params"), deleteDesignation);

export default router;
