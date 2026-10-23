import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteConversation,
  getConversation,
  listConversations,
  sendChat,
} from "@/api/ai.api";
import { getErrorMessage } from "@/lib/errors";

const WIDGET_KEY = "ai-widget-conversation";

const readStoredUid = () => {
  try {
    return sessionStorage.getItem(WIDGET_KEY) || null;
  } catch {
    return null;
  }
};

const storeUid = (uid) => {
  try {
    if (uid) sessionStorage.setItem(WIDGET_KEY, uid);
    else sessionStorage.removeItem(WIDGET_KEY);
  } catch {
    return;
  }
};

export const useChat = ({ variant = "page" } = {}) => {
  const isWidget = variant === "widget";
  const [conversationUid, setConversationUid] = useState(() =>
    isWidget ? readStoredUid() : null
  );
  const [title, setTitle] = useState("");
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [loadingList, setLoadingList] = useState(!isWidget);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [listError, setListError] = useState("");

  const aliveRef = useRef(true);
  const sendingRef = useRef(false);
  const nextKeyRef = useRef(0);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const nextKey = () => {
    nextKeyRef.current += 1;
    return `message-${nextKeyRef.current}`;
  };

  const refreshConversations = useCallback(async () => {
    if (isWidget) return;

    setLoadingList(true);

    try {
      const data = await listConversations();
      if (!aliveRef.current) return;
      setConversations(data.conversations);
      setListError("");
    } catch (requestError) {
      if (aliveRef.current) setListError(getErrorMessage(requestError));
    } finally {
      if (aliveRef.current) setLoadingList(false);
    }
  }, [isWidget]);

  const startNewChat = useCallback(() => {
    setConversationUid(null);
    setTitle("");
    setMessages([]);
    setError(null);
    if (isWidget) storeUid("");
  }, [isWidget]);

  const openConversation = useCallback(
    async (uid) => {
      setLoadingConversation(true);
      setError(null);

      try {
        const data = await getConversation(uid);
        if (!aliveRef.current) return;

        setConversationUid(data.conversation.uid);
        setTitle(data.conversation.title);
        setMessages(
          data.conversation.messages.map((message) => ({
            key: nextKey(),
            role: message.role,
            content: message.content,
          }))
        );
        if (isWidget) storeUid(data.conversation.uid);
      } catch (requestError) {
        if (!aliveRef.current) return;

        if (requestError?.response?.status === 404) {
          setConversationUid(null);
          setTitle("");
          setMessages([]);
          if (isWidget) storeUid("");
          return;
        }

        setError({ message: getErrorMessage(requestError), text: "" });
      } finally {
        if (aliveRef.current) setLoadingConversation(false);
      }
    },
    [isWidget]
  );

  const send = useCallback(
    async (text, { appendUser = true } = {}) => {
      const message = String(text || "").trim();
      if (!message || sendingRef.current) return false;

      sendingRef.current = true;
      setSending(true);
      setError(null);

      if (appendUser) {
        setMessages((previous) => [
          ...previous,
          { key: nextKey(), role: "user", content: message },
        ]);
      }

      try {
        const data = await sendChat({
          conversationUid: conversationUid || undefined,
          message,
        });

        if (!aliveRef.current) return false;

        setConversationUid(data.conversation.uid);
        setTitle(data.conversation.title);
        if (isWidget) storeUid(data.conversation.uid);

        setMessages((previous) => [
          ...previous,
          {
            key: nextKey(),
            role: "assistant",
            content: data.reply.content,
            provider: data.provider,
            model: data.model,
          },
        ]);

        if (!isWidget) refreshConversations();
        return true;
      } catch (requestError) {
        if (aliveRef.current) {
          setError({ message: getErrorMessage(requestError), text: message });
        }
        return false;
      } finally {
        sendingRef.current = false;
        if (aliveRef.current) setSending(false);
      }
    },
    [conversationUid, isWidget, refreshConversations]
  );

  const retry = useCallback(() => {
    if (!error?.text) return false;
    return send(error.text, { appendUser: false });
  }, [error, send]);

  const removeConversation = useCallback(
    async (uid) => {
      try {
        await deleteConversation(uid);
        if (!aliveRef.current) return true;

        setConversations((previous) =>
          previous.filter((entry) => entry.uid !== uid)
        );
        if (uid === conversationUid) startNewChat();
        return true;
      } catch (requestError) {
        if (aliveRef.current) setListError(getErrorMessage(requestError));
        return false;
      }
    },
    [conversationUid, startNewChat]
  );

  useEffect(() => {
    if (!isWidget) {
      refreshConversations();
      return;
    }

    const stored = readStoredUid();
    if (stored) openConversation(stored);
  }, []);

  return {
    variant,
    conversationUid,
    title,
    messages,
    conversations,
    loadingConversation,
    loadingList,
    sending,
    error,
    listError,
    send,
    retry,
    startNewChat,
    openConversation,
    removeConversation,
    refreshConversations,
  };
};
