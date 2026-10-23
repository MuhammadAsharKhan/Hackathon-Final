import { useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import toast from "react-hot-toast";
import { googleClientId } from "@/config/google";
import { useAuth } from "@/hooks/useAuth";
import { useMountedRef } from "@/hooks/useMountedRef";
import { getErrorMessage } from "@/lib/errors";
import { redirectPath } from "@/lib/navigation";

export default function GoogleButton({ onSignedIn }) {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(false);
  const mountedRef = useMountedRef();
  const wrapperRef = useRef(null);
  const [buttonWidth, setButtonWidth] = useState(0);

  // Google draws a fixed width button. Sizing it to the card keeps the button
  // inside a 360 px screen instead of widening the page. The first measure runs
  // before paint, so the button is never drawn wider than the card.
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !googleClientId) return;

    const measure = () => {
      const width = Math.floor(wrapper.getBoundingClientRect().width);
      if (width > 0) setButtonWidth(Math.min(400, Math.max(200, width)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  if (!googleClientId) return null;

  const from = redirectPath(location);

  const handleSuccess = async (response) => {
    if (!response?.credential) {
      toast.error("Google did not return a credential. Try again.");
      return;
    }

    setPending(true);

    try {
      await loginWithGoogle(response.credential);
      if (!mountedRef.current) return;
      toast.success("Signed in");
      if (onSignedIn) onSignedIn();
      else navigate(from, { replace: true });
    } catch (error) {
      if (!mountedRef.current) return;
      toast.error(getErrorMessage(error));
    } finally {
      if (mountedRef.current) setPending(false);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={
        pending ? "pointer-events-none opacity-60" : undefined
      }
      aria-busy={pending || undefined}
    >
      {buttonWidth > 0 ? (
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() =>
            toast.error("Google sign-in did not complete. Try again.")
          }
          theme="outline"
          shape="rectangular"
          size="large"
          text="continue_with"
          logo_alignment="left"
          width={String(buttonWidth)}
        />
      ) : null}
    </div>
  );
}
