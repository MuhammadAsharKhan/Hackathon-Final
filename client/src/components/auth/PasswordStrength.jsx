import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

const RULES = [
  { id: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { id: "letter", label: "At least one letter", test: (v) => /[A-Za-z]/.test(v) },
  { id: "number", label: "At least one number", test: (v) => /[0-9]/.test(v) },
];

const scoreFor = (value) => {
  if (!value) return 0;
  const passed = RULES.filter((rule) => rule.test(value)).length;
  const bonus = value.length >= 12 || /[^A-Za-z0-9]/.test(value) ? 1 : 0;
  return Math.min(4, passed + bonus);
};

const LEVELS = ["", "weak", "fair", "good", "strong"];

/**
 * Four segments that fill blue, then lime as the password gets stronger,
 * above a list that ticks each rule.
 */
export default function PasswordStrength({ value = "", className }) {
  const score = scoreFor(value);

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-center gap-1.5">
        {[0, 1, 2, 3].map((index) => {
          const filled = index < score;
          return (
            <span
              key={index}
              className={cn(
                "h-1.5 flex-1 rounded-pill",
                filled
                  ? index < 2
                    ? "bg-blue"
                    : "bg-lime"
                  : "bg-line"
              )}
            />
          );
        })}
      </div>

      <p className="text-xs text-muted" aria-live="polite">
        {score === 0 ? "Use at least 8 characters" : `Strength: ${LEVELS[score]}`}
      </p>

      <ul className="space-y-1.5">
        {RULES.map((rule) => {
          const met = rule.test(value);
          return (
            <li
              key={rule.id}
              className={cn(
                "flex items-center gap-2 text-xs",
                met ? "text-lime-700" : "text-muted"
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                  met ? "bg-lime-50" : "bg-line-soft"
                )}
              >
                <Check
                  className={cn("h-3 w-3", met ? "opacity-100" : "opacity-0")}
                  aria-hidden="true"
                />
              </span>
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
