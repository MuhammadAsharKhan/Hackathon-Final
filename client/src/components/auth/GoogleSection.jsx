import Divider from "@/components/ui/Divider";
import { googleClientId } from "@/config/google";
import GoogleButton from "./GoogleButton";

export default function GoogleSection({ onSignedIn }) {
  if (!googleClientId) return null;

  return (
    <div className="mt-5 space-y-5">
      <Divider />
      <GoogleButton onSignedIn={onSignedIn} />
    </div>
  );
}
