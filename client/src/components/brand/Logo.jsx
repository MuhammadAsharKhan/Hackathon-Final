import { cn } from "@/lib/cn";

// The mark is 545 x 228, so its width is always 2.39x its height.
const MARK_RATIO = 545 / 228;

const markHeights = { sm: 22, md: 28, lg: 40 };
const textSizes = { sm: "16px", md: "20px", lg: "28px" };

/**
 * The S.M.I.T mark, either alone or followed by the wordmark.
 * The wordmark is live text, never an image.
 */
export default function Logo({
  variant = "full",
  tone = "dark",
  size = "md",
  className,
  ...props
}) {
  const isLight = tone === "light";
  const height = markHeights[size] || markHeights.md;
  const src = isLight ? "/brand/smit-mark-light.svg" : "/brand/smit-mark.svg";

  return (
    <span
      className={cn("inline-flex select-none items-center gap-2.5", className)}
      {...props}
    >
      <img
        src={src}
        alt={variant === "mark" ? "S.M.I.T" : ""}
        aria-hidden={variant === "mark" ? undefined : "true"}
        width={Math.round(height * MARK_RATIO)}
        height={height}
        style={{ height, width: Math.round(height * MARK_RATIO) }}
        className="block shrink-0"
      />

      {variant === "full" ? (
        <span
          className="font-display font-extrabold leading-none"
          style={{
            fontSize: textSizes[size] || textSizes.md,
            letterSpacing: "-0.01em",
          }}
        >
          <span className={isLight ? "text-white" : "text-text"}>S.M.I.T</span>
          <span className={isLight ? "text-blue-400" : "text-blue"}>-Lite</span>
        </span>
      ) : null}
    </span>
  );
}
