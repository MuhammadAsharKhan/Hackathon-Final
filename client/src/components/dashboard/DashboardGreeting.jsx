import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

const greetingFor = (timeZone) => {
  let hour = new Date().getHours();
  try {
    hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        hour12: false,
        ...(timeZone ? { timeZone } : {}),
      }).format(new Date())
    );
  } catch {
    // Fall back to the device hour.
  }

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const firstNameOf = (name) => String(name || "").trim().split(" ")[0] || "there";

/**
 * The dashboard's one orchestrated moment. The greeting rises 12px with its
 * opacity and the watermark bars slide in with an 80ms stagger. Both are CSS
 * animations bound to mount, so a data refresh never replays them.
 */
export default function DashboardGreeting({
  name,
  context,
  actions = [],
  timeZone,
  className,
}) {
  return (
    <section
      aria-label="Greeting"
      className={cn("relative", className)}
    >
      {/* two bars that reach past the card edge */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
        <span
          className="absolute right-[-10px] top-[26px] h-2 w-16 rounded-pill bg-white/20"
          style={{ animation: "bars-loader 1.1s cubic-bezier(.2,.8,.2,1) both", animationDelay: "160ms" }}
        />
        <span
          className="absolute right-[-10px] top-[46px] h-2 w-10 rounded-pill bg-lime/50"
          style={{ animation: "bars-loader 1.1s cubic-bezier(.2,.8,.2,1) both", animationDelay: "240ms" }}
        />
      </div>

      <div className="relative overflow-hidden rounded-modal bg-hero-gradient p-6 shadow-e3 sm:p-8">
        {/* the white mark as a watermark */}
        <svg
          aria-hidden="true"
          viewBox="0 0 545 228"
          className="pointer-events-none absolute -right-10 top-1/2 hidden w-[46%] -translate-y-1/2 opacity-10 sm:block"
        >
          <g className="mark-bar" style={{ animationDelay: "0ms" }}>
            <rect x="0" y="0" width="274" height="58" fill="#FFFFFF" />
          </g>
          <g className="mark-bar" style={{ animationDelay: "80ms" }}>
            <rect x="0" y="85" width="274" height="58" fill="#FFFFFF" />
          </g>
          <g className="mark-bar" style={{ animationDelay: "160ms" }}>
            <rect x="0" y="170" width="274" height="58" fill="#FFFFFF" />
          </g>
          <rect x="304" y="85" width="69" height="143" fill="#FFFFFF" />
          <rect x="405" y="0" width="140" height="58" fill="#FFFFFF" />
          <rect x="405" y="0" width="69" height="228" fill="#FFFFFF" />
          <rect x="304" y="0" width="69" height="58" fill="#88C443" />
        </svg>

        <div
          className="relative z-10"
          style={{ animation: "greeting-rise 400ms cubic-bezier(.2,.8,.2,1) both" }}
        >
          <h1 className="font-display text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-white sm:text-[34px]">
            {greetingFor(timeZone)}, {firstNameOf(name)}
          </h1>

          {context ? (
            <p className="mt-2 max-w-[52ch] text-[15px] text-white/80">
              {context}
            </p>
          ) : null}

          {actions.length > 0 ? (
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              {actions.map((action, index) =>
                action.to ? (
                  <Link
                    key={action.label}
                    to={action.to}
                    className={cn(
                      "inline-flex h-11 items-center justify-center rounded-control px-5 font-display text-[14.5px] font-semibold",
                      index === 0
                        ? "bg-white text-blue-700 hover:bg-blue-50"
                        : "border border-white/30 bg-white/10 text-white hover:bg-white/20"
                    )}
                  >
                    {action.label}
                  </Link>
                ) : (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    className={cn(
                      "inline-flex h-11 items-center justify-center rounded-control px-5 font-display text-[14.5px] font-semibold",
                      index === 0
                        ? "bg-white text-blue-700 hover:bg-blue-50"
                        : "border border-white/30 bg-white/10 text-white hover:bg-white/20"
                    )}
                  >
                    {action.label}
                  </button>
                )
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
