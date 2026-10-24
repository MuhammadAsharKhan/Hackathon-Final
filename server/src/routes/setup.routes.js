import { Router } from "express";
import { getSetupStatus, postSetup } from "../controllers/setup.controller.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { setupSchema } from "../validators/setup.validators.js";

const router = Router();

router.get("/status", getSetupStatus);
router.post("/", authLimiter, validate(setupSchema), postSetup);

export default router;
