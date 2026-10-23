import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/cn";
import Button from "./Button";

// execCommand still covers browsers and insecure origins without the async
// clipboard API.
const copyWithTextarea = (text) => {
  if (typeof document.execCommand !== "function") {
    throw new Error("Copy is not available");
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-1000px";
  document.body.appendChild(textarea);
  textarea.select();

  const copiedNow = document.execCommand("copy");
  textarea.remove();

  if (!copiedNow) throw new Error("Copy is not available");
};

const copyText = async (text) => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      copyWithTextarea(text);
      return;
    }
  }

  copyWithTextarea(text);
};

export default function CopyButton({
  value,
  label = "Copy",
  className,
  announce = false,
  ...props
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleCopy = async () => {
    try {
      await copyText(String(value));
      setCopied(true);
      if (announce) toast.success("Copied");
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy. Select the text and copy it manually.");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      aria-label={copied ? `${label} copied` : label}
      className={cn(
        "h-10 w-10 shrink-0 px-0 text-muted-foreground hover:text-foreground sm:h-8 sm:w-8",
        className
      )}
      {...props}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
    </Button>
  );
}
