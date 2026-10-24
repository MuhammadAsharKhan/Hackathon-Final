import { useState } from "react";
import Button from "@/components/ui/Button";
import DateInput from "@/components/ui/DateInput";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { listDepartments, listDesignations } from "@/api/organization.api";
import { registerEmployee, updateEmployee } from "@/api/employees.api";
import { useMountedRef } from "@/hooks/useMountedRef";
import { useResource } from "@/hooks/useResource";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import {
  GENDER_OPTIONS,
  isBusinessDate,
  validateEmail,
  validateName,
} from "@/lib/validation";

const HRA_PERCENT = 40;
const MEDICAL_PERCENT = 10;
const STATUS_OPTIONS = [
  { value: "probation", label: "Probation" },
  { value: "active", label: "Active" },
  { value: "exited", label: "Exited" },
];

const emptyForm = () => ({
  name: "",
  email: "",
  departmentId: "",
  designationId: "",
  joinDate: "",
  basicSalary: "",
  gender: "",
  phone: "",
  address: "",
  dateOfBirth: "",
  status: "active",
  exitDate: "",
});

const formFromEmployee = (employee) => ({
  name: employee.name || "",
  email: employee.email || "",
  departmentId: employee.departmentId || "",
  designationId: employee.designationId || "",
  joinDate: employee.joinDate || "",
  basicSalary: String(employee.basicSalary ?? ""),
  gender: employee.gender || "",
  phone: employee.phone || "",
  address: employee.address || "",
  dateOfBirth: employee.dateOfBirth || "",
  status: employee.status || "active",
  exitDate: employee.exitDate || "",
});

const validate = (form, mode) => {
  const errors = {};

  const nameError = validateName(form.name);
  if (nameError) errors.name = nameError;

  const emailError = validateEmail(form.email);
  if (emailError) errors.email = emailError;

  if (!form.departmentId) errors.departmentId = "Choose a department";
  if (!isBusinessDate(form.joinDate)) errors.joinDate = "Choose a join date";
  if (form.dateOfBirth && !isBusinessDate(form.dateOfBirth)) {
    errors.dateOfBirth = "Enter the date as YYYY-MM-DD";
  }
  if (form.exitDate && !isBusinessDate(form.exitDate)) {
    errors.exitDate = "Enter the date as YYYY-MM-DD";
  }
  if (form.exitDate && form.joinDate && form.exitDate < form.joinDate) {
    errors.exitDate = "Exit date is before the join date";
  }

  if (mode === "create") {
    const salary = Number(form.basicSalary);
    if (!form.basicSalary) errors.basicSalary = "Basic salary is required";
    else if (!(salary > 0)) errors.basicSalary = "Basic salary must be above 0";
  }

  return errors;
};

