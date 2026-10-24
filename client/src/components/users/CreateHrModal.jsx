import { useState } from "react";
import Button from "@/components/ui/Button";
import DateInput from "@/components/ui/DateInput";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import {
  listDepartments,
  listDesignations,
} from "@/api/organization.api";
import { createHrUser } from "@/api/users.api";
import { useMountedRef } from "@/hooks/useMountedRef";
import { useResource } from "@/hooks/useResource";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";
import {
  GENDER_OPTIONS,
  isBusinessDate,
  validateEmail,
  validateName,
} from "@/lib/validation";

const EMPTY_FORM = {
  name: "",
  email: "",
  departmentId: "",
  designationId: "",
  joinDate: "",
  basicSalary: "",
  gender: "",
  phone: "",
};

const validate = (form) => {
  const errors = {};

  const nameError = validateName(form.name);
  if (nameError) errors.name = nameError;

  const emailError = validateEmail(form.email);
  if (emailError) errors.email = emailError;

  if (!form.departmentId) errors.departmentId = "Choose a department";
  if (!isBusinessDate(form.joinDate)) errors.joinDate = "Choose a join date";

  const salary = Number(form.basicSalary);
  if (!form.basicSalary) errors.basicSalary = "Basic salary is required";
  else if (!(salary > 0)) errors.basicSalary = "Basic salary must be above 0";

  return errors;
};

export default function CreateHrModal({ open, onClose, onCreated }) {
  const { data, loading, error, reload } = useResource(
    () => Promise.all([listDepartments({ active: "true" }), listDesignations()]),
    []
  );
  const mountedRef = useMountedRef();

  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const departments = data?.[0]?.departments || [];
  const designations = data?.[1]?.designations || [];
  const designationChoices = form.departmentId
    ? designations.filter(
        (designation) =>
          !designation.departmentId ||
          designation.departmentId === form.departmentId
      )
    : designations;

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

    const nextErrors = validate(form);
    setFieldErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);

    try {
      const result = await createHrUser({
        name: form.name.trim(),
        email: form.email.trim(),
        departmentId: form.departmentId,
        designationId: form.designationId || null,
        joinDate: form.joinDate,
        basicSalary: Number(form.basicSalary),
        gender: form.gender || undefined,
        phone: form.phone.trim() || undefined,
      });
      if (!mountedRef.current) return;

      setForm(EMPTY_FORM);
      onCreated(result);
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
      title="New HR account"
      description="The account and the employee record are created together."
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            Create account
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
          hint="This is the sign-in address."
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
          <Input
            label="Phone"
            value={form.phone}
            onChange={update("phone")}
            error={fieldErrors.phone}
          />
        </div>

        <FormError>{formError}</FormError>
      </form>
    </Modal>
  );
}
