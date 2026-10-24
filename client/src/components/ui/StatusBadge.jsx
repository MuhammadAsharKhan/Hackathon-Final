import { cn } from "@/lib/cn";

const STATUS_MAP = {
  attendance: {
    present: { label: "Present", tone: "success" },
    late: { label: "Late", tone: "accent" },
    half_day: { label: "Half day", tone: "accent" },
    absent: { label: "Absent", tone: "danger" },
    on_leave: { label: "On leave", tone: "muted" },
    off: { label: "Off", tone: "muted" },
    missing_checkout: { label: "Missing check-out", tone: "accent" },
    not_employed: { label: "Not employed", tone: "muted" },
    future: { label: "Upcoming", tone: "muted" },
  },
  correction: {
    pending: { label: "Pending", tone: "accent" },
    approved: { label: "Approved", tone: "success" },
    rejected: { label: "Rejected", tone: "danger" },
  },
  leave: {
    pending: { label: "Pending", tone: "accent" },
    approved: { label: "Approved", tone: "success" },
    rejected: { label: "Rejected", tone: "danger" },
    cancelled: { label: "Cancelled", tone: "muted" },
  },
  payroll: {
    draft: { label: "Draft", tone: "muted" },
    finalized: { label: "Finalized", tone: "success" },
  },
  employee: {
    probation: { label: "Probation", tone: "accent" },
    active: { label: "Active", tone: "success" },
    exited: { label: "Exited", tone: "muted" },
  },
  account: {
    active: { label: "Active", tone: "success" },
    inactive: { label: "Inactive", tone: "muted" },
  },
};

const TONE_STYLES = {
  success: "badge-done",
  accent: "badge-accent",
  danger: "badge-danger",
  muted: "badge-todo",
};

const readableLabel = (value) =>
  String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");

export const statusLabel = (kind, status) =>
  STATUS_MAP[kind]?.[status]?.label || readableLabel(status);

export const statusTone = (kind, status) =>
  STATUS_MAP[kind]?.[status]?.tone || "muted";

export default function StatusBadge({
  kind = "attendance",
  status,
  tone,
  children,
  className,
  ...props
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        TONE_STYLES[tone || statusTone(kind, status)],
        className
      )}
      {...props}
    >
      {children || statusLabel(kind, status)}
    </span>
  );
}