export default function EmployeeFormModal({
  open,
  onClose,
  mode = "create",
  employee,
  onSaved,
}) {
  const mountedRef = useMountedRef();
  const { data, loading, error, reload } = useResource(
    () => Promise.all([listDepartments({ active: "true" }), listDesignations()]),
    []
  );

  const [form, setForm] = useState(() =>
    mode === "edit" && employee ? formFromEmployee(employee) : emptyForm()
  );
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const departments = data?.[0]?.departments || [];
  const designations = data?.[1]?.designations || [];
  const designationChoices = form.departmentId
    ? designations.filter(
        (designation) =>
          !designation.departmentId || designation.departmentId === form.departmentId
      )
    : designations;

  const basicSalary = Number(form.basicSalary) || 0;
  const grossPreview = basicSalary * (1 + HRA_PERCENT / 100 + MEDICAL_PERCENT / 100);

  const update = (field) => (event) => {
    const { value } = event.target;
    setForm((previous) => {
      const next = { ...previous, [field]: value };
      if (field === "departmentId") next.designationId = "";
      return next;
    });
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const close = () => {
    if (saving) return;
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const nextErrors = validate(form, mode);
    setFieldErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      departmentId: form.departmentId,
      designationId: form.designationId || null,
      joinDate: form.joinDate,
      gender: form.gender || undefined,
      phone: form.phone.trim(),
      address: form.address.trim(),
      dateOfBirth: form.dateOfBirth || undefined,
    };

    try {
      const result =
        mode === "create"
          ? await registerEmployee({
              ...payload,
              basicSalary,
              status: form.status === "probation" ? "probation" : "active",
            })
          : await updateEmployee(employee.id, {
              ...payload,
              status: form.status,
              exitDate: form.exitDate || null,
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
      title={mode === "create" ? "Register employee" : "Edit employee"}
      description={
        mode === "create"
          ? "The employee record and its sign-in account are created together."
          : "Setting an exit date ends the record and deactivates the sign-in."
      }
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            {mode === "create" ? "Create employee" : "Save changes"}
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
          label="Email"
          type="email"
          autoComplete="off"
          value={form.email}
          onChange={update("email")}
          error={fieldErrors.email}
          hint="This is the sign-in address and must be unique."
        />

        {error ? (
          <div className="space-y-2 rounded-lg border border-border px-3 py-2">
            <p className="text-sm text-muted-foreground">
              Departments did not load.
            </p>
            <Button variant="secondary" size="sm" onClick={reload}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Department"
              value={form.departmentId}
              onChange={update("departmentId")}
              error={fieldErrors.departmentId}
              disabled={loading}
            >
              <option value="">
                {loading ? "Loading departments" : "Choose a department"}
              </option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
            <Select
              label="Designation"
              value={form.designationId}
              onChange={update("designationId")}
              error={fieldErrors.designationId}
              disabled={loading}
              hint={
                form.departmentId
                  ? "Only designations of the chosen department are listed."
                  : undefined
              }
            >
              <option value="">No designation</option>
              {designationChoices.map((designation) => (
                <option key={designation.id} value={designation.id}>
                  {designation.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <DateInput
            label="Join date"
            value={form.joinDate}
            onChange={update("joinDate")}
            error={fieldErrors.joinDate}
          />
          {mode === "create" ? (
            <Input
              label="Basic salary"
              type="number"
              min={0}
              step={1000}
              inputMode="numeric"
              value={form.basicSalary}
              onChange={update("basicSalary")}
              error={fieldErrors.basicSalary}
              hint={`Monthly amount in PKR. Gross is ${formatMoney(grossPreview)}.`}
            />
          ) : (
            <DateInput
              label="Exit date"
              value={form.exitDate}
              onChange={update("exitDate")}
              error={fieldErrors.exitDate}
              hint="Leave empty while the employee is still with the company."
            />
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Gender"
            value={form.gender}
            onChange={update("gender")}
            error={fieldErrors.gender}
          >
            <option value="">Not set</option>
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            label="Status"
            value={form.status}
            onChange={update("status")}
            error={fieldErrors.status}
          >
            {STATUS_OPTIONS.filter((option) =>
              mode === "create" ? option.value !== "exited" : true
            ).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Phone"
            value={form.phone}
            onChange={update("phone")}
            error={fieldErrors.phone}
          />
          <DateInput
            label="Date of birth"
            value={form.dateOfBirth}
            onChange={update("dateOfBirth")}
            error={fieldErrors.dateOfBirth}
          />
        </div>

        <Textarea
          label="Address"
          rows={2}
          value={form.address}
          onChange={update("address")}
          error={fieldErrors.address}
        />

        {mode === "create" ? (
          <p className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
            Basic {formatMoney(basicSalary)} with house rent at {HRA_PERCENT}% and
            medical at {MEDICAL_PERCENT}% gives a gross of {formatMoney(grossPreview)}.
          </p>
        ) : null}

        <FormError>{formError}</FormError>
      </form>
    </Modal>
  );
}
