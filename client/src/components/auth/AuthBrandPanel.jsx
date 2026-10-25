import { CalendarCheck, MapPin, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";
import Logo from "../brand/Logo";

const FEATURES = [
  { icon: MapPin, label: "Check in with location and camera" },
  { icon: CalendarCheck, label: "Leave requests with approvals" },
  { icon: Wallet, label: "Payslips you can download" },
];

/**
 * The mark drawn very large. It assembles once on load: the three bars slide in
 * from the left, the stem and the T rise into place, then the green square pops
 * with a single lime glow. Every property animated here is transform or opacity.
 */
function BigMark({ className }) {
  return (
    <svg
      viewBox="0 0 545 228"
      className={cn("block w-full", className)}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id="auth-mark-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="26" />
        </filter>
      </defs>

      {/* three bars */}
      <rect
        className="mark-bar"
        x="0"
        y="0"
        width="274"
        height="58"
        fill="#FFFFFF"
        style={{ animationDelay: "0ms" }}
      />
      <rect
        className="mark-bar"
        x="0"
        y="85"
        width="274"
        height="58"
        fill="#FFFFFF"
        style={{ animationDelay: "90ms" }}
      />
      <rect
        className="mark-bar"
        x="0"
        y="170"
        width="274"
        height="58"
        fill="#FFFFFF"
        style={{ animationDelay: "180ms" }}
      />

      {/* stem and T */}
      <rect className="mark-rise" x="304" y="85" width="69" height="143" fill="#FFFFFF" />
      <rect className="mark-rise" x="405" y="0" width="140" height="58" fill="#FFFFFF" />
      <rect className="mark-rise" x="405" y="0" width="69" height="228" fill="#FFFFFF" />

      {/* the green square, with one glow pulse */}
      <rect
        className="mark-glow"
        x="304"
        y="0"
        width="69"
        height="58"
        fill="#88C443"
        filter="url(#auth-mark-glow)"
      />
      <rect className="mark-square" x="304" y="0" width="69" height="58" fill="#88C443" />
    </svg>
  );
}

export default function AuthBrandPanel({ variant = "panel" }) {
  const isBanner = variant === "banner";

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden bg-ink-gradient",
        isBanner ? "h-[200px]" : "h-full min-h-[640px]"
      )}
    >
      {/* 1px grid, faded toward the edges */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-100"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          WebkitMaskImage:
            "radial-gradient(circle at 40% 40%, #000 0%, transparent 72%)",
          maskImage:
            "radial-gradient(circle at 40% 40%, #000 0%, transparent 72%)",
        }}
      />

      {/* two glows, drifting very slowly */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute rounded-full bg-blue/45 blur-[120px] animate-drift"
          style={{ width: "58%", height: "58%", left: "-8%", top: "2%" }}
        />
        <div
          className="absolute rounded-full bg-lime/25 blur-[110px] animate-drift"
          style={{
            width: "46%",
            height: "46%",
            right: "-6%",
            bottom: "-8%",
            animationDelay: "-5s",
          }}
        />
      </div>

      {/* the signature mark, lower half, bleeding off the left edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute z-0"
        style={
          isBanner
            ? { width: "58%", right: "-10%", bottom: "-22%" }
            : { width: "78%", left: "-8%", bottom: "4%" }
        }
      >
        <BigMark />
      </div>

      <div
        className={cn(
          "relative z-10 flex h-full flex-col",
          isBanner ? "p-6" : "p-8 lg:p-12"
        )}
      >
        <Logo tone="light" size={isBanner ? "md" : "lg"} />

        <div className={cn("max-w-[520px]", isBanner ? "mt-4" : "mt-auto pb-2")}>
          <h1
            className={cn(
              "font-display font-extrabold text-white",
              // The banner is only 200px tall and the form sheet covers its last
              // 40px, so the headline has to stay short and high.
              isBanner ? "text-[20px] leading-tight" : "text-[46px]"
            )}
            style={{ lineHeight: 1.05, letterSpacing: "-0.03em" }}
          >
            People, attendance and payroll in one place.
          </h1>

          {isBanner ? null : (
            <p
              className="mt-5 text-[17px] text-white/75"
              style={{ maxWidth: "46ch" }}
            >
              Sign in to manage your team, or to check in and see your own
              records.
            </p>
          )}
        </div>

        {isBanner ? null : (
          <ul className="mt-8 space-y-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-3 text-[15px] text-white/85"
              >
                <Icon
                  className="h-5 w-5 shrink-0 text-blue-400"
                  aria-hidden="true"
                />
                {label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
