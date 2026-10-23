import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import ForgotPasswordModal from "@/components/auth/ForgotPasswordModal";
import GoogleSection from "@/components/auth/GoogleSection";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";

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

  const from = location.state?.from?.pathname || "/dashboard";

  const update = (field) => (event) => {
    const { value } = event.target;
    setValues((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    const nextErrors = {};
    if (!values.email.trim()) nextErrors.email = "Email is required";
    if (!values.password) nextErrors.password = "Password is required";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);

    try {
      await login({ email: values.email.trim(), password: values.password });
      toast.success("Signed in");
      navigate(from, { replace: true });
    } catch (error) {
      setFieldErrors(getFieldErrors(error));
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
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
            className="h-auto px-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
            onClick={() => setForgotOpen(true)}
          >
            Forgot password?
          </Button>
        </div>

        <FormError bordered>{formError}</FormError>

        <Button type="submit" className="w-full" loading={submitting}>
          Sign in
        </Button>
      </form>

      <GoogleSection />

      <p className="mt-5 text-sm text-muted-foreground">
        No account yet?{" "}
        <Link
          to="/register"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Create one
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
