import { useState } from "react";
import { Megaphone, Plus } from "lucide-react";
import toast from "react-hot-toast";
import AnnouncementFormModal from "@/components/announcements/AnnouncementFormModal";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import { deleteAnnouncement, listAnnouncements } from "@/api/announcements.api";
import { ROLE_LABELS } from "@/config/menus";
import { useAuth } from "@/hooks/useAuth";
import { useConfirm } from "@/hooks/useConfirm";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useResource } from "@/hooks/useResource";
import { formatDateTime } from "@/lib/format";

const PAGE_SIZE = 10;

export default function Announcements() {
  useDocumentTitle("Announcements");

  const { user } = useAuth();
  const { ask, dialogProps } = useConfirm();
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);

  const { data, loading, error, reload } = useResource(
    () => listAnnouncements({ page, limit: PAGE_SIZE }),
    [page]
  );

  const announcements = data?.announcements || [];
  const pagination = data?.pagination;
  const canPost = user?.role === "admin" || user?.role === "hr";
  const canDelete = (announcement) =>
    user?.role === "admin" || announcement.authorId === user?.id;

  const handlePosted = () => {
    setFormOpen(false);
    setPage(1);
    reload();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Company news, newest first."
        actions={
          canPost ? (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New announcement
            </Button>
          ) : null
        }
      />

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="p-5">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton mt-3 h-3 w-full" />
              <div className="skeleton mt-2 h-3 w-2/3" />
            </Card>
          ))}
          <span className="sr-only" role="status">
            Loading announcements
          </span>
        </div>
      ) : error ? (
        <ErrorState
          title="Announcements did not load"
          message={error}
          onRetry={reload}
        />
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements yet"
          description={
            canPost
              ? "Post the first announcement to notify everyone."
              : "Company news appears here once an admin posts it."
          }
          action={
            canPost ? (
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                New announcement
              </Button>
            ) : null
          }
        />
      ) : (
        <Card className="divide-y divide-border">
          {announcements.map((announcement) => (
            <article key={announcement.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-medium">{announcement.title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {announcement.authorName || "Unknown author"}
                    {announcement.authorRole
                      ? ` · ${ROLE_LABELS[announcement.authorRole] || announcement.authorRole}`
                      : ""}
                    {` · ${formatDateTime(announcement.createdAt)}`}
                  </p>
                </div>

                {canDelete(announcement) ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-danger hover:text-danger"
                    onClick={() =>
                      ask({
                        title: "Delete announcement",
                        description: `"${announcement.title}" will be removed.`,
                        run: async () => {
                          await deleteAnnouncement(announcement.id);
                          toast.success("Announcement deleted");
                          if (announcements.length === 1 && page > 1) {
                            setPage(page - 1);
                          } else {
                            reload();
                          }
                        },
                      })
                    }
                  >
                    Delete
                  </Button>
                ) : null}
              </div>

              <p className="mt-3 whitespace-pre-line text-sm text-foreground">
                {announcement.body}
              </p>
            </article>
          ))}
        </Card>
      )}

      {!loading && !error ? (
        <Pagination
          page={pagination?.page || 1}
          pages={pagination?.pages || 0}
          total={pagination?.total || 0}
          onChange={setPage}
          itemLabel="announcements"
          itemLabelSingular="announcement"
        />
      ) : null}

      <AnnouncementFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onPosted={handlePosted}
      />

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
