import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Inbox } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Pagination from "@/components/ui/Pagination";
import { Table, TableCell, TableRow } from "@/components/ui/Table";
import { cn } from "@/lib/cn";

const SKELETON_ROWS = 5;
const SKELETON_WIDTHS = ["w-3/4", "w-1/2", "w-2/3", "w-1/3", "w-1/2", "w-2/3"];

const cellValue = (column, row) =>
  column.render ? column.render(row) : row[column.key];

function SkeletonTable({ headers }) {
  return (
    <Table columns={headers}>
      {Array.from({ length: SKELETON_ROWS }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {headers.map((__, cellIndex) => (
            <TableCell key={cellIndex}>
              <div
                className={cn(
                  "skeleton h-3",
                  SKELETON_WIDTHS[cellIndex % SKELETON_WIDTHS.length]
                )}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </Table>
  );
}

export default function DataTable({
  columns,
  rows = [],
  getRowId = (row) => row.id,
  loading = false,
  error = "",
  errorTitle = "This list did not load",
  onRetry,
  empty,
  pagination,
  renderExpanded,
  className,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const columnCount = columns.length + (renderExpanded ? 1 : 0);
  const headers = [
    ...columns.map((column) => column.header ?? ""),
    ...(renderExpanded ? [""] : []),
  ];

  if (error) {
    return (
      <ErrorState
        className={className}
        title={errorTitle}
        message={error}
        onRetry={onRetry}
      />
    );
  }

  if (loading) {
    return (
      <div className={className} aria-busy="true">
        <SkeletonTable headers={headers} />
        <span className="sr-only" role="status">
          Loading
        </span>
      </div>
    );
  }

  if (rows.length === 0) {
    const state = { icon: Inbox, title: "Nothing here yet", ...empty };

    return (
      <EmptyState
        className={className}
        icon={state.icon}
        title={state.title}
        description={state.description}
        action={state.action}
      />
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Table columns={headers}>
        {rows.map((row) => {
          const rowId = getRowId(row);
          const expanded = renderExpanded ? expandedId === rowId : false;

          return (
            <Fragment key={rowId}>
              <TableRow>
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {cellValue(column, row)}
                  </TableCell>
                ))}
                {renderExpanded ? (
                  <TableCell className="w-12 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-expanded={expanded}
                      aria-label={expanded ? "Hide details" : "Show details"}
                      onClick={() => setExpandedId(expanded ? null : rowId)}
                    >
                      {expanded ? (
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      )}
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
              {expanded ? (
                <TableRow>
                  <TableCell colSpan={columnCount} className="bg-surface">
                    {renderExpanded(row)}
                  </TableCell>
                </TableRow>
              ) : null}
            </Fragment>
          );
        })}
      </Table>

      {pagination ? (
        <Pagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          onChange={pagination.onChange}
          itemLabel={pagination.itemLabel}
          itemLabelSingular={pagination.itemLabelSingular}
          disabled={pagination.disabled}
        />
      ) : null}
    </div>
  );
}
