import { useEffect, useRef, useState } from "react";
import { Bot, RotateCcw, SendHorizontal } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import Textarea from "@/components/ui/Textarea";
import { useAuth } from "@/hooks/useAuth";
import { MESSAGE_LIMIT } from "@/hooks/useAssistant";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";

const ORG_PROMPTS = [
  "How many active employees do we have?",
  "Who came late most often this month?",
  "What is this month's attendance rate?",
  "Who is on leave today?",
];

const EMPLOYEE_PROMPTS = [
  "How many sick leaves do I have left this year?",
  "What are the office timings?",
  "What is my last net pay?",
];

export default function AssistantPanel({
  open,
  onClose,
  assistant,
  focusRequest = 0,
}) {
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const prompts = user?.role === "employee" ? EMPLOYEE_PROMPTS : ORG_PROMPTS;
  const remaining = MESSAGE_LIMIT - draft.length;

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open, focusRequest]);

  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [open, assistant.messages, assistant.pending]);

  const send = () => {
    const text = draft.trim();
    if (!text || assistant.pending) return;
    setDraft("");
    assistant.ask(text);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const composer = (
    <div className="w-full space-y-2">
      <Textarea
        ref={inputRef}
        rows={2}
        aria-label="Message the assistant"
        placeholder="Ask about attendance, leave, payroll or policy."
        value={draft}
        maxLength={MESSAGE_LIMIT}
        disabled={assistant.pending}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        className="resize-none"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Enter sends, Shift and Enter starts a new line. {remaining} characters left.
        </p>
        <Button
          size="sm"
          onClick={send}
          disabled={!draft.trim() || assistant.pending}
          loading={assistant.pending}
        >
          <SendHorizontal className="h-4 w-4" aria-hidden="true" />
          Send
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
        open={open}
        onClose={onClose}
        variant="drawer"
        title="Assistant"
        description="Answers come from your own records, within your role."
        footer={composer}
      >
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <StatusBadge tone="accent">AI-generated</StatusBadge>
          <Button variant="ghost" size="sm" onClick={assistant.reset}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            New chat
          </Button>
        </div>

        <div
          ref={listRef}
          className="mt-4 flex-1 space-y-4 overflow-y-auto"
          aria-live="polite"
        >
          {assistant.messages.length === 0 ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-dashed border-border p-4">
                <Bot className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  Ask a question in English or Roman Urdu. Try one of these:
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {prompts.map((prompt) => (
                  <Button
                    key={prompt}
                    variant="secondary"
                    size="sm"
                    className="justify-start text-left"
                    onClick={() => assistant.ask(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            assistant.messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onRetry={assistant.retry}
              />
            ))
          )}

          {assistant.pending ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
              <TypingIndicator />
              <span className="text-xs text-muted-foreground">Thinking</span>
            </div>
          ) : null}
        </div>

        {assistant.error ? (
          <p className="mt-3 text-xs text-danger" role="alert">
            {assistant.error}
          </p>
        ) : null}
        </div>
    </Modal>
  );
}
