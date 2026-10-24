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
import {
  createLeaveType,
  deleteLeaveType,
  listLeaveTypes,
  updateLeaveType,
} from "@/api/organization.api";
import { useConfirm } from "@/hooks/useConfirm";
import { useMountedRef } from "@/hooks/useMountedRef";
import { useResource } from "@/hooks/useResource";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";

const EMPTY_FORM = { code: "", name: "", yearlyQuota: "", isPaid: true };
const CODE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const validate = (form) => {
  const errors = {};

  if (!form.name.trim()) {
    errors.name = "Name is required";
  } else if (form.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters";
  }

  if (!form.code.trim()) {
    errors.code = "Code is required";
  } else if (!CODE_PATTERN.test(form.code.trim())) {
    errors.code = "Use lowercase letters, numbers and single dashes";
  }

  if (form.yearlyQuota !== "") {
    const quota = Number(form.yearlyQuota);
    if (!Number.isInteger(quota) || quota < 0) {
      errors.yearlyQuota = "Use a whole number, or leave it blank";
    }
  }

  return errors;
};

export default function LeaveTypesPanel() {
  const { data, loading, error, reload } = useResource(
    () => listLeaveTypes(),
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

  const leaveTypes = data?.leaveTypes || [];

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (leaveType) => {
    setEditing(leaveType);
    setForm({
      code: leaveType.code,
      name: leaveType.name,
      yearlyQuota:
        leaveType.yearlyQuota === null ? "" : String(leaveType.yearlyQuota),
      isPaid: leaveType.isPaid,
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
      code: form.code.trim().toLowerCase(),
      name: form.name.trim(),
      yearlyQuota: form.yearlyQuota === "" ? null : Number(form.yearlyQuota),
      isPaid: form.isPaid,
    };

    setSaving(true);

    try {
      if (editing) {
        await updateLeaveType(editing.id, payload);
        toast.success("Leave type updated");
      } else {
        await createLeaveType(payload);
        toast.success("Leave type created");
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
      render: (leaveType) => leaveType.name,
    },
    {
      key: "code",
      header: "Code",
      className: "font-mono text-xs text-muted-foreground",
      render: (leaveType) => leaveType.code,
    },
    {
      key: "quota",
      header: "Yearly quota",
      className: "tabular-nums",
      render: (leaveType) =>
        leaveType.yearlyQuota === null
          ? "Unlimited"
          : `${leaveType.yearlyQuota} days`,
    },
    {
      key: "paid",
      header: "Pay",
      render: (leaveType) => (
        <StatusBadge tone={leaveType.isPaid ? "success" : "accent"}>
          {leaveType.isPaid ? "Paid" : "Unpaid"}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (leaveType) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(leaveType)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:text-danger"
            onClick={() =>
              ask({
                title: "Delete leave type",
                description: `"${leaveType.name}" will be removed.`,
                run: async () => {
                  await deleteLeaveType(leaveType.id);
                  toast.success("Leave type deleted");
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
      title="Leave types"
      description="Quotas feed the leave balance and payroll deductions."
      actions={
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New leave type
        </Button>
      }
    >
      <DataTable
        columns={columns}
        rows={leaveTypes}
        loading={loading}
        error={error}
        errorTitle="Leave types did not load"
        onRetry={reload}
        empty={{
          title: "No leave types yet",
          description: "Add the leave your company offers.",
        }}
      />

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? "Edit leave type" : "New leave type"}
        description="The code is a lowercase slug used by the API."
        footer={
          <>
            <Button variant="secondary" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editing ? "Save changes" : "Create leave type"}
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
          <Input
            label="Code"
            value={form.code}
            onChange={update("code")}
            error={fieldErrors.code}
            hint="For example annual or unpaid-leave"
          />
          <Input
            label="Yearly quota"
            type="number"
            min={0}
            step={1}
            value={form.yearlyQuota}
            onChange={update("yearlyQuota")}
            error={fieldErrors.yearlyQuota}
            hint="Leave it blank for unlimited."
          />
          <Checkbox
            label="Paid leave"
            checked={form.isPaid}
            onChange={update("isPaid")}
          />

          <FormError>{formError}</FormError>
        </form>
      </Modal>

      <ConfirmDialog {...dialogProps} />
    </PageSection>
  );
}
