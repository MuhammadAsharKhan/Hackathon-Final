import Conversation from "../models/Conversation.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { loadAiSettings } from "../services/aiSetup.js";
import { chatWithPool } from "../services/aiKeyPool.js";

const HISTORY_LIMIT = 20;
// MongoDB stops at 16 MB per document. Keeping the newest exchanges means a
// long thread never reaches that ceiling.
const MAX_STORED_MESSAGES = 200;

const toProviderMessage = (message) => ({
  role: message.role,
  content: message.content,
});

const findOwnedConversation = async (conversationUid, userId) => {
  const conversation = await Conversation.findOne({
    uid: conversationUid,
    owner: userId,
  });
  if (!conversation) throw new ApiError(404, "Conversation not found");
  return conversation;
};

const saveExchange = async (conversation, userMessage, assistantReply) => {
  const exchange = [
    { role: "user", content: userMessage, createdAt: new Date() },
    { role: "assistant", content: assistantReply, createdAt: new Date() },
  ];

  if (conversation.isNew) {
    conversation.messages.push(...exchange);
    await conversation.save();
    return;
  }

  await Conversation.updateOne(
    { _id: conversation.id },
    { $push: { messages: { $each: exchange, $slice: -MAX_STORED_MESSAGES } } }
  );
};

export const chat = asyncHandler(async (req, res) => {
  const { conversationUid, message } = req.body;
  const settings = await loadAiSettings();

  let conversation = conversationUid
    ? await findOwnedConversation(conversationUid, req.user.id)
    : null;

  // Send the last 20 messages as context, but keep the full thread in Mongo.
  const history = conversation
    ? conversation.messages.slice(-HISTORY_LIMIT).map(toProviderMessage)
    : [];

  const providerAnswer = await chatWithPool({
    settings,
    messages: [...history, { role: "user", content: message }],
  });

  if (!conversation) {
    conversation = new Conversation({
      owner: req.user.id,
      title: message.slice(0, 40),
    });
  }

  await saveExchange(conversation, message, providerAnswer.reply);

  res.json({
    success: true,
    data: {
      conversation: {
        uid: conversation.uid,
        title: conversation.title,
      },
      reply: { role: "assistant", content: providerAnswer.reply },
      provider: providerAnswer.provider,
      model: providerAnswer.model,
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
