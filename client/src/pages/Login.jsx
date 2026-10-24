import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import ForgotPasswordModal from "@/components/auth/ForgotPasswordModal";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import { useSetup } from "@/context/SetupContext";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useMountedRef } from "@/hooks/useMountedRef";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";
import { CHANGE_PASSWORD_PATH, redirectPath } from "@/lib/navigation";

export default function Login() {
  useDocumentTitle("Sign in");

  const { login } = useAuth();
  const { setupComplete } = useSetup();
  const navigate = useNavigate();
  const location = useLocation();
  const mountedRef = useMountedRef();

  const [values, setValues] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const update = (field) => (event) => {
    const { value } = event.target;
    setValues((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setFormError("");

    const nextErrors = {};
    if (!values.email.trim()) nextErrors.email = "Email is required";
    if (!values.password) nextErrors.password = "Password is required";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);

    try {
      const session = await login({
        email: values.email.trim(),
        password: values.password,
      });
      if (!mountedRef.current) return;

      const target = session.mustChangePassword
        ? CHANGE_PASSWORD_PATH
        : redirectPath(location);
      navigate(target, { replace: true });
      toast.success("Signed in");
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
      <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Use the account your admin created for you.
      </p>

      {!setupComplete ? (
        <p className="mt-4 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
          Company setup is not finished yet. Complete the setup screen first.
        </p>
      ) : null}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={update("email")}
          error={fieldErrors.email}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={update("password")}
          error={fieldErrors.password}
        />

        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="min-h-10 px-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
            onClick={() => setForgotOpen(true)}
          >
            Forgot password
          </Button>
        </div>

        <FormError bordered>{formError}</FormError>

        <Button type="submit" className="w-full" loading={submitting}>
          Sign in
        </Button>
      </form>

      <ForgotPasswordModal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        initialEmail={values.email.trim()}
      />
    </Card>
  );
}
