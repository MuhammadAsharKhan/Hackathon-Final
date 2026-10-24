import { Bot } from "lucide-react";

export default function AssistantLauncher({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open the assistant"
      className="fixed right-4 z-40 inline-flex items-center gap-2 rounded-full border border-primary bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm transition duration-150 hover:border-primary-hover hover:bg-primary-hover sm:right-6"
      style={{ bottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
    >
      <Bot className="h-4 w-4" aria-hidden="true" />
      Assistant
    </button>
  );
}
