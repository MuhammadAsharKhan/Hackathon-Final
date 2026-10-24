import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useMountedRef } from "@/hooks/useMountedRef";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";
import { DASHBOARD_PATH } from "@/lib/navigation";
import { PASSWORD_HINT, validatePassword } from "@/lib/validation";

const EMPTY_FORM = { currentPassword: "", newPassword: "", confirm: "" };

const validateChange = (values) => {
  const errors = {};

  if (!values.currentPassword) {
    errors.currentPassword = "Enter your current password";
  }

  const passwordError = validatePassword(values.newPassword);
  if (passwordError) errors.newPassword = passwordError;

  if (
    values.newPassword &&
    values.newPassword === values.currentPassword
  ) {
    errors.newPassword = "Choose a password different from the current one";
  }

  if (values.newPassword !== values.confirm) {
    errors.confirm = "Passwords do not match";
  }

  return errors;
};

export default function ChangePassword() {
  useDocumentTitle("Change password");

  const { changePassword, mustChangePassword } = useAuth();
  const navigate = useNavigate();
  const mountedRef = useMountedRef();

  const [values, setValues] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (field) => (event) => {
    const { value } = event.target;
    setValues((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
    setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const nextErrors = validateChange(values);
    setFieldErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);

    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      if (!mountedRef.current) return;

      setValues(EMPTY_FORM);
      toast.success("Password updated");
      navigate(DASHBOARD_PATH, { replace: true });
    } catch (error) {
      if (!mountedRef.current) return;
      setFieldErrors(getFieldErrors(error));
      setFormError(getErrorMessage(error));
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight">Change password</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Other sessions are signed out when the password changes.
      </p>

      {mustChangePassword ? (
        <p className="mt-4 rounded-lg border border-primary bg-surface-tint px-3 py-2 text-xs text-primary">
          Your account still uses a temporary password. Choose a new password to
          continue.
        </p>
      ) : null}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        <Input
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={values.currentPassword}
          onChange={update("currentPassword")}
          error={fieldErrors.currentPassword}
        />
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          value={values.newPassword}
          onChange={update("newPassword")}
          error={fieldErrors.newPassword}
          hint={PASSWORD_HINT}
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={values.confirm}
          onChange={update("confirm")}
          error={fieldErrors.confirm}
        />

        <FormError bordered>{formError}</FormError>

        <Button type="submit" className="w-full" loading={saving}>
          Save password
        </Button>
      </form>
    </Card>
  );
}
