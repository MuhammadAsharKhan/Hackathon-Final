export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1" role="status" aria-label="Assistant is typing">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
      <span
        className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
}
