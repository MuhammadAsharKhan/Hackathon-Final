/** Three dots bouncing in turn. Transform only. */
export default function TypingIndicator() {
  return (
    <span
      className="flex items-center gap-1"
      role="status"
      aria-label="Assistant is typing"
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="typing-dot h-1.5 w-1.5 rounded-full bg-muted"
          style={{ animationDelay: `${index * 120}ms` }}
        />
      ))}
    </span>
  );
}
