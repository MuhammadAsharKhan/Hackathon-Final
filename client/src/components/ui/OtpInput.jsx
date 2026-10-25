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
  ...props
}) {
  const [digits, setDigits] = useState(emptyDigits);
  const inputsRef = useRef([]);

  useEffect(() => {
    if (value !== "" || !digits.some(Boolean)) return;

    setDigits(emptyDigits());
    inputsRef.current[0]?.focus();
  }, [value]);

  const publishDigits = (nextDigits) => {
    setDigits(nextDigits);
    onChange(nextDigits.join(""));
  };

  const fillDigits = (startIndex, text) => {
    const numericText = text
      .replace(/\D/g, "")
      .slice(0, LENGTH - startIndex);
    if (!numericText) return;

    const nextDigits = [...digits];
    numericText.split("").forEach((digit, offset) => {
      nextDigits[startIndex + offset] = digit;
    });
    publishDigits(nextDigits);

    const lastIndex = Math.min(
      startIndex + numericText.length,
      LENGTH - 1
    );
    inputsRef.current[lastIndex]?.focus();
  };

  const handleDigitChange = (index, inputValue) => {
    const numericText = inputValue.replace(/\D/g, "");

    if (!numericText) {
      const nextDigits = [...digits];
      nextDigits[index] = "";
      publishDigits(nextDigits);
      return;
    }

    fillDigits(index, numericText);
  };

  const handleDigitKeyDown = (index, event) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const nextDigits = [...digits];

      if (nextDigits[index]) {
        nextDigits[index] = "";
        publishDigits(nextDigits);
        return;
      }

      if (index > 0) {
        nextDigits[index - 1] = "";
        publishDigits(nextDigits);
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
    <div className={cn("flex gap-2", className)} {...props}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            inputsRef.current[index] = node;
          }}
          value={digit}
          onChange={(event) =>
            handleDigitChange(index, event.target.value)
          }
          onKeyDown={(event) => handleDigitKeyDown(index, event)}
          onFocus={(event) => event.target.select()}
          onPaste={(event) => {
            event.preventDefault();
            fillDigits(0, event.clipboardData.getData("text"));
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
            "h-14 w-12 rounded-control border text-center font-display text-[20px] font-semibold tabular-nums text-text",
            "bg-[#F5F8FD] transition-[transform,border-color,box-shadow] duration-150 ease-brand",
            "focus:border-blue focus:bg-surface focus:outline-none focus:ring-4 focus:ring-blue/15",
            "disabled:cursor-not-allowed disabled:opacity-60",
            digit && "scale-[1.04]",
            error
              ? "border-status-rose focus:border-status-rose focus:ring-status-rose/15"
              : "border-transparent hover:border-[#D3DDEE]"
          )}
        />
      ))}
    </div>
  );
}
