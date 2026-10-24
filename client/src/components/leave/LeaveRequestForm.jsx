import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DateInput from "@/components/ui/DateInput";
import FormError from "@/components/ui/FormError";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { applyLeave, previewLeave } from "@/api/leave.api";
import { useMountedRef } from "@/hooks/useMountedRef";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";

const PREVIEW_DELAY = 350;
const EMPTY = { leaveTypeCode: "", startDate: "", endDate: "", reason: "" };

const previewLine = (preview) => {
  if (!preview) return "";
  if (preview.valid) {
    const remaining =
      preview.remaining === null
        ? "This type has no yearly limit."
        : `${preview.remaining} day(s) left after this request.`;
    return `${preview.days} working day(s). ${remaining}`;
  }
  return preview.reason || "These dates cannot be used";
};

export default function LeaveRequestForm({
  leaveTypes = [],
  suggestion,
  onApplied,
}) {
  const mountedRef = useMountedRef();
  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [checking, setChecking] = useState(false);

  // A suggestion from the assistant fills the fields but never submits.
  useEffect(() => {
    if (!suggestion) return;
    setForm((previous) => ({
      ...previous,
      leaveTypeCode: suggestion.type || previous.leaveTypeCode,
      startDate: suggestion.startDate || previous.startDate,
      endDate: suggestion.endDate || previous.endDate,
      reason: suggestion.reason || previous.reason,
    }));
    setFieldErrors({});
  }, [suggestion]);

  useEffect(() => {
    const { leaveTypeCode, startDate, endDate } = form;

    if (!leaveTypeCode || !startDate || !endDate) {
      setPreview(null);
      setChecking(false);
      return undefined;
    }

    let active = true;
    setChecking(true);
    const timer = setTimeout(async () => {
      try {
        const result = await previewLeave({ leaveTypeCode, startDate, endDate });
        if (active) setPreview(result);
      } catch (failure) {
        if (active) {
          setPreview({ valid: false, reason: getErrorMessage(failure), days: 0 });
        }
      } finally {
        if (active) setChecking(false);
      }
    }, PREVIEW_DELAY);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [form.leaveTypeCode, form.startDate, form.endDate]);

  const update = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const errors = {};
    if (!form.leaveTypeCode) errors.leaveTypeCode = "Choose a leave type";
    if (!form.startDate) errors.startDate = "Choose a start date";
    if (!form.endDate) errors.endDate = "Choose an end date";
    if (form.reason.trim().length < 3) {
      errors.reason = "Describe the reason, at least 3 characters";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (!preview?.valid) return;

    setSaving(true);
    setFormError("");

    try {
      const result = await applyLeave({
        leaveTypeCode: form.leaveTypeCode,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim(),
      });
      if (!mountedRef.current) return;

      setForm(EMPTY);
      setPreview(null);
      onApplied(result);
    } catch (failure) {
      if (!mountedRef.current) return;
      setFieldErrors(getFieldErrors(failure));
      setFormError(getErrorMessage(failure));
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const canSubmit =
    Boolean(preview?.valid) && form.reason.trim().length >= 3 && !saving;

  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold tracking-tight">Apply for leave</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Working days only. Weekends and holidays are skipped.
      </p>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit} noValidate>
        <Select
          label="Leave type"
          value={form.leaveTypeCode}
          onChange={update("leaveTypeCode")}
          error={fieldErrors.leaveTypeCode}
        >
          <option value="">Choose a leave type</option>
          {leaveTypes.map((type) => (
            <option key={type.code} value={type.code}>
              {type.name}
              {type.isPaid ? "" : " (unpaid)"}
            </option>
          ))}
        </Select>

        <div className="grid gap-4 sm:grid-cols-2">
          <DateInput
            label="From"
            value={form.startDate}
            max={form.endDate || undefined}
            onChange={update("startDate")}
            error={fieldErrors.startDate}
          />
          <DateInput
            label="To"
            value={form.endDate}
            min={form.startDate || undefined}
            onChange={update("endDate")}
            error={fieldErrors.endDate}
          />
        </div>

        <p
          className={
            preview && !preview.valid
              ? "text-xs text-danger"
              : "text-xs text-muted-foreground"
          }
          role="status"
        >
          {checking
            ? "Checking the dates"
            : preview
              ? previewLine(preview)
              : "Pick a type and two dates to see the working days."}
        </p>

        <Textarea
          label="Reason"
          rows={3}
          value={form.reason}
          onChange={update("reason")}
          error={fieldErrors.reason}
        />

        <FormError>{formError}</FormError>

        <Button type="submit" loading={saving} disabled={!canSubmit}>
          Apply
        </Button>
      </form>
    </Card>
  );
}
