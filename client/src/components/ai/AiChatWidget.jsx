import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import Button from "@/components/ui/Button";
import { useChat } from "@/hooks/useChat";
import ChatPanel from "./ChatPanel";

export default function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const chat = useChat({ variant: "widget" });

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!open) {
    return (
      <Button
        aria-label="Open AI Buddy"
        className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full px-0 shadow-sm sm:bottom-6 sm:right-6"
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="h-5 w-5" aria-hidden="true" />
      </Button>
    );
  }

  return (
    <div className="animate-overlay-in fixed inset-0 z-50 bg-background sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[34rem] sm:w-[26rem]">
      <ChatPanel
        chat={chat}
        variant="widget"
        onClose={() => setOpen(false)}
        className="h-full rounded-none border-0 sm:rounded-xl sm:border"
      />
    </div>
  );
}
