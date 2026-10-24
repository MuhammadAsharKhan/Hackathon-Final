import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  li: (props) => <li className="marker:text-muted-foreground" {...props} />,
  a: (props) => (
    <a
      className="text-primary underline-offset-4 hover:underline"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
  code: ({ inline, className, children, ...props }) => {
    if (inline) {
      return (
        <code
          className="rounded bg-muted px-1 py-0.5 text-xs tabular-nums"
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
    <div className="mt-2 overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-left text-xs" {...props} />
    </div>
  ),
  thead: (props) => <thead className="bg-surface" {...props} />,
  th: (props) => <th className="px-3 py-2 font-medium" {...props} />,
  td: (props) => <td className="px-3 py-2" {...props} />,
  h1: (props) => <p className="mt-3 font-medium first:mt-0" {...props} />,
  h2: (props) => <p className="mt-3 font-medium first:mt-0" {...props} />,
  h3: (props) => <p className="mt-3 font-medium first:mt-0" {...props} />,
  strong: (props) => <strong className="font-medium" {...props} />,
};

export default function MessageBubble({ message, onRetry }) {
  const isUser = message.role === "user";

  if (message.failed) {
    return (
      <div className="rounded-lg border border-danger/40 px-3 py-2 text-sm">
        <p className="text-danger">That answer did not arrive.</p>
        <Button variant="secondary" size="sm" className="mt-2" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[90%] rounded-xl px-3 py-2 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-surface"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {!isUser && message.toolsUsed?.length ? (
        <p className="text-xs text-muted-foreground">
          Used: {message.toolsUsed.map(toolLabel).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
