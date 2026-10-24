import { useState } from "react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import DataTable from "@/components/data/DataTable";
import FilterBar from "@/components/data/FilterBar";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import CreateHrModal from "@/components/users/CreateHrModal";
import TemporaryPasswordModal from "@/components/users/TemporaryPasswordModal";
import { listUsers, resetUserPassword, setUserActive } from "@/api/users.api";
import { useConfirm } from "@/hooks/useConfirm";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useResource } from "@/hooks/useResource";
import { formatDateTime } from "@/lib/format";

const PAGE_SIZE = 10;

export default function AdminUsers() {
  useDocumentTitle("Users");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [temporary, setTemporary] = useState(null);
  const { ask, dialogProps } = useConfirm();

  const { data, loading, error, reload } = useResource(
    () =>
      listUsers({
        role: "hr",
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
      }),
    [page, search]
  );

  const users = data?.users || [];
  const pagination = data?.pagination;

  const handleCreated = (result) => {
    setCreateOpen(false);
    setTemporary({
      title: "HR account created",
      accountName: `${result.user.name} (${result.user.email})`,
      password: result.temporaryPassword,
    });
    setPage(1);
    reload();
  };

  const toggleActive = (user) => {
    const nextActive = !user.isActive;

    ask({
      title: nextActive ? "Activate account" : "Deactivate account",
      description: nextActive
        ? `${user.name} can sign in again.`
        : `${user.name} is signed out and cannot sign in until the account is activated.`,
      confirmLabel: nextActive ? "Activate" : "Deactivate",
      run: async () => {
        await setUserActive(user.id, nextActive);
        toast.success(nextActive ? "Account activated" : "Account deactivated");
        reload();
      },
    });
  };

  const resetPassword = (user) => {
    ask({
      title: "Reset password",
      description: `A new temporary password is created for ${user.name}.`,
      confirmLabel: "Reset password",
      run: async () => {
        const result = await resetUserPassword(user.id);
        setTemporary({
          title: "Password reset",
          accountName: user.name,
          password: result.temporaryPassword,
        });
        reload();
      },
    });
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      className: "font-medium",
      render: (user) => user.name,
    },
    {
      key: "email",
      header: "Email",
      className: "text-muted-foreground",
      render: (user) => user.email,
    },
    {
      key: "status",
      header: "Status",
      render: (user) => (
        <StatusBadge
          kind="account"
          status={user.isActive ? "active" : "inactive"}
        />
      ),
    },
    {
      key: "lastLogin",
      header: "Last sign-in",
      className: "whitespace-nowrap text-muted-foreground",
      render: (user) =>
        user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never",
    },
    {
      key: "actions",
      header: "Actions",
      render: (user) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => resetPassword(user)}>
            Reset password
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={user.isActive ? "text-danger hover:text-danger" : undefined}
            onClick={() => toggleActive(user)}
          >
            {user.isActive ? "Deactivate" : "Activate"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="HR sign-in accounts. Every HR account has one employee record."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New HR account
          </Button>
        }
      />

      <FilterBar
        search={{
          value: search,
          onChange: (value) => {
            setSearch(value);
            setPage(1);
          },
          placeholder: "Search by name or email",
          label: "Search HR accounts",
        }}
      />

      <DataTable
        columns={columns}
        rows={users}
        loading={loading}
        error={error}
        errorTitle="Accounts did not load"
        onRetry={reload}
        empty={{
          title: search ? "No account matches this search" : "No HR accounts yet",
          description: search
            ? "Try a different name or email."
            : "Create the first HR account to hand over people management.",
        }}
        pagination={
          pagination
            ? {
                page: pagination.page,
                pages: pagination.pages,
                total: pagination.total,
                onChange: setPage,
                itemLabel: "accounts",
                itemLabelSingular: "account",
                disabled: loading,
              }
            : undefined
        }
      />

      {createOpen ? (
        <CreateHrModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreated}
        />
      ) : null}

      <TemporaryPasswordModal
        open={Boolean(temporary)}
        onClose={() => setTemporary(null)}
        title={temporary?.title}
        accountName={temporary?.accountName}
        password={temporary?.password}
      />

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
