export default function CodeBlock({ children }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-surface p-3 text-xs leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}
