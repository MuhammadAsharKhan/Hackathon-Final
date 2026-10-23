import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/cn";
import { formatShortDate } from "@/lib/format";

export default function ConversationSidebar({
  chat,
  onSelect,
  onNewChat,
  className,
}) {
  const [deleting, setDeleting] = useState(null);
  const [removing, setRemoving] = useState(false);

  const handleDelete = async () => {
    if (!deleting) return;

    setRemoving(true);
    const removed = await chat.removeConversation(deleting.uid);
    setRemoving(false);

    if (removed) setDeleting(null);
  };

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <Button variant="secondary" className="w-full" onClick={onNewChat}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        New chat
      </Button>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        {chat.loadingList ? (
          <div className="space-y-2" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton h-12 w-full" />
            ))}
          </div>
        ) : chat.conversations.length === 0 ? (
          <p className="px-1 py-6 text-sm text-muted-foreground">
            No conversations yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {chat.conversations.map((conversation) => {
              const active = conversation.uid === chat.conversationUid;

              return (
                <li key={conversation.uid} className="relative">
                  <button
                    type="button"
                    onClick={() => onSelect(conversation.uid)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "w-full rounded-lg py-2 pl-3 pr-10 text-left text-sm transition-colors duration-150",
                      active
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:bg-surface hover:text-foreground"
                    )}
                  >
                    <span className="block truncate">
                      {conversation.title || "Untitled chat"}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {formatShortDate(conversation.updatedAt)}
                    </span>
                  </button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1.5 h-9 w-9 px-0 text-muted-foreground hover:text-danger"
                    aria-label={`Delete ${conversation.title || "conversation"}`}
                    onClick={() => setDeleting(conversation)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {chat.listError ? (
        <p className="mt-2 text-xs text-danger">{chat.listError}</p>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => {
          if (!removing) setDeleting(null);
        }}
        onConfirm={handleDelete}
        title="Delete conversation"
        description={
          deleting
            ? `"${deleting.title || "Untitled chat"}" and its messages will be removed.`
            : undefined
        }
        loading={removing}
      />
    </div>
  );
}
