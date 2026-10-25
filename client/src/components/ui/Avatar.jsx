import { cn } from "@/lib/cn";

// Six brand-compatible pairs built from blue, sky, lime and ink. Never purple
// or pink. Each starts dark enough for white initials to stay above 4.5:1.
const PAIRS = [
  ["#1763D6", "#0F4FC4"],
  ["#0F4FC4", "#0A3AA0"],
  ["#162842", "#07111F"],
  ["#4F8A1D", "#3C6A15"],
  ["#1C74EF", "#162842"],
  ["#0E1B2E", "#07111F"],
];

const sizes = {
  sm: { box: "h-7 w-7", text: "text-[11px]" },
  md: { box: "h-9 w-9", text: "text-[12.5px]" },
  lg: { box: "h-11 w-11", text: "text-sm" },
  xl: { box: "h-16 w-16", text: "text-lg" },
};

const initialsOf = (name) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

const hashOf = (value) => {
  let hash = 0;
  const text = value || "";
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 100000;
  }
  return hash;
};

export default function Avatar({
  user,
  size = "md",
  ring = false,
  className,
  ...props
}) {
  const dimension = sizes[size] || sizes.md;
  const name = user?.name || "";

  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={name || "Avatar"}
        className={cn(
          "shrink-0 rounded-full object-cover",
          dimension.box,
          ring && "ring-2 ring-white",
          className
        )}
        {...props}
      />
    );
  }

  const [from, to] = PAIRS[hashOf(name) % PAIRS.length];

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full font-display font-bold text-white",
        dimension.box,
        dimension.text,
        ring && "ring-2 ring-white",
        className
      )}
      style={{
        backgroundImage: `linear-gradient(140deg, ${from} 0%, ${to} 100%)`,
      }}
      {...props}
    >
      {initialsOf(name)}
    </span>
  );
}
