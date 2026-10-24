import { useState } from "react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import DataTable from "@/components/data/DataTable";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DateInput from "@/components/ui/DateInput";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import PageSection from "@/components/ui/PageSection";
import {
  createHoliday,
  deleteHoliday,
  listHolidays,
  updateHoliday,
} from "@/api/organization.api";
import { useConfirm } from "@/hooks/useConfirm";
import { useMountedRef } from "@/hooks/useMountedRef";
import { useResource } from "@/hooks/useResource";
import { isBusinessDate } from "@/lib/validation";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";
import { formatDate } from "@/lib/format";

const EMPTY_FORM = { date: "", name: "" };

const validate = (form) => {
  const errors = {};

  if (!isBusinessDate(form.date)) errors.date = "Choose a date";
  if (form.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters";
  }

  return errors;
};

export default function HolidaysPanel() {
  const { data, loading, error, reload } = useResource(() => listHolidays(), []);
  const { ask, dialogProps } = useConfirm();
  const mountedRef = useMountedRef();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const holidays = data?.holidays || [];

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (holiday) => {
    setEditing(holiday);
    setForm({ date: holiday.date, name: holiday.name });
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

    const payload = { date: form.date, name: form.name.trim() };

    setSaving(true);

    try {
      if (editing) {
        await updateHoliday(editing.id, payload);
        toast.success("Holiday updated");
      } else {
        await createHoliday(payload);
        toast.success("Holiday created");
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
      key: "date",
      header: "Date",
      className: "whitespace-nowrap tabular-nums",
      render: (holiday) => formatDate(holiday.date),
    },
    {
      key: "name",
      header: "Name",
      className: "font-medium",
      render: (holiday) => holiday.name,
    },
    {
      key: "actions",
      header: "Actions",
      render: (holiday) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(holiday)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:text-danger"
            onClick={() =>
              ask({
                title: "Delete holiday",
                description: `${holiday.name} on ${formatDate(holiday.date)} will be removed.`,
                run: async () => {
                  await deleteHoliday(holiday.id);
                  toast.success("Holiday deleted");
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
      title="Holidays"
      description="Holidays are skipped by leave days and payroll."
      actions={
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New holiday
        </Button>
      }
    >
      <DataTable
        columns={columns}
        rows={holidays}
        loading={loading}
        error={error}
        errorTitle="Holidays did not load"
        onRetry={reload}
        empty={{
          title: "No holidays yet",
          description: "Add the public holidays for this year.",
        }}
      />

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? "Edit holiday" : "New holiday"}
        description="Each date can appear once."
        footer={
          <>
            <Button variant="secondary" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editing ? "Save changes" : "Create holiday"}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <DateInput
            label="Date"
            value={form.date}
            onChange={update("date")}
            error={fieldErrors.date}
          />
          <Input
            label="Name"
            value={form.name}
            onChange={update("name")}
            error={fieldErrors.name}
          />

          <FormError>{formError}</FormError>
        </form>
      </Modal>

      <ConfirmDialog {...dialogProps} />
    </PageSection>
  );
}
