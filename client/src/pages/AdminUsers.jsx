import { useEffect, useRef, useState } from "react";
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
import { scrollToElement } from "@/lib/scroll";

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
  const [reloadToken, setReloadToken] = useState(0);
  const listTopRef = useRef(null);

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    scrollToElement(listTopRef.current);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    listUsers({ page, limit: PAGE_SIZE })
      .then((usersData) => {
        if (cancelled) return;
        setUsers(usersData.users);
        setPagination(usersData.pagination);
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
  }, [page, reloadToken]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Everyone with an account, newest first."
      />

      <div ref={listTopRef} className="scroll-mt-20 space-y-6">
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
            onRetry={() => setReloadToken((token) => token + 1)}
          />
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users yet"
            description="Accounts appear here as people register."
          />
        ) : (
          <Table columns={COLUMNS}>
            {users.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium">{account.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {account.email}
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      account.role === "admin"
                        ? "border-foreground bg-foreground text-background"
                        : undefined
                    }
                  >
                    {account.role === "admin" ? "Admin" : "User"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(account.createdAt)}
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
            onChange={handlePageChange}
            itemLabel="users"
            itemLabelSingular="user"
          />
        ) : null}
      </div>
    </div>
  );
}
