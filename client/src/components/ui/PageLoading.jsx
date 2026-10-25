import { cn } from "@/lib/cn";
import Logo from "../brand/Logo";
import BarsLoader from "../brand/BarsLoader";

export default function PageLoading({ label = "Loading", className }) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-16",
        className
      )}
    >
      <Logo variant="mark" tone="dark" size="sm" />
      <BarsLoader size={36} />
      <span className="sr-only">{label}</span>
    </div>
  );
}
