import Badge from "@/components/ui/Badge";

const statusOf = (key, now) => {
  if (!key.enabled) {
    return { label: "Disabled", className: "badge-todo" };
  }

  if (key.status === "invalid") {
    return { label: "Invalid", className: "border-danger text-danger" };
  }

  const until = key.cooldownUntil ? new Date(key.cooldownUntil).getTime() : 0;
  if (until > now) {
    return {
      label: `Cooling ${Math.ceil((until - now) / 1000)}s`,
      className: "badge-progress",
    };
  }

  return { label: "Active", className: "badge-done" };
};

export default function KeyStatusBadge({ keyRecord, now }) {
  const status = statusOf(keyRecord, now);

  return <Badge className={status.className}>{status.label}</Badge>;
}
