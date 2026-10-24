import Conversation from "../models/Conversation.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { runChat } from "../services/aiAssistant.js";
import { runLoggedAi } from "../services/aiLog.js";
import { summarizeDashboard } from "../services/aiSummary.js";
import { suggestLeave } from "../services/aiSmartLeave.js";

// MongoDB stops at 16 MB per document. Keeping the newest exchanges means a
// long thread never reaches that ceiling.
const MAX_STORED_MESSAGES = 200;
// The message schema is 8000 characters. A model can answer longer than that,
// so the stored and returned reply is capped instead of failing the save.
const MAX_MESSAGE_CHARS = 8000;

const findOwnedConversation = async (conversationUid, userId) => {
  const conversation = await Conversation.findOne({
    uid: conversationUid,
    owner: userId,
  });
  if (!conversation) throw new ApiError(404, "Conversation not found");
  return conversation;
};

const saveExchange = async (conversation, userId, userMessage, assistantReply) => {
  const exchange = [
    { role: "user", content: userMessage, createdAt: new Date() },
    { role: "assistant", content: assistantReply, createdAt: new Date() },
  ];

  if (!conversation) {
    return Conversation.create({
      owner: userId,
      title: userMessage.slice(0, 40),
      messages: exchange,
    });
  }

  await Conversation.updateOne(
    { _id: conversation.id },
    { $push: { messages: { $each: exchange, $slice: -MAX_STORED_MESSAGES } } }
  );

  return conversation;
};

export const chat = asyncHandler(async (req, res) => {
  const { message } = req.body;
  const conversationRef = req.body.conversationUid ?? req.body.conversationId;

  const conversation = conversationRef
    ? await findOwnedConversation(conversationRef, req.user.id)
    : null;

  const answer = await runLoggedAi({
    user: req.user,
    kind: "chat",
    message,
    execute: () => runChat({ user: req.user, message, conversation }),
  });

  const replyText = String(answer.reply ?? "").slice(0, MAX_MESSAGE_CHARS);
  const saved = await saveExchange(conversation, req.user.id, message, replyText);

  res.json({
    success: true,
    data: {
      conversationId: saved.uid,
      conversation: { uid: saved.uid, title: saved.title },
      reply: { role: "assistant", content: replyText },
      toolsUsed: answer.toolsUsed ?? [],
      aiGenerated: true,
    },
  });
});

export const dashboardSummary = asyncHandler(async (req, res) => {
  const body = req.body ?? {};
  const filters = {
    from: body.from,
    to: body.to,
    department: body.department ?? body.departmentId,
  };

  const summary = await runLoggedAi({
    user: req.user,
    kind: "summary",
    message: JSON.stringify(filters),
    execute: () => summarizeDashboard(req.user, filters),
  });

  res.json({ success: true, data: summary });
});

export const smartLeave = asyncHandler(async (req, res) => {
  const message = req.body.message ?? req.body.text;

  const suggestion = await runLoggedAi({
    user: req.user,
    kind: "smart_leave",
    message,
    execute: () => suggestLeave(req.user, message),
  });

  res.json({ success: true, data: suggestion });
});

export const listConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({ owner: req.user.id })
    .sort({ updatedAt: -1 })
    .limit(50)
    .select("uid title updatedAt");

  res.json({
    success: true,
    data: {
      conversations: conversations.map((conversation) => ({
        uid: conversation.uid,
        title: conversation.title,
        updatedAt: conversation.updatedAt,
      })),
    },
  });
});

export const getConversation = asyncHandler(async (req, res) => {
  const conversation = await findOwnedConversation(
    req.params.uid,
    req.user.id
  );
  res.json({ success: true, data: { conversation } });
});

export const deleteConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOneAndDelete({
    uid: req.params.uid,
    owner: req.user.id,
  });

  if (!conversation) throw new ApiError(404, "Conversation not found");

  res.json({
    success: true,
    data: { uid: conversation.uid },
    message: "Conversation deleted",
  });
});
