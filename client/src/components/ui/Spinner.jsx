import { cn } from "@/lib/cn";
import BarsLoader from "../brand/BarsLoader";

/** Small bars loader, used inline and inside buttons. */
export default function Spinner({ size = 16, className, ...props }) {
  return (
    <BarsLoader size={size} className={cn("shrink-0", className)} {...props} />
  );
}
