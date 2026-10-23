import { Menu, Plus, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import MessageInput from "./MessageInput";
import MessageList from "./MessageList";

export default function ChatPanel({
  chat,
  variant = "page",
  onOpenHistory,
  onClose,
  className,
}) {
  const isWidget = variant === "widget";
  const canReset = chat.messages.length > 0 || Boolean(chat.conversationUid);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-background",
        className
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-1">
          {onOpenHistory ? (
            <Button
              variant="ghost"
              className="h-10 w-10 px-0 md:hidden"
              aria-label="Open conversations"
              onClick={onOpenHistory}
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
          <p className="truncate text-sm font-medium">
            {chat.title || (isWidget ? "AI Buddy" : "New chat")}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {isWidget && canReset ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 sm:h-8"
              onClick={chat.startNewChat}
              disabled={chat.sending}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New
            </Button>
          ) : null}
          {onClose ? (
            <Button
              variant="ghost"
              className="h-10 w-10 px-0"
              aria-label="Close AI Buddy"
              onClick={onClose}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>

      <MessageList
        messages={chat.messages}
        sending={chat.sending}
        error={chat.error}
        onRetry={chat.retry}
        onStarter={chat.send}
        loading={chat.loadingConversation}
        variant={variant}
      />

      <MessageInput onSend={chat.send} disabled={chat.sending} />
    </div>
  );
}
