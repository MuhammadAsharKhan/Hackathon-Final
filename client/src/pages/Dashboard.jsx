import { useEffect, useState } from "react";
import {
  AlertCircle,
  Inbox,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import Badge, { STATUS_LABELS } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { createItem, deleteItem, listItems, updateItem } from "@/api/items.api";
import { useDebounce } from "@/hooks/useDebounce";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";

const PAGE_SIZE = 10;
const EMPTY_FORM = { title: "", description: "", status: "todo" };

const formatDate = (value) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    pages: 0,
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    listItems({
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch.trim() || undefined,
      status: status || undefined,
    })
      .then((payload) => {
        if (cancelled) return;
        setItems(payload.items);
        setPagination(payload.pagination);
      })
      .catch((requestError) => {
        if (cancelled) return;
        setError(getErrorMessage(requestError));
        setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, status, refreshKey]);

  const filtersActive = Boolean(debouncedSearch.trim() || status);

  const updateForm = (field) => (event) => {
    const { value } = event.target;
    setForm((previous) => ({ ...previous, [field]: value }));
    setFormErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description || "",
      status: item.status,
    });
    setFormErrors({});
    setFormError("");
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    const title = form.title.trim();
    const description = form.description.trim();
    const nextErrors = {};

    if (!title) nextErrors.title = "Title is required";
    else if (title.length > 120)
      nextErrors.title = "Title must be 120 characters or fewer";

    if (description.length > 2000)
      nextErrors.description = "Description must be 2000 characters or fewer";

    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);

    try {
      const payload = { title, description, status: form.status };

      if (editing) {
        await updateItem(editing.id, payload);
        toast.success("Item updated");
      } else {
        await createItem(payload);
        toast.success("Item created");
        setPage(1);
      }

      setFormOpen(false);
      setRefreshKey((key) => key + 1);
    } catch (requestError) {
      setFormErrors(getFieldErrors(requestError));
      setFormError(getErrorMessage(requestError));
      toast.error(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);

    try {
      await deleteItem(deleting.id);
      toast.success("Item deleted");
      setDeleting(null);
      if (items.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        setRefreshKey((key) => key + 1);
      }
    } catch (requestError) {
      toast.error(getErrorMessage(requestError));
    } finally {
      setDeleteLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Items"
        description="A working CRUD flow with search, filters and owner scoping."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New item
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="Search items by title"
            placeholder="Search by title"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <div className="sm:w-44">
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="todo">{STATUS_LABELS.todo}</option>
            <option value="in_progress">{STATUS_LABELS.in_progress}</option>
            <option value="done">{STATUS_LABELS.done}</option>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border border-border p-5"
            >
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton mt-3 h-3 w-2/3" />
              <div className="skeleton mt-2 h-3 w-24" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-border p-6">
          <div className="flex items-start gap-3">
            <AlertCircle
              className="mt-0.5 h-4 w-4 text-danger"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium">Items did not load</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => setRefreshKey((key) => key + 1)}
              >
                Try again
              </Button>
            </div>
          </div>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={filtersActive ? "No matching items" : "No items yet"}
          description={
            filtersActive
              ? "Try a different search or status."
              : "Create the first item to see the flow end to end."
          }
          action={
            filtersActive ? (
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                New item
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 border-b border-border p-5 last:border-b-0 sm:flex-row sm:items-start sm:justify-between"
            >
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
                <p className="text-xs text-muted-foreground">
                  Updated {formatDate(item.updatedAt)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(item)}
                  aria-label={`Edit ${item.title}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleting(item)}
                  aria-label={`Delete ${item.title}`}
                  className="text-muted-foreground hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error ? (
        <Pagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          onChange={setPage}
        />
      ) : null}

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? "Edit item" : "New item"}
        description={
          editing
            ? "Change the details, then save."
            : "Add a title, then set the status as work moves."
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeForm}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" form="item-form" loading={saving}>
              Save
            </Button>
          </>
        }
      >
        <form
          id="item-form"
          className="space-y-4"
          onSubmit={handleSubmit}
          noValidate
        >
          <Input
            label="Title"
            value={form.title}
            onChange={updateForm("title")}
            error={formErrors.title}
            maxLength={120}
            autoComplete="off"
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={updateForm("description")}
            error={formErrors.description}
            hint="Optional. Up to 2000 characters."
            maxLength={2000}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={updateForm("status")}
            error={formErrors.status}
          >
            <option value="todo">{STATUS_LABELS.todo}</option>
            <option value="in_progress">{STATUS_LABELS.in_progress}</option>
            <option value="done">{STATUS_LABELS.done}</option>
          </Select>

          {formError ? (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          ) : null}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => {
          if (!deleteLoading) setDeleting(null);
        }}
        onConfirm={handleDelete}
        title="Delete item"
        description={
          deleting ? `"${deleting.title}" will be removed.` : undefined
        }
        loading={deleteLoading}
      />
    </div>
  );
}
