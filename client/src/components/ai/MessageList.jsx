import { useEffect, useRef } from "react";
import Button from "@/components/ui/Button";
import { STARTER_PROMPTS } from "@/lib/ai";
import { cn } from "@/lib/cn";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";

export default function MessageList({
  messages,
  sending,
  error,
  onRetry,
  onStarter,
  loading = false,
  variant = "page",
  className,
}) {
  const scrollRef = useRef(null);
  const isNearBottomRef = useRef(true);

  useEffect(() => {
    const scrollArea = scrollRef.current;
    if (!scrollArea) return;

    const trackScrollPosition = () => {
      isNearBottomRef.current =
        scrollArea.scrollHeight -
          scrollArea.scrollTop -
          scrollArea.clientHeight <
        120;
    };

    scrollArea.addEventListener("scroll", trackScrollPosition, {
      passive: true,
    });
    return () =>
      scrollArea.removeEventListener("scroll", trackScrollPosition);
  }, []);

  // Only follow new messages when the reader is already near the bottom.
  useEffect(() => {
    const scrollArea = scrollRef.current;
    if (!scrollArea || !isNearBottomRef.current) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    scrollArea.scrollTo({
      top: scrollArea.scrollHeight,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [messages.length, sending, error]);

  if (loading) {
    return (
      <div className={cn("flex-1 overflow-hidden px-4 py-6", className)}>
        <div className="mx-auto w-full max-w-3xl space-y-4" aria-hidden="true">
          <div className="ml-auto skeleton h-10 w-2/3" />
          <div className="skeleton h-24 w-full" />
          <div className="ml-auto skeleton h-10 w-1/2" />
        </div>
        <span className="sr-only">Loading conversation</span>
      </div>
    );
  }

  const isEmpty = messages.length === 0 && !sending && !error;

  return (
    <div ref={scrollRef} className={cn("flex-1 overflow-y-auto", className)}>
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-xs font-medium text-muted-foreground"
              aria-hidden="true"
            >
              AI
            </span>
            <h2 className="mt-4 text-sm font-medium">
              {variant === "widget" ? "Ask anything" : "Start a conversation"}
            </h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Replies come from the configured provider. Conversations are
              saved to your account.
            </p>
            <div className="mt-5 flex w-full max-w-md flex-col gap-2">
              {STARTER_PROMPTS.map((starterPrompt) => (
                <Button
                  key={starterPrompt}
                  variant="secondary"
                  size="sm"
                  className="h-auto justify-start whitespace-normal py-2 text-left text-xs"
                  onClick={() => onStarter(starterPrompt)}
                >
                  {starterPrompt}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message) => (
              <MessageBubble key={message.key} message={message} />
            ))}
            {sending ? <TypingIndicator /> : null}
            {error ? (
              <div
                role="alert"
                className="ml-9 rounded-lg border border-danger px-3 py-2.5"
              >
                <p className="text-sm text-danger">{error.message}</p>
                {error.text ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-2 h-10 sm:h-8"
                    onClick={onRetry}
                    disabled={sending}
                  >
                    Retry
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
