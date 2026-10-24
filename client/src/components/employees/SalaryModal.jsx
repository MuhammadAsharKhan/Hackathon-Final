import { useState } from "react";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { updateEmployeeSalary } from "@/api/employees.api";
import { useMountedRef } from "@/hooks/useMountedRef";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";
import { formatMoney } from "@/lib/format";

const toForm = (employee) => ({
  basicSalary: String(employee?.basicSalary ?? ""),
  hraPercent: String(employee?.hraPercent ?? 40),
  medicalPercent: String(employee?.medicalPercent ?? 10),
});

const validate = (form) => {
  const errors = {};
  const basic = Number(form.basicSalary);
  const hra = Number(form.hraPercent);
  const medical = Number(form.medicalPercent);

  if (!form.basicSalary) errors.basicSalary = "Basic salary is required";
  else if (!(basic > 0)) errors.basicSalary = "Basic salary must be above 0";

  if (hra < 0 || hra > 500) errors.hraPercent = "Use a percent between 0 and 500";
  if (medical < 0 || medical > 500) {
    errors.medicalPercent = "Use a percent between 0 and 500";
  }

  return errors;
};

export default function SalaryModal({ open, onClose, employee, onSaved }) {
  const mountedRef = useMountedRef();
  const [form, setForm] = useState(() => toForm(employee));
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const basic = Number(form.basicSalary) || 0;
  const hraPercent = Number(form.hraPercent) || 0;
  const medicalPercent = Number(form.medicalPercent) || 0;
  const gross = basic * (1 + hraPercent / 100 + medicalPercent / 100);

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
      const result = await updateEmployeeSalary(employee.id, {
        basicSalary: Number(form.basicSalary),
        hraPercent,
        medicalPercent,
      });
      if (!mountedRef.current) return;
      onSaved(result);
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
      title="Salary structure"
      description={`Basic, house rent and medical allowance for ${employee?.name || "this employee"}.`}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            Save salary
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <Input
          label="Basic salary"
          type="number"
          min={0}
          step={1000}
          inputMode="numeric"
          value={form.basicSalary}
          onChange={update("basicSalary")}
          error={fieldErrors.basicSalary}
          hint="Monthly amount in PKR."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="House rent percent"
            type="number"
            min={0}
            max={500}
            step={1}
            value={form.hraPercent}
            onChange={update("hraPercent")}
            error={fieldErrors.hraPercent}
          />
          <Input
            label="Medical percent"
            type="number"
            min={0}
            max={500}
            step={1}
            value={form.medicalPercent}
            onChange={update("medicalPercent")}
            error={fieldErrors.medicalPercent}
          />
        </div>

        <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
          <p className="text-xs text-muted-foreground">Gross per month</p>
          <p className="mt-1 font-medium tabular-nums">{formatMoney(gross)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatMoney(basic)} basic, {formatMoney(basic * hraPercent / 100)} house
            rent, {formatMoney(basic * medicalPercent / 100)} medical.
          </p>
        </div>

        <FormError>{formError}</FormError>
      </form>
    </Modal>
  );
}
