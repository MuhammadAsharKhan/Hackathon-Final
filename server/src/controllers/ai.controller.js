import Conversation from "../models/Conversation.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { loadAiSettings } from "../services/aiSetup.js";
import { chatWithPool } from "../services/aiKeyPool.js";

const HISTORY_LIMIT = 20;

const toProviderMessage = (entry) => ({
  role: entry.role,
  content: entry.content,
});

export const chat = asyncHandler(async (req, res) => {
  const { conversationUid, message } = req.body;
  const settings = await loadAiSettings();

  let conversation = null;
  if (conversationUid) {
    conversation = await Conversation.findOne({
      uid: conversationUid,
      owner: req.user.id,
    });
    if (!conversation) throw new ApiError(404, "Conversation not found");
  }

  const history = conversation
    ? conversation.messages.slice(-HISTORY_LIMIT).map(toProviderMessage)
    : [];

  const result = await chatWithPool({
    settings,
    messages: [...history, { role: "user", content: message }],
  });

  if (!conversation) {
    conversation = new Conversation({
      owner: req.user.id,
      title: message.slice(0, 40),
    });
  }

  conversation.messages.push({ role: "user", content: message });
  conversation.messages.push({ role: "assistant", content: result.reply });
  await conversation.save();

  res.json({
    success: true,
    data: {
      conversation: { uid: conversation.uid, title: conversation.title },
      reply: { role: "assistant", content: result.reply },
      provider: result.provider,
      model: result.model,
    },
  });
});

export const listConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({ owner: req.user.id })
    .sort({ updatedAt: -1 })
    .limit(50)
    .select("uid title updatedAt");

  res.json({
    success: true,
    data: {
      conversations: conversations.map((entry) => ({
        uid: entry.uid,
        title: entry.title,
        updatedAt: entry.updatedAt,
      })),
    },
  });
});

export const getConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({
    uid: req.params.uid,
    owner: req.user.id,
  });

  if (!conversation) throw new ApiError(404, "Conversation not found");

  res.json({ success: true, data: { conversation } });
});

export const deleteConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOneAndDelete({
    uid: req.params.uid,
    owner: req.user.id,
  });

  if (!conversation) throw new ApiError(404, "Conversation not found");

  res.json({ success: true, data: { uid: conversation.uid }, message: "Conversation deleted" });
});
