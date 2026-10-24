import { Router } from "express";
import {
  createHoliday,
  deleteHoliday,
  listHolidays,
  updateHoliday,
} from "../controllers/holiday.controller.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { objectIdSchema } from "../validators/common.validators.js";
import {
  createHolidaySchema,
  holidayQuerySchema,
  updateHolidaySchema,
} from "../validators/holiday.validators.js";
import { z } from "zod";

const router = Router();
const idSchema = z.object({ id: objectIdSchema });

router.use(protect);

router.get("/", validate(holidayQuerySchema, "query"), listHolidays);
router.post("/", restrictTo("admin"), validate(createHolidaySchema), createHoliday);
router.patch(
  "/:id",
  restrictTo("admin"),
  validate(idSchema, "params"),
  validate(updateHolidaySchema),
  updateHoliday
);
router.delete("/:id", restrictTo("admin"), validate(idSchema, "params"), deleteHoliday);

export default router;
