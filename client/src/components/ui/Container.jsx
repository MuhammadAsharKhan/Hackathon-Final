import { cn } from "@/lib/cn";

export default function Container({ className, children, ...props }) {
  return (
    <div
      className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}
      {...props}
    >
      {children}
    </div>
  );
}
