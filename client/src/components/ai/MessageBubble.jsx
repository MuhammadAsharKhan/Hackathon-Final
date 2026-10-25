import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Wrench } from "lucide-react";
import Logo from "@/components/brand/Logo";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import CodeBlock from "./CodeBlock";

const toolLabel = (name) => String(name || "").replace(/_/g, " ");

// Raw HTML is never rendered: react-markdown keeps the text, so a model answer
// cannot inject markup into the page.
const markdownComponents = {
  p: (props) => <p className="mt-2 first:mt-0" {...props} />,
  ul: (props) => <ul className="mt-2 list-disc space-y-1 pl-5" {...props} />,
  ol: (props) => <ol className="mt-2 list-decimal space-y-1 pl-5" {...props} />,
  li: (props) => <li className="marker:text-muted" {...props} />,
  a: (props) => (
    <a
      className="text-blue-700 underline underline-offset-4"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
  code: ({ inline, className, children, ...props }) => {
    if (inline) {
      return (
        <code
          className="rounded-[4px] bg-mist px-1 py-0.5 text-xs tabular-nums"
          {...props}
        >
          {children}
        </code>
      );
    }
    return <CodeBlock className={className}>{children}</CodeBlock>;
  },
  pre: (props) => <>{props.children}</>,
  table: (props) => (
    <div className="mt-2 overflow-x-auto rounded-small border border-line">
      <table className="w-full border-collapse text-left text-xs" {...props} />
    </div>
  ),
  thead: (props) => <thead className="bg-mist" {...props} />,
  th: (props) => <th className="px-3 py-2 font-semibold" {...props} />,
  td: (props) => <td className="px-3 py-2" {...props} />,
  h1: (props) => (
    <p className="mt-3 font-display font-bold first:mt-0" {...props} />
  ),
  h2: (props) => (
    <p className="mt-3 font-display font-bold first:mt-0" {...props} />
  ),
  h3: (props) => (
    <p className="mt-3 font-display font-semibold first:mt-0" {...props} />
  ),
  strong: (props) => <strong className="font-semibold" {...props} />,
};

export default function MessageBubble({ message, onRetry, newest = false }) {
  const isUser = message.role === "user";
  const enter = newest ? "animate-message-in" : undefined;

  if (message.failed) {
    return (
      <div
        className={cn(
          "rounded-[18px] rounded-tl-[6px] bg-status-rose-bg px-3.5 py-2.5 text-sm",
          enter
        )}
      >
        <p className="text-status-rose">That answer did not arrive.</p>
        <Button variant="secondary" size="sm" className="mt-2" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        isUser ? "items-end" : "items-start",
        enter
      )}
    >
      <div
        className={cn(
          "flex max-w-[92%] items-end gap-2",
          isUser && "flex-row-reverse"
        )}
      >
        {isUser ? null : (
          <span className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mist">
            <Logo variant="mark" tone="dark" size="sm" />
          </span>
        )}

        <div
          className={cn(
            "px-3.5 py-2.5 text-sm",
            isUser
              ? "rounded-[18px] rounded-br-[6px] bg-brand-gradient text-white"
              : "rounded-[18px] rounded-tl-[6px] bg-surface text-text shadow-e1"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>

      {!isUser && message.toolsUsed?.length ? (
        <p className="ml-9 inline-flex items-center gap-1.5 text-[11.5px] text-muted">
          <Wrench className="h-3 w-3" aria-hidden="true" />
          Used: {message.toolsUsed.map(toolLabel).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
