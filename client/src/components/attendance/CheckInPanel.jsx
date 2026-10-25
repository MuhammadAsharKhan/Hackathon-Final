import { useCallback, useEffect, useMemo, useState } from "react";
import { Camera, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import CameraCheckInModal from "@/components/attendance/CameraCheckInModal";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ErrorState from "@/components/ui/ErrorState";
import StatusPill from "@/components/ui/StatusBadge";
import { checkIn, checkOut, getToday } from "@/api/attendance.api";
import { hasMediaApi } from "@/lib/mediaErrors";
import { useCompanyTimeZone } from "@/context/CompanyTimeContext";
import { useResource } from "@/hooks/useResource";
import { getErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { formatClock, formatHours } from "@/lib/time";
import { cn } from "@/lib/cn";

// A full working day, used for the progress ring when no target is available.
const DAY_TARGET_HOURS = 8;
const RING = 2 * Math.PI * 78;

const minutesSince = (instant) => {
  if (!instant) return 0;
  const started = new Date(instant).getTime();
  if (Number.isNaN(started)) return 0;
  return Math.max(0, Math.round((Date.now() - started) / 60000));
};

const cameraCheckInSupported = () =>
  hasMediaApi("camera") &&
  typeof navigator !== "undefined" &&
  Boolean(navigator.geolocation);

const clockParts = (timeZone) => {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      ...(timeZone ? { timeZone } : {}),
    }).format(new Date());
    const [hours, minutes, seconds] = parts.split(":");
    return { hours, minutes, seconds };
  } catch {
    const now = new Date();
    return {
      hours: String(now.getHours()).padStart(2, "0"),
      minutes: String(now.getMinutes()).padStart(2, "0"),
      seconds: String(now.getSeconds()).padStart(2, "0"),
    };
  }
};

