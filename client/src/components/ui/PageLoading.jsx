import { cn } from "@/lib/cn";
import Spinner from "./Spinner";

export default function PageLoading({ label = "Loading", className }) {
  return (
    <div
      role="status"
      className={cn("flex items-center justify-center py-16", className)}
    >
      <Spinner className="h-5 w-5 text-muted-foreground" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
