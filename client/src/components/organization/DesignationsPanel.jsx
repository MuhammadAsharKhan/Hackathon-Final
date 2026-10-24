import { useState } from "react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import DataTable from "@/components/data/DataTable";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import PageSection from "@/components/ui/PageSection";
import Select from "@/components/ui/Select";
import {
  createDesignation,
  deleteDesignation,
  listDepartments,
  listDesignations,
  updateDesignation,
} from "@/api/organization.api";
import { useConfirm } from "@/hooks/useConfirm";
import { useMountedRef } from "@/hooks/useMountedRef";
import { useResource } from "@/hooks/useResource";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";
import { formatDate } from "@/lib/format";

const EMPTY_FORM = { name: "", departmentId: "" };

const validate = (form) => {
  const errors = {};
  if (form.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters";
  }
  return errors;
};

export default function DesignationsPanel() {
  const { data, loading, error, reload } = useResource(
    () => Promise.all([listDesignations(), listDepartments()]),
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

  const designations = data?.[0]?.designations || [];
  const departments = data?.[1]?.departments || [];

  const departmentName = (departmentId) =>
    departments.find((department) => department.id === departmentId)?.name || "-";

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (designation) => {
    setEditing(designation);
    setForm({
      name: designation.name,
      departmentId: designation.departmentId || "",
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
    const { value } = event.target;
    setForm((previous) => ({ ...previous, [field]: value }));
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
      departmentId: form.departmentId || null,
    };

    setSaving(true);

    try {
      if (editing) {
        await updateDesignation(editing.id, payload);
        toast.success("Designation updated");
      } else {
        await createDesignation(payload);
        toast.success("Designation created");
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
      render: (designation) => designation.name,
    },
    {
      key: "department",
      header: "Department",
      className: "text-muted-foreground",
      render: (designation) => departmentName(designation.departmentId),
    },
    {
      key: "createdAt",
      header: "Created",
      className: "whitespace-nowrap text-muted-foreground",
      render: (designation) => formatDate(designation.createdAt),
    },
    {
      key: "actions",
      header: "Actions",
      render: (designation) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(designation)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:text-danger"
            onClick={() =>
              ask({
                title: "Delete designation",
                description: `"${designation.name}" will be removed.`,
                run: async () => {
                  await deleteDesignation(designation.id);
                  toast.success("Designation deleted");
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
      title="Designations"
      description="Job titles, optionally tied to a department."
      actions={
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New designation
        </Button>
      }
    >
      <DataTable
        columns={columns}
        rows={designations}
        loading={loading}
        error={error}
        errorTitle="Designations did not load"
        onRetry={reload}
        empty={{
          title: "No designations yet",
          description: "Add the job titles your company uses.",
        }}
      />

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? "Edit designation" : "New designation"}
        description="The name must be unique."
        footer={
          <>
            <Button variant="secondary" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editing ? "Save changes" : "Create designation"}
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
          <Select
            label="Department"
            value={form.departmentId}
            onChange={update("departmentId")}
            error={fieldErrors.departmentId}
          >
            <option value="">No department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>

          <FormError>{formError}</FormError>
        </form>
      </Modal>

      <ConfirmDialog {...dialogProps} />
    </PageSection>
  );
}
