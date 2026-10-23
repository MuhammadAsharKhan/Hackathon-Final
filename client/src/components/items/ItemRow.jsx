import { Pencil, Trash2 } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import CopyButton from "@/components/ui/CopyButton";
import { formatDate } from "@/lib/format";

export default function ItemRow({ item, onEdit, onDelete }) {
  return (
    <div className="flex flex-col gap-3 border-b border-border p-5 last:border-b-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-sm font-medium">{item.title}</h2>
          <Badge status={item.status} />
        </div>
        {item.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {item.description}
          </p>
        ) : null}
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Updated {formatDate(item.updatedAt)}</span>
          <span aria-hidden="true">/</span>
          <span className="tabular-nums">UID {item.uid}</span>
          <CopyButton
            value={item.uid}
            label={`Copy uid for ${item.title}`}
            className="h-10 w-10 sm:h-6 sm:w-6"
          />
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(item)}
          aria-label={`Edit ${item.title}`}
          className="h-10 w-10 px-0 text-muted-foreground hover:text-foreground sm:h-8 sm:w-8"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(item)}
          aria-label={`Delete ${item.title}`}
          className="h-10 w-10 px-0 text-muted-foreground hover:text-danger sm:h-8 sm:w-8"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
