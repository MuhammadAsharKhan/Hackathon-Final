import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const LENGTH = 6;
const emptyDigits = () => Array.from({ length: LENGTH }, () => "");

export default function OtpInput({
  value = "",
  onChange,
  disabled = false,
  error = false,
  className,
}) {
  const [digits, setDigits] = useState(emptyDigits);
  const inputsRef = useRef([]);

  useEffect(() => {
    if (value === "" && digits.some(Boolean)) setDigits(emptyDigits());
  }, [value]);

  const publish = (next) => {
    setDigits(next);
    onChange(next.join(""));
  };

  const fill = (startIndex, text) => {
    const numbers = text.replace(/\D/g, "").slice(0, LENGTH - startIndex);
    if (!numbers) return;

    const next = [...digits];
    numbers.split("").forEach((digit, offset) => {
      next[startIndex + offset] = digit;
    });
    publish(next);

    const lastIndex = Math.min(startIndex + numbers.length, LENGTH - 1);
    inputsRef.current[lastIndex]?.focus();
  };

  const handleChange = (index, raw) => {
    const numbers = raw.replace(/\D/g, "");

    if (!numbers) {
      const next = [...digits];
      next[index] = "";
      publish(next);
      return;
    }

    fill(index, numbers);
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const next = [...digits];

      if (next[index]) {
        next[index] = "";
        publish(next);
        return;
      }

      if (index > 0) {
        next[index - 1] = "";
        publish(next);
        inputsRef.current[index - 1]?.focus();
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputsRef.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < LENGTH - 1) {
      event.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  return (
    <div className={cn("flex gap-2", className)}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            inputsRef.current[index] = node;
          }}
          value={digit}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onFocus={(event) => event.target.select()}
          onPaste={(event) => {
            event.preventDefault();
            fill(0, event.clipboardData.getData("text"));
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${index + 1} of ${LENGTH}`}
          aria-invalid={error || undefined}
          disabled={disabled}
          className={cn(
            "h-12 w-10 rounded-lg border bg-background text-center text-lg tabular-nums text-foreground transition-colors duration-150 focus:border-foreground disabled:cursor-not-allowed disabled:opacity-60 sm:w-11",
            error ? "border-danger" : "border-border"
          )}
        />
      ))}
    </div>
  );
}
