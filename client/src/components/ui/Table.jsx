import { cn } from "@/lib/cn";

export function Table({ columns, className, children, ...props }) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-xl border border-border",
        className
      )}
      {...props}
    >
      <table className="w-full min-w-[38rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-xs text-muted-foreground">
            {columns.map((column, index) => (
              <th
                key={`${index}-${column}`}
                scope="col"
                className="px-5 py-3 font-medium"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function TableRow({ className, children, ...props }) {
  return (
    <tr
      className={cn("border-b border-border last:border-b-0", className)}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableCell({ className, children, ...props }) {
  return (
    <td className={cn("px-5 py-4", className)} {...props}>
      {children}
    </td>
  );
}
