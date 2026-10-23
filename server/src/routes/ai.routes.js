import { Router } from "express";
import {
  chat,
  deleteConversation,
  getConversation,
  listConversations,
} from "../controllers/ai.controller.js";
import {
  createAiKey,
  deleteAiKey,
  getAiSettings,
  listAiKeys,
  testAiKeyById,
  updateAiKey,
  updateAiSettings,
} from "../controllers/aiAdmin.controller.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { aiChatLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import {
  aiKeyIdSchema,
  aiSettingsSchema,
  chatSchema,
  conversationParamsSchema,
  createAiKeySchema,
  updateAiKeySchema,
} from "../validators/ai.validators.js";

const router = Router();

router.post("/ai/chat", protect, aiChatLimiter, validate(chatSchema), chat);
router.get("/ai/conversations", protect, listConversations);
router.get(
  "/ai/conversations/:uid",
  protect,
  validate(conversationParamsSchema, "params"),
  getConversation
);
router.delete(
  "/ai/conversations/:uid",
  protect,
  validate(conversationParamsSchema, "params"),
  deleteConversation
);

router.use("/admin/ai", protect, restrictTo("admin"));

router.get("/admin/ai/keys", listAiKeys);
router.post("/admin/ai/keys", validate(createAiKeySchema), createAiKey);
router.patch(
  "/admin/ai/keys/:id",
  validate(aiKeyIdSchema, "params"),
  validate(updateAiKeySchema),
  updateAiKey
);
router.delete(
  "/admin/ai/keys/:id",
  validate(aiKeyIdSchema, "params"),
  deleteAiKey
);
router.post(
  "/admin/ai/keys/:id/test",
  validate(aiKeyIdSchema, "params"),
  testAiKeyById
);
router.get("/admin/ai/settings", getAiSettings);
router.put(
  "/admin/ai/settings",
  validate(aiSettingsSchema),
  updateAiSettings
);

export default router;
