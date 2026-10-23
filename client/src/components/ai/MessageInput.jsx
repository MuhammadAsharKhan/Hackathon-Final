import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import Button from "@/components/ui/Button";
import { MAX_MESSAGE_LENGTH } from "@/lib/ai";
import { cn } from "@/lib/cn";

const MAX_HEIGHT = 160;

export default function MessageInput({ onSend, disabled = false, className }) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef(null);
  const showCounter = draft.length >= MAX_MESSAGE_LENGTH - 300;

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;

    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, MAX_HEIGHT)}px`;
  }, [draft]);

  const sendMessage = () => {
    const message = draft.trim();
    if (!message || disabled) return;

    setDraft("");
    onSend(message);
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing) return;

    event.preventDefault();
    sendMessage();
  };

  return (
    <div className={cn("shrink-0 border-t border-border p-3", className)}>
      <form
        className="mx-auto w-full max-w-3xl"
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage();
        }}
      >
        <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-1.5 transition-colors duration-150 focus-within:border-foreground">
          <textarea
            ref={textareaRef}
            rows={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={MAX_MESSAGE_LENGTH}
            disabled={disabled}
            aria-label="Message"
            placeholder="Send a message"
            className="max-h-40 min-h-10 w-full resize-none bg-transparent px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
          />
          <Button
            type="submit"
            size="sm"
            className="h-10 w-10 shrink-0 px-0"
            disabled={!draft.trim() || disabled}
            aria-label="Send message"
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="mt-1.5 flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span className="hidden sm:inline">
            Enter to send, Shift and Enter for a new line.
          </span>
          <span className="sm:hidden">Enter to send</span>
          {showCounter ? (
            <span className="tabular-nums">
              {draft.length}/{MAX_MESSAGE_LENGTH}
            </span>
          ) : null}
        </div>
      </form>
    </div>
  );
}
