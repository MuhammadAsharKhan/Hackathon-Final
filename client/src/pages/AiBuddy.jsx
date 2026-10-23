import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import ChatPanel from "@/components/ai/ChatPanel";
import ConversationSidebar from "@/components/ai/ConversationSidebar";
import { useChat } from "@/hooks/useChat";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function AiBuddy() {
  useDocumentTitle("AI Buddy");
  const chat = useChat({ variant: "page" });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen]);

  const openConversation = (uid) => {
    chat.openConversation(uid);
    setDrawerOpen(false);
  };

  const startNewChat = () => {
    chat.startNewChat();
    setDrawerOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Buddy"
        description="Chat with the configured provider. Conversations are saved to your account."
      />

      <div className="grid gap-6 md:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="hidden min-h-0 md:block">
          <ConversationSidebar
            chat={chat}
            onSelect={openConversation}
            onNewChat={startNewChat}
            className="h-[70vh] min-h-[28rem]"
          />
        </aside>

        <ChatPanel
          chat={chat}
          variant="page"
          onOpenHistory={() => setDrawerOpen(true)}
          className="h-[70vh] min-h-[28rem]"
        />
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="overlay-backdrop absolute inset-0"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Conversations"
            className="animate-panel-in absolute inset-y-0 left-0 flex w-[80%] max-w-xs flex-col border-r border-border bg-background p-4"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium">Conversations</p>
              <Button
                variant="ghost"
                className="h-10 w-10 px-0"
                aria-label="Close conversations"
                onClick={() => setDrawerOpen(false)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <ConversationSidebar
              chat={chat}
              onSelect={openConversation}
              onNewChat={startNewChat}
              className="min-h-0 flex-1"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
