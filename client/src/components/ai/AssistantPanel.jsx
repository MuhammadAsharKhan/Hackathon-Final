import { useEffect, useRef, useState } from "react";
import { ArrowDown, RotateCcw, SendHorizontal } from "lucide-react";
import Logo from "@/components/brand/Logo";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusPill from "@/components/ui/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { MESSAGE_LIMIT } from "@/hooks/useAssistant";
import { cn } from "@/lib/cn";
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

const COUNTER_FROM = 120;

export default function AssistantPanel({
  open,
  onClose,
  assistant,
  focusRequest = 0,
}) {
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const [atBottom, setAtBottom] = useState(true);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const prompts = user?.role === "employee" ? EMPLOYEE_PROMPTS : ORG_PROMPTS;
  const remaining = MESSAGE_LIMIT - draft.length;

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open, focusRequest]);

  // Auto-grow the composer without animating height.
  useEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, 140)}px`;
  }, [draft, open]);

  // Stay pinned to the newest message unless the user scrolled up.
  useEffect(() => {
    if (!open || !atBottom) return;
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [open, assistant.messages, assistant.pending, atBottom]);

  const send = () => {
    const text = draft.trim();
    if (!text || assistant.pending) return;
    setDraft("");
    setAtBottom(true);
    assistant.ask(text);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const handleScroll = () => {
    const list = listRef.current;
    if (!list) return;
    const distance = list.scrollHeight - list.scrollTop - list.clientHeight;
    setAtBottom(distance < 40);
  };

  const jumpToLatest = () => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
    setAtBottom(true);
  };

  const lastIndex = assistant.messages.length - 1;

  const composer = (
    <div className="w-full">
      <div className="rounded-card bg-surface p-2.5 shadow-e3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            aria-label="Message the assistant"
            placeholder="Ask about attendance, leave, payroll or policy."
            value={draft}
            maxLength={MESSAGE_LIMIT}
            disabled={assistant.pending}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            className="max-h-[140px] min-h-[40px] w-full resize-none bg-transparent px-2 py-2 text-[15px] text-text placeholder:text-muted focus:outline-none disabled:opacity-60"
          />

          <button
            type="button"
            onClick={send}
            disabled={!draft.trim() || assistant.pending}
            aria-label="Send message"
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white",
              "bg-brand-gradient shadow-[0_6px_14px_-4px_rgba(28,116,239,0.6)]",
              "transition-transform duration-150 ease-brand active:scale-95",
              (!draft.trim() || assistant.pending) &&
                "cursor-not-allowed opacity-45 shadow-none"
            )}
          >
            <SendHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className="mt-1.5 px-1 text-[11.5px] text-muted">
        Enter sends, Shift and Enter starts a new line.
        {remaining <= COUNTER_FROM ? ` ${remaining} characters left.` : ""}
      </p>
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
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-ink">
              <Logo variant="mark" tone="light" size="sm" />
            </span>
            <StatusPill tone="blue" size="sm">
              AI-generated
            </StatusPill>
          </div>

          <Button variant="ghost" size="sm" onClick={assistant.reset}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            New chat
          </Button>
        </div>

        <div className="relative min-h-0 flex-1">
          <div
            ref={listRef}
            onScroll={handleScroll}
            className="h-full space-y-4 overflow-y-auto rounded-xl bg-mist p-3"
            aria-live="polite"
          >
            {assistant.messages.length === 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted">
                  Ask a question in English or Roman Urdu. Try one of these:
                </p>
                <div className="flex flex-col items-start gap-2">
                  {prompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => assistant.ask(prompt)}
                      className="rounded-pill bg-surface px-3.5 py-2 text-left text-[13.5px] text-text-2 shadow-e1 hover:bg-blue-50 hover:text-text"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              assistant.messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onRetry={assistant.retry}
                  newest={index === lastIndex}
                />
              ))
            )}

            {assistant.pending ? (
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface shadow-e1">
                  <Logo variant="mark" tone="dark" size="sm" />
                </span>
                <div className="flex items-center gap-2 rounded-[18px] rounded-tl-[6px] bg-surface px-3.5 py-2.5 shadow-e1">
                  <TypingIndicator />
                  <span className="text-[11.5px] text-muted">Thinking</span>
                </div>
              </div>
            ) : null}
          </div>

          {!atBottom && assistant.messages.length > 0 ? (
            <button
              type="button"
              onClick={jumpToLatest}
              className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-pill bg-ink px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-e3"
            >
              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
              Jump to latest
            </button>
          ) : null}
        </div>

        {assistant.error ? (
          <p className="mt-3 text-xs text-status-rose" role="alert">
            {assistant.error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
