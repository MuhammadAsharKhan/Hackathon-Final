import { useState } from "react";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Textarea from "@/components/ui/Textarea";
import { createCorrection } from "@/api/attendance.api";
import { useCompanyTimeZone } from "@/context/CompanyTimeContext";
import { useMountedRef } from "@/hooks/useMountedRef";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { formatClock } from "@/lib/time";

const clockValue = (instant, timeZone) => {
  const label = formatClock(instant, timeZone);
  return label === "-" ? "" : label;
};

const validate = (form) => {
  const errors = {};

  if (!form.requestedCheckIn && !form.requestedCheckOut) {
    errors.requestedCheckIn = "Send a check-in time, a check-out time, or both";
  }
  if (form.reason.trim().length < 5) {
    errors.reason = "Describe why the change is needed, at least 5 characters";
  }
  if (
    form.requestedCheckIn &&
    form.requestedCheckOut &&
    form.requestedCheckOut <= form.requestedCheckIn
  ) {
    errors.requestedCheckOut = "Check-out must be after check-in";
  }

  return errors;
};

export default function CorrectionRequestModal({
  open,
  day,
  onClose,
  onRequested,
}) {
  const timeZone = useCompanyTimeZone();
  const mountedRef = useMountedRef();

  const [form, setForm] = useState(() => ({
    date: day?.date || "",
    requestedCheckIn: clockValue(day?.record?.checkIn, timeZone),
    requestedCheckOut: clockValue(day?.record?.checkOut, timeZone),
    reason: "",
  }));
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const close = () => {
    if (saving) return;
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const nextErrors = validate(form);
    setFieldErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);

    try {
      const result = await createCorrection({
        date: form.date,
        requestedCheckIn: form.requestedCheckIn || null,
        requestedCheckOut: form.requestedCheckOut || null,
        reason: form.reason.trim(),
      });
      if (!mountedRef.current) return;
      onRequested(result);
    } catch (failure) {
      if (!mountedRef.current) return;
      setFieldErrors(getFieldErrors(failure));
      setFormError(getErrorMessage(failure));
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Request correction"
      description="HR reviews the change. The date cannot be edited here."
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            Send request
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
          <p className="text-xs text-muted-foreground">Date</p>
          <p className="mt-0.5 font-medium">{formatDate(form.date)}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Check-in"
            type="time"
            value={form.requestedCheckIn}
            onChange={update("requestedCheckIn")}
            error={fieldErrors.requestedCheckIn}
          />
          <Input
            label="Check-out"
            type="time"
            value={form.requestedCheckOut}
            onChange={update("requestedCheckOut")}
            error={fieldErrors.requestedCheckOut}
            hint="Leave a time empty to keep the stored value."
          />
        </div>

        <Textarea
          label="Reason"
          rows={3}
          value={form.reason}
          onChange={update("reason")}
          error={fieldErrors.reason}
          hint="At least 5 characters."
        />

        <FormError>{formError}</FormError>
      </form>
    </Modal>
  );
}
