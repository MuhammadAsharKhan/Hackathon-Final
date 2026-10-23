import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import { facebookAppId, facebookGraphVersion } from "@/config/facebook";
import { useAuth } from "@/hooks/useAuth";
import { useMountedRef } from "@/hooks/useMountedRef";
import { getErrorMessage } from "@/lib/errors";
import { redirectPath } from "@/lib/navigation";

const SDK_URL = "https://connect.facebook.net/en_US/sdk.js";

let sdkPromise = null;

const loadFacebookSdk = () => {
  if (window.FB) return Promise.resolve(window.FB);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB.init({
        appId: facebookAppId,
        version: facebookGraphVersion,
        xfbml: false,
      });
      resolve(window.FB);
    };

    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error("Facebook SDK failed to load"));
    };
    document.body.appendChild(script);
  });

  return sdkPromise;
};

export default function FacebookButton({ onSignedIn }) {
  const { loginWithFacebook } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(Boolean(window.FB));
  const [pending, setPending] = useState(false);
  const mountedRef = useMountedRef();

  useEffect(() => {
    if (!facebookAppId || window.FB) return undefined;

    let active = true;
    loadFacebookSdk().then(
      () => {
        if (active) setReady(true);
      },
      () => {
        if (active) setReady(false);
      }
    );

    return () => {
      active = false;
    };
  }, []);

  if (!facebookAppId) return null;

  const finishSignIn = async (facebookToken) => {
    setPending(true);

    try {
      await loginWithFacebook(facebookToken);
      if (!mountedRef.current) return;
      toast.success("Signed in");
      if (onSignedIn) onSignedIn();
      else navigate(redirectPath(location), { replace: true });
    } catch (error) {
      if (!mountedRef.current) return;
      toast.error(getErrorMessage(error));
    } finally {
      if (mountedRef.current) setPending(false);
    }
  };

  const handleClick = () => {
    if (pending || !ready) return;

    window.FB.login(
      (response) => {
        // A closed or cancelled dialog reports no connection and shows nothing.
        if (response?.status !== "connected") return;
        if (!response.authResponse?.accessToken) return;

        finishSignIn(response.authResponse.accessToken);
      },
      { scope: "public_profile,email" }
    );
  };

  return (
    <Button
      variant="secondary"
      className="w-full"
      onClick={handleClick}
      loading={pending || !ready}
    >
      Continue with Facebook
    </Button>
  );
}
