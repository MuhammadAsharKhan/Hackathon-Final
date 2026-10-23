import { useEffect, useRef, useState } from "react";
import { Inbox, Plus, Search } from "lucide-react";
import toast from "react-hot-toast";
import { STATUS_LABELS } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import Select from "@/components/ui/Select";
import ItemFormModal from "@/components/items/ItemFormModal";
import ItemRow from "@/components/items/ItemRow";
import { createItem, deleteItem, listItems, updateItem } from "@/api/items.api";
import { useDebounce } from "@/hooks/useDebounce";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useMountedRef } from "@/hooks/useMountedRef";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";
import { scrollToElement } from "@/lib/scroll";

const PAGE_SIZE = 10;
const EMPTY_FORM = { title: "", description: "", status: "todo" };

const readItemInput = (form) => ({
  title: form.title.trim(),
  description: form.description.trim(),
  status: form.status,
});

const validateItemInput = ({ title, description }) => {
  const errors = {};

  if (!title) errors.title = "Title is required";
  else if (title.length > 120) {
    errors.title = "Title must be 120 characters or fewer";
  }

  if (description.length > 2000) {
    errors.description = "Description must be 2000 characters or fewer";
  }

  return errors;
};

export default function Dashboard() {
  useDocumentTitle("Dashboard");

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
  const [reloadToken, setReloadToken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const listTopRef = useRef(null);

  const mountedRef = useMountedRef();
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
      .then((itemsData) => {
        if (cancelled) return;
        setItems(itemsData.items);
        setPagination(itemsData.pagination);
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
  }, [page, debouncedSearch, status, reloadToken]);

  const filtersActive = Boolean(debouncedSearch.trim() || status);

  const changeFormField = (field) => (event) => {
    const { value } = event.target;
    setForm((previous) => ({ ...previous, [field]: value }));
    setFormErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const resetForm = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormError("");
  };

  const openCreate = () => {
    resetForm();
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
    resetForm();
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    scrollToElement(listTopRef.current);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setFormError("");

    const itemInput = readItemInput(form);
    const nextErrors = validateItemInput(itemInput);
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);

    try {
      if (editing) {
        await updateItem(editing.id, itemInput);
        toast.success("Item updated");
      } else {
        await createItem(itemInput);
        toast.success("Item created");
        setPage(1);
      }

      if (!mountedRef.current) return;
      setFormOpen(false);
      resetForm();
      setReloadToken((token) => token + 1);
    } catch (requestError) {
      if (!mountedRef.current) return;
      setFormErrors(getFieldErrors(requestError));
      setFormError(getErrorMessage(requestError));
      toast.error(getErrorMessage(requestError));
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting || deleteLoading) return;
    setDeleteLoading(true);

    try {
      await deleteItem(deleting.id);
      if (!mountedRef.current) return;
      toast.success("Item deleted");
      setDeleting(null);

      if (items.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        setReloadToken((token) => token + 1);
      }
    } catch (requestError) {
      if (!mountedRef.current) return;
      toast.error(getErrorMessage(requestError));
    } finally {
      if (mountedRef.current) setDeleteLoading(false);
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
        description="Create, search, filter and edit your items."
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
            type="search"
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

      <div ref={listTopRef} className="scroll-mt-20">
        {loading ? (
          <div className="space-y-3" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="p-5">
                <div className="skeleton h-4 w-1/3" />
                <div className="skeleton mt-3 h-3 w-2/3" />
                <div className="skeleton mt-2 h-3 w-24" />
              </Card>
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title="Items did not load"
            message={error}
            onRetry={() => setReloadToken((token) => token + 1)}
          />
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
          <Card className="overflow-hidden">
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onEdit={openEdit}
                onDelete={setDeleting}
              />
            ))}
          </Card>
        )}
      </div>

      {!loading && !error ? (
        <Pagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          onChange={handlePageChange}
        />
      ) : null}

      <ItemFormModal
        open={formOpen}
        editing={editing}
        form={form}
        errors={formErrors}
        formError={formError}
        saving={saving}
        onChange={changeFormField}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />

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
