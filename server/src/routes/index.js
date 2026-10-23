import { Router } from "express";
import authRoutes from "./auth.routes.js";
import itemRoutes from "./item.routes.js";
import userRoutes from "./user.routes.js";
import aiRoutes from "./ai.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/items", itemRoutes);
router.use(aiRoutes);

export default router;
