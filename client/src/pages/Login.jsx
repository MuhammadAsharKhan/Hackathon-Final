import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Lock, Mail } from "lucide-react";
import ForgotPasswordModal from "@/components/auth/ForgotPasswordModal";
import Logo from "@/components/brand/Logo";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
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
    <div>
      <Logo tone="dark" size="md" className="mb-7 lg:hidden" />

      <h1 className="font-display text-[30px] font-extrabold leading-tight tracking-[-0.02em] text-text">
        Welcome back
      </h1>
      <p className="mt-1.5 text-[15px] text-muted">
        Sign in to continue to your workspace.
      </p>

      {!setupComplete ? (
        <p className="mt-5 rounded-control bg-status-amber-bg px-3.5 py-2.5 text-xs text-status-amber">
          Company setup is not finished yet. Complete the setup screen first.
        </p>
      ) : null}

      <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          leadingIcon={Mail}
          placeholder="you@company.com"
          value={values.email}
          onChange={update("email")}
          error={fieldErrors.email}
          autoFocus={!values.email}
        />

        <PasswordInput
          label="Password"
          autoComplete="current-password"
          leadingIcon={Lock}
          placeholder="Your password"
          value={values.password}
          onChange={update("password")}
          error={fieldErrors.password}
        />

        <div className="-mt-1 flex justify-end">
          <button
            type="button"
            onClick={() => setForgotOpen(true)}
            className="rounded-small font-display text-sm font-semibold text-blue hover:text-blue-700"
          >
            Forgot password?
          </button>
        </div>

        <FormError bordered>{formError}</FormError>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Need access? Ask your administrator.
      </p>

      <ForgotPasswordModal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        initialEmail={values.email.trim()}
      />
    </div>
  );
}
