import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import { Table, TableCell, TableRow } from "@/components/ui/Table";
import { listUsers } from "@/api/users.api";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { getErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";

const PAGE_SIZE = 10;
const COLUMNS = ["Name", "Email", "Role", "Joined"];

export default function AdminUsers() {
  useDocumentTitle("Users");

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    pages: 0,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    listUsers({ page, limit: PAGE_SIZE })
      .then((payload) => {
        if (cancelled) return;
        setUsers(payload.users);
        setPagination(payload.pagination);
      })
      .catch((requestError) => {
        if (cancelled) return;
        setError(getErrorMessage(requestError));
        setUsers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, refreshKey]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Everyone with an account, newest first."
      />

      {loading ? (
        <div className="space-y-3" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="skeleton h-14 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Users did not load"
          message={error}
          onRetry={() => setRefreshKey((key) => key + 1)}
        />
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users yet"
          description="Accounts appear here as people register."
        />
      ) : (
        <Table columns={COLUMNS}>
          {users.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="font-medium">{entry.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {entry.email}
              </TableCell>
              <TableCell>
                <Badge
                  className={
                    entry.role === "admin"
                      ? "border-foreground bg-foreground text-background"
                      : undefined
                  }
                >
                  {entry.role === "admin" ? "Admin" : "User"}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(entry.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </Table>
      )}

      {!loading && !error ? (
        <Pagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          onChange={setPage}
        />
      ) : null}
    </div>
  );
}
