import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export default function Spinner({ className, ...props }) {
  return (
    <Loader2
      className={cn("h-5 w-5 animate-spin", className)}
      aria-hidden="true"
      {...props}
    />
  );
}
