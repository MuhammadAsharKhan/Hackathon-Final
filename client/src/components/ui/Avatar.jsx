import { cn } from "@/lib/cn";

const sizes = {
  sm: "h-6 w-6 text-[11px]",
  md: "h-8 w-8 text-xs",
  lg: "h-16 w-16 text-lg",
};

const initialsOf = (name) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

export default function Avatar({ user, size = "md", className }) {
  const sizeClass = sizes[size] || sizes.md;

  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name || "Avatar"}
        className={cn(
          "shrink-0 rounded-full border border-border object-cover",
          sizeClass,
          className
        )}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full border border-border bg-muted font-medium text-foreground",
        sizeClass,
        className
      )}
    >
      {initialsOf(user?.name)}
    </span>
  );
}
