import { useState } from "react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import DataTable from "@/components/data/DataTable";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import PageSection from "@/components/ui/PageSection";
import StatusBadge from "@/components/ui/StatusBadge";
import Textarea from "@/components/ui/Textarea";
import {
  createDepartment,
  deleteDepartment,
  listDepartments,
  updateDepartment,
} from "@/api/organization.api";
import { useConfirm } from "@/hooks/useConfirm";
import { useMountedRef } from "@/hooks/useMountedRef";
import { useResource } from "@/hooks/useResource";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";
import { formatDate } from "@/lib/format";

const EMPTY_FORM = { name: "", description: "", isActive: true };

const validate = (form) => {
  const errors = {};
  if (form.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters";
  }
  return errors;
};

export default function DepartmentsPanel() {
  const { data, loading, error, reload } = useResource(
    () => listDepartments(),
    []
  );
  const { ask, dialogProps } = useConfirm();
  const mountedRef = useMountedRef();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const departments = data?.departments || [];

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (department) => {
    setEditing(department);
    setForm({
      name: department.name,
      description: department.description || "",
      isActive: department.isActive,
    });
    setFieldErrors({});
    setFormError("");
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
  };

  const update = (field) => (event) => {
    const { value, type, checked } = event.target;
    setForm((previous) => ({
      ...previous,
      [field]: type === "checkbox" ? checked : value,
    }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const nextErrors = validate(form);
    setFieldErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      isActive: form.isActive,
    };

    setSaving(true);

    try {
      if (editing) {
        await updateDepartment(editing.id, payload);
        toast.success("Department updated");
      } else {
        await createDepartment(payload);
        toast.success("Department created");
      }

      if (!mountedRef.current) return;
      setFormOpen(false);
      reload();
    } catch (failure) {
      if (!mountedRef.current) return;
      setFieldErrors(getFieldErrors(failure));
      setFormError(getErrorMessage(failure));
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      className: "font-medium",
      render: (department) => department.name,
    },
    {
      key: "description",
      header: "Description",
      className: "text-muted-foreground",
      render: (department) => department.description || "-",
    },
    {
      key: "status",
      header: "Status",
      render: (department) => (
        <StatusBadge
          kind="account"
          status={department.isActive ? "active" : "inactive"}
        />
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      className: "whitespace-nowrap text-muted-foreground",
      render: (department) => formatDate(department.createdAt),
    },
    {
      key: "actions",
      header: "Actions",
      render: (department) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(department)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:text-danger"
            onClick={() =>
              ask({
                title: "Delete department",
                description: `"${department.name}" will be removed.`,
                run: async () => {
                  await deleteDepartment(department.id);
                  toast.success("Department deleted");
                  reload();
                },
              })
            }
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageSection
      title="Departments"
      description="Employees and designations point at these rows."
      actions={
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New department
        </Button>
      }
    >
      <DataTable
        columns={columns}
        rows={departments}
        loading={loading}
        error={error}
        errorTitle="Departments did not load"
        onRetry={reload}
        empty={{
          title: "No departments yet",
          description: "Create the first department to group your people.",
        }}
      />

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? "Edit department" : "New department"}
        description="The name must be unique."
        footer={
          <>
            <Button variant="secondary" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editing ? "Save changes" : "Create department"}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <Input
            label="Name"
            value={form.name}
            onChange={update("name")}
            error={fieldErrors.name}
          />
          <Textarea
            label="Description"
            rows={3}
            value={form.description}
            onChange={update("description")}
            error={fieldErrors.description}
          />
          <Checkbox
            label="Active"
            checked={form.isActive}
            onChange={update("isActive")}
          />

          <FormError>{formError}</FormError>
        </form>
      </Modal>

      <ConfirmDialog {...dialogProps} />
    </PageSection>
  );
}
