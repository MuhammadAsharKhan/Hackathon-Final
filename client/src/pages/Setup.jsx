import { useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import { completeSetup } from "@/api/setup.api";
import { useSetup } from "@/context/SetupContext";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useMountedRef } from "@/hooks/useMountedRef";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";
import {
  PASSWORD_HINT,
  validateEmail,
  validateName,
  validatePassword,
} from "@/lib/validation";

const EMPTY_FORM = {
  companyName: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
  confirm: "",
};

const validateSetup = (values) => {
  const errors = {};

  if (values.companyName.trim().length < 2) {
    errors.companyName = "Company name must be at least 2 characters";
  }

  const nameError = validateName(values.adminName);
  if (nameError) errors.adminName = nameError;

  const emailError = validateEmail(values.adminEmail);
  if (emailError) errors.adminEmail = emailError;

  const passwordError = validatePassword(values.adminPassword);
  if (passwordError) errors.adminPassword = passwordError;

  if (values.adminPassword !== values.confirm) {
    errors.confirm = "Passwords do not match";
  }

  return errors;
};

export default function Setup() {
  useDocumentTitle("Company setup");

  const { applySession, user } = useAuth();
  const { setupComplete, markComplete } = useSetup();
  const navigate = useNavigate();
  const mountedRef = useMountedRef();
  const finishedRef = useRef(false);

  const [values, setValues] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // A completed setup has no form to show. The flag keeps this page quiet for
  // the moment between the setup request and the navigation to the company tab.
  if (setupComplete && !finishedRef.current) {
    return <Navigate to={user ? "/dashboard" : "/login"} replace />;
  }

  const update = (field) => (event) => {
    const { value } = event.target;
    setValues((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validateSetup(values);
    setFieldErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);

    try {
      const session = await completeSetup({
        companyName: values.companyName.trim(),
        adminName: values.adminName.trim(),
        adminEmail: values.adminEmail.trim(),
        adminPassword: values.adminPassword,
      });
      if (!mountedRef.current) return;

      finishedRef.current = true;
      applySession(session);
      navigate("/admin/organization", { replace: true });
      markComplete();
      toast.success("Setup complete");
    } catch (error) {
      if (!mountedRef.current) return;
      setFieldErrors(getFieldErrors(error));
      setFormError(getErrorMessage(error));
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  };

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight">Set up your company</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This runs once. It creates the company settings and the admin account.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        <Input
          label="Company name"
          autoComplete="organization"
          value={values.companyName}
          onChange={update("companyName")}
          error={fieldErrors.companyName}
        />
        <Input
          label="Admin name"
          autoComplete="name"
          value={values.adminName}
          onChange={update("adminName")}
          error={fieldErrors.adminName}
        />
        <Input
          label="Admin email"
          type="email"
          autoComplete="email"
          value={values.adminEmail}
          onChange={update("adminEmail")}
          error={fieldErrors.adminEmail}
        />
        <Input
          label="Admin password"
          type="password"
          autoComplete="new-password"
          value={values.adminPassword}
          onChange={update("adminPassword")}
          error={fieldErrors.adminPassword}
          hint={PASSWORD_HINT}
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={values.confirm}
          onChange={update("confirm")}
          error={fieldErrors.confirm}
        />

        <FormError bordered>{formError}</FormError>

        <Button type="submit" className="w-full" loading={submitting}>
          Finish setup
        </Button>
      </form>
    </Card>
  );
}
