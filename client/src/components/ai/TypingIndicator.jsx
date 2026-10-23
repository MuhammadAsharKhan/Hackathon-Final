export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-3" role="status">
      <span
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[10px] font-medium text-muted-foreground"
        aria-hidden="true"
      >
        AI
      </span>
      <div className="flex h-9 items-center gap-1 rounded-2xl rounded-bl-md border border-border px-4">
        <span className="sr-only">Assistant is typing</span>
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground"
            style={{ animationDelay: `${dot * 140}ms` }}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}
