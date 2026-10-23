import { cn } from "@/lib/cn";

export default function SectionHeading({
  title,
  actions,
  className,
  children,
  ...props
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        className
      )}
      {...props}
    >
      <h2 className="text-sm font-medium">{title}</h2>
      {children}
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
