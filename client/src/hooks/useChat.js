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

// The widget keeps one conversation uid for the current browser tab.
const storeUid = (uid) => {
  try {
    if (uid) sessionStorage.setItem(WIDGET_KEY, uid);
    else sessionStorage.removeItem(WIDGET_KEY);
  } catch {
    return;
  }
};

const buildMessage = (message, key) => {
  const chatMessage = {
    key,
    role: message.role,
    content: message.content,
  };

  if (message.provider) chatMessage.provider = message.provider;
  if (message.model) chatMessage.model = message.model;

  return chatMessage;
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
  const conversationUidRef = useRef(conversationUid);
  const openRequestRef = useRef(0);

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

  const loadConversationList = useCallback(async () => {
    if (isWidget) return;

    setLoadingList(true);

    try {
      const conversationData = await listConversations();
      if (!aliveRef.current) return;
      setConversations(conversationData.conversations);
      setListError("");
    } catch (failure) {
      if (aliveRef.current) setListError(getErrorMessage(failure));
    } finally {
      if (aliveRef.current) setLoadingList(false);
    }
  }, [isWidget]);

  const startNewChat = useCallback(() => {
    openRequestRef.current += 1;
    conversationUidRef.current = null;
    setConversationUid(null);
    setTitle("");
    setMessages([]);
    setError(null);
    if (isWidget) storeUid("");
  }, [isWidget]);

  const openConversation = useCallback(
    async (uid) => {
      const requestId = openRequestRef.current + 1;
      openRequestRef.current = requestId;
      setLoadingConversation(true);
      setError(null);

      try {
        const conversationData = await getConversation(uid);
        if (!aliveRef.current || openRequestRef.current !== requestId) return;

        const conversation = conversationData.conversation;
        conversationUidRef.current = conversation.uid;
        setConversationUid(conversation.uid);
        setTitle(conversation.title);
        setMessages(
          conversation.messages.map((message) =>
            buildMessage(message, nextKey())
          )
        );
        if (isWidget) storeUid(conversation.uid);
      } catch (failure) {
        if (!aliveRef.current || openRequestRef.current !== requestId) return;

        if (failure?.response?.status === 404) {
          startNewChat();
          return;
        }

        setError({ message: getErrorMessage(failure), text: "" });
      } finally {
        if (aliveRef.current) setLoadingConversation(false);
      }
    },
    [isWidget, startNewChat]
  );

  const send = useCallback(
    async (text, { appendUser = true } = {}) => {
      const message = String(text || "").trim();
      if (!message || sendingRef.current) return false;

      const startedUid = conversationUid;
      const startedOpenRequest = openRequestRef.current;
      sendingRef.current = true;
      setSending(true);
      setError(null);

      if (appendUser) {
        setMessages((previous) => [
          ...previous,
          buildMessage({ role: "user", content: message }, nextKey()),
        ]);
      }

      try {
        const replyData = await sendChat({
          conversationUid: conversationUid || undefined,
          message,
        });

        if (!aliveRef.current) return false;

        // The reader switched conversations while this reply was coming back,
        // so it must not be mixed into the thread on screen.
        if (
          conversationUidRef.current !== startedUid ||
          openRequestRef.current !== startedOpenRequest
        ) {
          if (!isWidget) loadConversationList();
          return true;
        }

        conversationUidRef.current = replyData.conversation.uid;
        setConversationUid(replyData.conversation.uid);
        setTitle(replyData.conversation.title);
        if (isWidget) storeUid(replyData.conversation.uid);

        const assistantMessage = {
          ...replyData.reply,
          provider: replyData.provider,
          model: replyData.model,
        };
        setMessages((previous) => [
          ...previous,
          buildMessage(assistantMessage, nextKey()),
        ]);

        if (!isWidget) loadConversationList();
        return true;
      } catch (failure) {
        if (
          aliveRef.current &&
          conversationUidRef.current === startedUid &&
          openRequestRef.current === startedOpenRequest
        ) {
          setError({ message: getErrorMessage(failure), text: message });
        }
        return false;
      } finally {
        sendingRef.current = false;
        if (aliveRef.current) setSending(false);
      }
    },
    [conversationUid, isWidget, loadConversationList]
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
          previous.filter(
            (conversation) => conversation.uid !== uid
          )
        );
        if (uid === conversationUid) startNewChat();
        return true;
      } catch (failure) {
        if (aliveRef.current) setListError(getErrorMessage(failure));
        return false;
      }
    },
    [conversationUid, startNewChat]
  );

  useEffect(() => {
    if (!isWidget) {
      loadConversationList();
      return;
    }

    const storedUid = readStoredUid();
    if (storedUid) openConversation(storedUid);
  }, [isWidget, loadConversationList, openConversation]);

  return {
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
  };
};
