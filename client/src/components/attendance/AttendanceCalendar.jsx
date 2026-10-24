import { cn } from "@/lib/cn";
import { deviceToday, dayOfMonth, formatClock, formatHours, leadingBlanks } from "@/lib/time";
import StatusBadge, { statusLabel, statusTone } from "@/components/ui/StatusBadge";

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// The tone names come from StatusBadge, so a cell and its chip agree.
const TONE_CELLS = {
  success: "badge-done",
  accent: "badge-accent",
  danger: "badge-danger",
  muted: "badge-todo",
};

const LEGEND = ["present", "late", "half_day", "absent", "on_leave", "off"];

const isCorrectable = (day) =>
  ["present", "late", "half_day", "absent", "missing_checkout"].includes(day.status) &&
  day.date <= deviceToday();

const describe = (day, timeZone) => {
  const parts = [statusLabel("attendance", day.status)];

  if (day.record?.checkIn) parts.push(`in ${formatClock(day.record.checkIn, timeZone)}`);
  if (day.record?.checkOut) {
    parts.push(`out ${formatClock(day.record.checkOut, timeZone)}`);
  }
  if (day.record?.workedMinutes) parts.push(formatHours(day.record.workedMinutes));

  return parts.join(", ");
};

export default function AttendanceCalendar({ month, days = [], timeZone, onDayClick }) {
  const blanks = leadingBlanks(month);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-1 text-[11px] text-muted-foreground sm:text-xs">
        {WEEKDAY_HEADERS.map((weekday) => (
          <div key={weekday} className="px-1 py-1 text-center font-medium">
            {weekday}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: blanks }).map((_, index) => (
          <div key={`blank-${index}`} aria-hidden="true" />
        ))}

        {days.map((day) => {
          const label = describe(day, timeZone);
          const correctable = onDayClick ? isCorrectable(day) : false;
          const tone = TONE_CELLS[statusTone("attendance", day.status)];

          const content = (
            <>
              <span className="text-xs font-medium tabular-nums">
                {dayOfMonth(day.date)}
              </span>
              {day.record?.workedMinutes ? (
                <span className="text-[10px] leading-tight opacity-80">
                  {formatHours(day.record.workedMinutes)}
                </span>
              ) : null}
            </>
          );

          const shared = cn(
            "flex h-12 flex-col items-center justify-center rounded-lg border text-center sm:h-14",
            tone,
            day.status === "future" || day.status === "not_employed"
              ? "border-dashed opacity-50"
              : "",
            correctable ? "hover:opacity-80 focus-visible:opacity-80" : ""
          );

          return correctable ? (
            <button
              key={day.date}
              type="button"
              className={shared}
              title={`${day.date} - ${label}`}
              aria-label={`${day.date}, ${label}. Request a correction.`}
              onClick={() => onDayClick(day)}
            >
              {content}
            </button>
          ) : (
            <div
              key={day.date}
              className={shared}
              title={`${day.date} - ${label}`}
            >
              {content}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {LEGEND.map((status) => (
          <StatusBadge key={status} kind="attendance" status={status} />
        ))}
      </div>
    </div>
  );
}
