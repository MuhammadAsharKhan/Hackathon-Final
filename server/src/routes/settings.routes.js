import { Router } from "express";
import {
  getCompanySettings,
  patchCompanySettings,
} from "../controllers/settings.controller.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { updateSettingsSchema } from "../validators/settings.validators.js";

const router = Router();

router.use(protect);

router.get("/", restrictTo("admin", "hr"), getCompanySettings);
router.patch(
  "/",
  restrictTo("admin"),
  validate(updateSettingsSchema),
  patchCompanySettings
);

export default router;