export default function CheckInPanel({ onChecked }) {
  const timeZone = useCompanyTimeZone();
  const [busy, setBusy] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraSupported] = useState(cameraCheckInSupported);
  const [clock, setClock] = useState(() => clockParts(timeZone));

  const { data, loading, error, reload } = useResource(() => getToday(), []);
  const record = data?.record || null;
  const open = Boolean(record?.checkIn && !record?.checkOut);

  useEffect(() => {
    setClock(clockParts(timeZone));
    const timer = setInterval(() => setClock(clockParts(timeZone)), 1000);
    return () => clearInterval(timer);
  }, [timeZone]);

  const workedMinutes = open
    ? minutesSince(record?.checkIn)
    : record?.workedMinutes || 0;

  const progress = useMemo(() => {
    const ratio = Math.min(1, workedMinutes / (DAY_TARGET_HOURS * 60));
    return { ratio, offset: RING * (1 - ratio) };
  }, [workedMinutes]);

  const run = useCallback(
    async (action, message) => {
      if (busy) return;
      setBusy(action);

      try {
        await (action === "in" ? checkIn({}) : checkOut({}));
        toast.success(message);
        reload();
        onChecked?.();
      } catch (failure) {
        toast.error(getErrorMessage(failure));
        reload();
      } finally {
        setBusy("");
      }
    },
    [busy, onChecked, reload]
  );

  if (error) {
    return (
      <ErrorState
        title="Today's attendance did not load"
        message={error}
        onRetry={reload}
      />
    );
  }

  const action = open ? "out" : "in";
  const canAct = open ? data?.canCheckOut : data?.canCheckIn;
  const label = open ? "Check out" : "Check in";

  const locationText = record?.insideOffice
    ? "Inside office area"
    : record?.distanceMeters !== undefined && record?.distanceMeters !== null
      ? `${Math.round(record.distanceMeters)} m from office`
      : "Location not shared";

  return (
    <Card className="p-5 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        {/* live clock and status */}
        <div>
          <p
            data-numeric
            className="font-display text-[40px] font-extrabold leading-none tracking-[-0.03em] text-text sm:text-[52px]"
          >
            {clock.hours}:{clock.minutes}
            <span className="ml-1 text-[24px] text-muted sm:text-[28px]">
              :{clock.seconds}
            </span>
          </p>
          <p className="mt-2 text-sm text-muted">
            {data?.date ? formatDate(data.date) : "Today"}
          </p>
          <div className="mt-3">
            {loading ? (
              <div className="skeleton h-[26px] w-24 rounded-pill" />
            ) : (
              <StatusPill kind="attendance" status={data?.status} />
            )}
          </div>
        </div>

        {/* the one big action */}
        <div className="flex flex-col items-center">
          <div className="relative flex h-[168px] w-[168px] items-center justify-center">
            <svg
              aria-hidden="true"
              viewBox="0 0 168 168"
              className="absolute inset-0 h-full w-full -rotate-90"
            >
              <circle
                cx="84"
                cy="84"
                r="78"
                fill="none"
                stroke="#EEF2F8"
                strokeWidth="6"
              />
              <circle
                cx="84"
                cy="84"
                r="78"
                fill="none"
                stroke="#1C74EF"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={RING}
                strokeDashoffset={progress.offset}
                className="transition-[stroke-dashoffset] duration-300 ease-brand"
              />
            </svg>

            {canAct && !loading ? (
              <span
                aria-hidden="true"
                className="absolute h-[168px] w-[168px] rounded-full bg-blue/10 animate-dot-pulse"
              />
            ) : null}

            <button
              type="button"
              onClick={() => run(action, open ? "Checked out" : "Checked in")}
              disabled={loading || !canAct || Boolean(busy)}
              aria-busy={busy === action || undefined}
              className={cn(
                "relative flex h-[140px] w-[140px] flex-col items-center justify-center rounded-full font-display text-[15px] font-bold text-white",
                "shadow-[0_14px_30px_-8px_rgba(28,116,239,0.6),inset_0_1px_0_rgba(255,255,255,0.28)]",
                "transition-transform duration-150 ease-brand active:scale-[0.98]",
                open ? "bg-ink-3" : "bg-brand-gradient",
                (!canAct || loading) && "opacity-45 shadow-none"
              )}
            >
              {open ? "Check out" : "Check in"}
            </button>
          </div>

          <p className="mt-3 text-xs text-muted">
            {formatHours(workedMinutes)} of {DAY_TARGET_HOURS}h target
          </p>

          {cameraSupported ? (
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => setCameraOpen(true)}
              disabled={loading || !data?.canCheckIn || Boolean(busy)}
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
              Check in with camera
            </Button>
          ) : null}
        </div>

        {/* three facts */}
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1 lg:gap-2">
          <div>
            <p className="text-[12.5px] text-muted">Checked in</p>
            <p className="font-display text-sm font-semibold tabular-nums text-text">
              {loading ? "-" : formatClock(record?.checkIn, timeZone)}
            </p>
          </div>
          <div>
            <p className="text-[12.5px] text-muted">Hours so far</p>
            <p className="font-display text-sm font-semibold tabular-nums text-text">
              {loading ? "-" : formatHours(workedMinutes)}
            </p>
          </div>
          <div>
            <p className="text-[12.5px] text-muted">Location</p>
            <p className="mt-0.5 inline-flex items-center gap-1 rounded-pill bg-mist px-2 py-0.5 text-[11.5px] font-semibold text-text-2">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {loading ? "-" : locationText}
            </p>
          </div>
        </div>
      </div>

      {!loading && data?.status === "on_leave" && !record ? (
        <p className="mt-4 text-xs text-muted">
          Approved leave covers today, so check-in is not available.
        </p>
      ) : null}
      {!loading && record?.checkIn && record?.checkOut ? (
        <p className="mt-4 text-xs text-muted">
          Today is closed. Ask for a correction if a time is wrong.
        </p>
      ) : null}

      {cameraOpen ? (
        <CameraCheckInModal
          open
          onClose={() => setCameraOpen(false)}
          onChecked={() => {
            reload();
            onChecked?.();
          }}
        />
      ) : null}
    </Card>
  );
}
