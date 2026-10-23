import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import FacebookSection from "@/components/auth/FacebookSection";
import ForgotPasswordModal from "@/components/auth/ForgotPasswordModal";
import GoogleSection from "@/components/auth/GoogleSection";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useMountedRef } from "@/hooks/useMountedRef";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";
import { redirectPath } from "@/lib/navigation";
import { savePendingEmail } from "@/lib/pendingVerification";

export default function Login() {
  const { login } = useAuth();
  useDocumentTitle("Sign in");
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const mountedRef = useMountedRef();

  const from = redirectPath(location);

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
      await login({ email: values.email.trim(), password: values.password });
      if (!mountedRef.current) return;
      toast.success("Signed in");
      navigate(from, { replace: true });
    } catch (error) {
      if (!mountedRef.current) return;

      if (error.response?.data?.code === "EMAIL_NOT_VERIFIED") {
        savePendingEmail(values.email.trim().toLowerCase());
        navigate("/verify-email", {
          state: { ...location.state, notice: "A new code was sent." },
          replace: true,
        });
        return;
      }

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
        Use the account you registered with.
      </p>

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
            Reset password
          </Button>
        </div>

        <FormError bordered>{formError}</FormError>

        <Button type="submit" className="w-full" loading={submitting}>
          Sign in
        </Button>
      </form>

      <GoogleSection />
      <FacebookSection />

      <p className="mt-5 text-sm text-muted-foreground">
        <Link
          to="/register"
          state={location.state}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>

      <ForgotPasswordModal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        initialEmail={values.email.trim()}
      />
    </Card>
  );
}
