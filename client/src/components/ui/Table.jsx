import { cn } from "@/lib/cn";

export function Table({
  columns,
  className,
  minWidthClass = "min-w-[38rem]",
  children,
  ...props
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-card bg-surface shadow-e2",
        className
      )}
      {...props}
    >
      <table
        className={cn(
          "w-full border-collapse text-left text-sm",
          minWidthClass
        )}
      >
        <thead>
          <tr className="border-b border-line-soft">
            {columns.map((column, index) => (
              <th
                key={`${index}-${column}`}
                scope="col"
                className="px-5 py-3 text-[12.5px] font-semibold text-muted"
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
      className={cn(
        "group relative border-b border-line-soft last:border-b-0",
        "transition-colors duration-150 hover:bg-blue-50",
        className
      )}
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
