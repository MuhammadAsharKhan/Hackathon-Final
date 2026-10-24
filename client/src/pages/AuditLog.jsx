import { useState } from "react";
import DataTable from "@/components/data/DataTable";
import FilterBar from "@/components/data/FilterBar";
import AuditDetails from "@/components/audit/AuditDetails";
import PageHeader from "@/components/ui/PageHeader";
import { listAuditLogs } from "@/api/audit.api";
import { listUsers } from "@/api/users.api";
import { useDebounce } from "@/hooks/useDebounce";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useResource } from "@/hooks/useResource";
import { formatDateTime } from "@/lib/format";

const PAGE_SIZE = 10;

export default function AuditLog() {
  useDocumentTitle("Audit log");

  const [page, setPage] = useState(1);
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const debouncedAction = useDebounce(action, 400);
  const debouncedEntity = useDebounce(entity, 400);

  const { data: peopleData } = useResource(
    () => listUsers({ page: 1, limit: 100 }),
    []
  );

  const { data, loading, error, reload } = useResource(
    () =>
      listAuditLogs({
        page,
        limit: PAGE_SIZE,
        actor: actor || undefined,
        action: debouncedAction.trim() || undefined,
        entity: debouncedEntity.trim() || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
    [page, actor, debouncedAction, debouncedEntity, from, to]
  );

  const logs = data?.logs || [];
  const pagination = data?.pagination;
  const actorOptions = (peopleData?.users || []).map((user) => ({
    value: user.id,
    label: user.name,
  }));

  const clearFilters = () => {
    setActor("");
    setAction("");
    setEntity("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const columns = [
    {
      key: "createdAt",
      header: "When",
      className: "whitespace-nowrap text-muted-foreground",
      render: (log) => formatDateTime(log.createdAt),
    },
    {
      key: "actor",
      header: "Actor",
      render: (log) => (
        <div>
          <p className="font-medium">{log.actorName || "-"}</p>
          <p className="text-xs text-muted-foreground">{log.actorRole || "-"}</p>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      className: "font-mono text-xs",
      render: (log) => log.action,
    },
    {
      key: "entity",
      header: "Entity",
      className: "text-muted-foreground",
      render: (log) => log.entity || "-",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Every write in the system, newest first. Entries are append only."
      />

      <FilterBar
        filters={[
          {
            key: "actor",
            label: "Actor",
            allLabel: "All actors",
            value: actor,
            onChange: (value) => {
              setActor(value);
              setPage(1);
            },
            options: actorOptions,
          },
        ]}
        fields={[
          {
            key: "action",
            label: "Action",
            placeholder: "Action, for example settings.update",
            value: action,
            onChange: (value) => {
              setAction(value);
              setPage(1);
            },
          },
          {
            key: "entity",
            label: "Entity",
            placeholder: "Entity, for example department",
            value: entity,
            onChange: (value) => {
              setEntity(value);
              setPage(1);
            },
          },
        ]}
        dateRange={{
          from,
          to,
          onFromChange: (value) => {
            setFrom(value);
            setPage(1);
          },
          onToChange: (value) => {
            setTo(value);
            setPage(1);
          },
        }}
        onClear={clearFilters}
      />

      <DataTable
        columns={columns}
        rows={logs}
        loading={loading}
        error={error}
        errorTitle="Audit entries did not load"
        onRetry={reload}
        renderExpanded={(log) => <AuditDetails log={log} />}
        empty={{
          title: "No audit entries match these filters",
          description: "Clear the filters or widen the date range.",
        }}
        pagination={
          pagination
            ? {
                page: pagination.page,
                pages: pagination.pages,
                total: pagination.total,
                onChange: setPage,
                itemLabel: "entries",
                itemLabelSingular: "entry",
                disabled: loading,
              }
            : undefined
        }
      />
    </div>
  );
}
