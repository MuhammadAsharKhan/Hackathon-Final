import { Sparkles } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import CopyButton from "@/components/ui/CopyButton";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";
import { providerLabel } from "@/lib/ai";
import Markdown from "./Markdown";

export default function MessageBubble({ message }) {
  const { user } = useAuth();
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full gap-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {isUser ? null : (
        <span
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background"
          aria-hidden="true"
        >
          <Sparkles className="h-3 w-3" />
        </span>
      )}

      <div
        className={cn(
          "min-w-0",
          isUser ? "max-w-[85%] sm:max-w-[75%]" : "flex-1"
        )}
      >
        <div
          className={cn(
            "animate-message-in rounded-2xl px-4 py-2.5 text-sm",
            isUser
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md border border-border bg-background"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words leading-relaxed">
              {message.content}
            </p>
          ) : (
            <Markdown content={message.content} className="break-words" />
          )}
        </div>

        {isUser ? null : (
          <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
            {message.provider ? (
              <span>via {providerLabel(message.provider)}</span>
            ) : null}
            <CopyButton
              value={message.content}
              label="Copy reply"
              className="h-6 w-6"
            />
          </div>
        )}
      </div>

      {isUser ? <Avatar user={user} size="sm" className="mt-0.5" /> : null}
    </div>
  );
}
