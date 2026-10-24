const readableJson = (value) => {
  if (value === null || value === undefined) return "None";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "Not readable";
  }
};

function JsonBlock({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <pre className="mt-1 max-h-64 overflow-auto rounded-lg border border-border bg-background p-3 text-xs leading-relaxed">
        {readableJson(value)}
      </pre>
    </div>
  );
}

export default function AuditDetails({ log }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Entity id: <span className="font-mono">{log.entityId || "-"}</span>
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        <JsonBlock label="Before" value={log.before} />
        <JsonBlock label="After" value={log.after} />
      </div>
    </div>
  );
}
