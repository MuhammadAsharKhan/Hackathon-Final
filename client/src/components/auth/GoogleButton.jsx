import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import toast from "react-hot-toast";
import { googleClientId } from "@/config/google";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";

export default function GoogleButton({ onSignedIn }) {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(false);

  if (!googleClientId) return null;

  const from = location.state?.from?.pathname || "/dashboard";

  const handleSuccess = async (response) => {
    if (!response?.credential) {
      toast.error("Google did not return a credential. Try again.");
      return;
    }

    setPending(true);

    try {
      await loginWithGoogle(response.credential);
      toast.success("Signed in");
      if (onSignedIn) onSignedIn();
      else navigate(from, { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className={
        pending ? "pointer-events-none opacity-60" : undefined
      }
      aria-busy={pending || undefined}
    >
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => toast.error("Google sign-in did not complete. Try again.")}
        theme="outline"
        shape="rectangular"
        size="large"
        text="continue_with"
        logo_alignment="left"
        width="360"
      />
    </div>
  );
}
