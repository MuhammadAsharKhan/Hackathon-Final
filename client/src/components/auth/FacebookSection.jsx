import Divider from "@/components/ui/Divider";
import { facebookAppId } from "@/config/facebook";
import { googleClientId } from "@/config/google";
import FacebookButton from "./FacebookButton";

export default function FacebookSection({ onSignedIn }) {
  if (!facebookAppId) return null;

  return (
    <div className="mt-5 space-y-5">
      {!googleClientId && <Divider />}
      <FacebookButton onSignedIn={onSignedIn} />
    </div>
  );
}
