export const fieldDescriptionId = (id, error, hint) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

export default function Field({ id, label, error, hint, children, ...props }) {
  return (
    <div className="space-y-1.5" {...props}>
      {label ? (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-foreground"
        >
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
