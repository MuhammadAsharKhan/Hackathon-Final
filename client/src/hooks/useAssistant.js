import { useCallback, useEffect, useRef, useState } from "react";
import { chatWithAssistant } from "@/api/ai.api";
import { getErrorMessage } from "@/lib/errors";

export const MESSAGE_LIMIT = 1000;

const MESSAGES_KEY = "assistant:messages";
const CONVERSATION_KEY = "assistant:conversation";

const readStored = (key, fallback) => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const store = (key, value) => {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A full or blocked session storage only costs the thread, not the chat.
  }
};

let messageId = 0;
const nextId = () => {
  messageId += 1;
  return `m${Date.now()}-${messageId}`;
};

// 429 and 503 are the two failures a user can act on, so they get their own
// wording instead of the generic server message.
const friendlyMessage = (failure) => {
  const status = failure?.response?.status;
  if (status === 429) {
    return "You reached the hourly limit for the assistant. Try again later.";
  }
  if (status === 503) {
    return "The assistant is busy right now. Try again in a minute.";
  }
  return getErrorMessage(failure);
};

export const useAssistant = () => {
  const [messages, setMessages] = useState(() => readStored(MESSAGES_KEY, []));
  const [conversationId, setConversationId] = useState(() =>
    readStored(CONVERSATION_KEY, "")
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const lastSent = useRef("");

  useEffect(() => {
    store(MESSAGES_KEY, messages);
  }, [messages]);

  useEffect(() => {
    store(CONVERSATION_KEY, conversationId || null);
  }, [conversationId]);

  const ask = useCallback(
    async (text) => {
      const question = String(text || "").trim();
      if (!question || pending) return;

      lastSent.current = question;
      setError("");
      setPending(true);
      setMessages((current) => [
        ...current,
        { id: nextId(), role: "user", content: question },
      ]);

      try {
        const answer = await chatWithAssistant(question, conversationId || undefined);
        if (answer?.conversationId) setConversationId(answer.conversationId);
        setMessages((current) => [
          ...current,
          {
            id: nextId(),
            role: "assistant",
            content: answer?.reply?.content || "",
            toolsUsed: answer?.toolsUsed || [],
          },
        ]);
      } catch (failure) {
        setError(friendlyMessage(failure));
        setMessages((current) => [
          ...current,
          { id: nextId(), role: "assistant", content: "", failed: true },
        ]);
      } finally {
        setPending(false);
      }
    },
    [conversationId, pending]
  );

  const retry = useCallback(() => {
    if (pending || !lastSent.current) return;
    setMessages((current) => current.filter((message) => !message.failed));
    ask(lastSent.current);
  }, [ask, pending]);

  const reset = useCallback(() => {
    lastSent.current = "";
    setMessages([]);
    setConversationId("");
    setError("");
  }, []);

  return { messages, pending, error, ask, retry, reset };
};
