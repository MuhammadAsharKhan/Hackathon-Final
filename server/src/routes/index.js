import { Router } from "express";
import authRoutes from "./auth.routes.js";
import itemRoutes from "./item.routes.js";
import userRoutes from "./user.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/items", itemRoutes);

export default router;
