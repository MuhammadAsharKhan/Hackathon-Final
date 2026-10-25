import { Lock, X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * One central map so every screen shows identical colours and labels.
 * tone: lime | amber | rose | blue | violet | slate
 */
const STATUS = {
  // attendance
  present: { label: "Present", tone: "lime" },
  late: { label: "Late", tone: "amber" },
  half_day: { label: "Half day", tone: "violet" },
  absent: { label: "Absent", tone: "rose" },
  on_leave: { label: "On leave", tone: "blue" },
  off: { label: "Off", tone: "slate" },
  missing_checkout: { label: "Missing check-out", tone: "slate" },
  not_employed: { label: "Not employed", tone: "slate" },
  future: { label: "Upcoming", tone: "slate" },
  checked_in: { label: "Checked in", tone: "lime", live: true },

  // decisions
  pending: { label: "Pending", tone: "amber", pulse: true },
  approved: { label: "Approved", tone: "lime" },
  rejected: { label: "Rejected", tone: "rose", icon: "x" },
  cancelled: { label: "Cancelled", tone: "slate" },

  // payroll
  draft: { label: "Draft", tone: "slate", dashed: true },
  finalized: { label: "Finalized", tone: "lime", icon: "lock" },

  // people
  probation: { label: "Probation", tone: "blue" },
  active: { label: "Active", tone: "lime" },
  exited: { label: "Exited", tone: "rose" },
  inactive: { label: "Inactive", tone: "rose" },

  // misc
  info: { label: "Info", tone: "blue" },
  web: { label: "Web", tone: "slate" },
  camera: { label: "Camera", tone: "blue" },
  correction: { label: "Correction", tone: "slate" },
};

const TONES = {
  lime: "bg-lime-50 text-lime-700",
  amber: "bg-status-amber-bg text-status-amber",
  rose: "bg-status-rose-bg text-status-rose",
  blue: "bg-blue-50 text-blue-700",
  violet: "bg-status-violet-bg text-status-violet",
  slate: "bg-status-slate-bg text-status-slate",
};

const DOTS = {
  lime: "bg-lime-700",
  amber: "bg-status-amber",
  rose: "bg-status-rose",
  blue: "bg-blue-700",
  violet: "bg-status-violet",
  slate: "bg-status-slate",
};

const readableLabel = (value) =>
  String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");

const entryFor = (status) =>
  STATUS[status] || { label: readableLabel(status), tone: "slate" };

export const statusLabel = (kind, status) => entryFor(status).label;

export const statusTone = (kind, status) => entryFor(status).tone;

export function StatusPill({
  kind = "attendance",
  status,
  tone,
  size = "md",
  live = false,
  children,
  className,
  ...props
}) {
  const entry = entryFor(status);
  const resolved = tone && TONES[tone] ? tone : entry.tone;
  const pulsing = live || entry.pulse;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill font-semibold",
        size === "sm" ? "h-[22px] px-2 text-[11.5px]" : "h-[26px] px-2.5 text-[12.5px]",
        TONES[resolved],
        entry.dashed && "border border-dashed border-current/40",
        className
      )}
      {...props}
    >
      {entry.icon === "lock" ? (
        <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
      ) : entry.icon === "x" ? (
        <X className="h-3 w-3 shrink-0" aria-hidden="true" />
      ) : (
        <span className="relative flex h-[7px] w-[7px] shrink-0">
          {pulsing ? (
            <span
              className={cn(
                "absolute inset-0 rounded-full animate-dot-pulse",
                DOTS[resolved]
              )}
              aria-hidden="true"
            />
          ) : null}
          <span
            className={cn("h-[7px] w-[7px] rounded-full", DOTS[resolved])}
            aria-hidden="true"
          />
        </span>
      )}
      {children || entry.label}
    </span>
  );
}

/* Kept so existing screens keep working. */
export default function StatusBadge(props) {
  return <StatusPill {...props} />;
}
