import { useEffect, useState } from "react";
import { AlertCircle, Users } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import { listUsers } from "@/api/users.api";
import { getErrorMessage } from "@/lib/errors";

const PAGE_SIZE = 10;

const formatDate = (value) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

export default function AdminUsers() {
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
        <div className="rounded-xl border border-border p-6">
          <div className="flex items-start gap-3">
            <AlertCircle
              className="mt-0.5 h-4 w-4 text-danger"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium">Users did not load</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => setRefreshKey((key) => key + 1)}
              >
                Try again
              </Button>
            </div>
          </div>
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users yet"
          description="Accounts appear here as people register."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[38rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-xs text-muted-foreground">
                <th scope="col" className="px-5 py-3 font-medium">
                  Name
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Email
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Role
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="px-5 py-4 font-medium">{entry.name}</td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {entry.email}
                  </td>
                  <td className="px-5 py-4">
                    <Badge
                      className={
                        entry.role === "admin"
                          ? "border-foreground bg-foreground text-background"
                          : undefined
                      }
                    >
                      {entry.role === "admin" ? "Admin" : "User"}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {formatDate(entry.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
