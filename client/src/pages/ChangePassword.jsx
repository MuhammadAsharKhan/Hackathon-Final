import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Lock } from "lucide-react";
import PasswordStrength from "@/components/auth/PasswordStrength";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import PasswordInput from "@/components/ui/PasswordInput";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useMountedRef } from "@/hooks/useMountedRef";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";
import { DASHBOARD_PATH } from "@/lib/navigation";
import { validatePassword } from "@/lib/validation";

const EMPTY_FORM = { currentPassword: "", newPassword: "", confirm: "" };

const validateChange = (values) => {
  const errors = {};

  if (!values.currentPassword) {
    errors.currentPassword = "Enter your current password";
  }

  const passwordError = validatePassword(values.newPassword);
  if (passwordError) errors.newPassword = passwordError;

  if (values.newPassword && values.newPassword === values.currentPassword) {
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
    <div>
      <h1 className="font-display text-[30px] font-extrabold leading-tight tracking-[-0.02em] text-text">
        Change password
      </h1>
      <p className="mt-1.5 text-[15px] text-muted">
        Other sessions are signed out when the password changes.
      </p>

      {mustChangePassword ? (
        <p className="mt-5 rounded-control bg-blue-50 px-3.5 py-2.5 text-xs text-blue-700">
          Your account still uses a temporary password. Choose a new password to
          continue.
        </p>
      ) : null}

      <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
        <PasswordInput
          label="Current password"
          autoComplete="current-password"
          leadingIcon={Lock}
          value={values.currentPassword}
          onChange={update("currentPassword")}
          error={fieldErrors.currentPassword}
          autoFocus
        />

        <div className="space-y-2.5">
          <PasswordInput
            label="New password"
            autoComplete="new-password"
            leadingIcon={Lock}
            value={values.newPassword}
            onChange={update("newPassword")}
            error={fieldErrors.newPassword}
          />
          <PasswordStrength value={values.newPassword} />
        </div>

        <PasswordInput
          label="Confirm new password"
          autoComplete="new-password"
          leadingIcon={Lock}
          value={values.confirm}
          onChange={update("confirm")}
          error={fieldErrors.confirm}
        />

        <FormError bordered>{formError}</FormError>

        <Button type="submit" size="lg" className="w-full" loading={saving}>
          Save password
        </Button>
      </form>
    </div>
  );
}
