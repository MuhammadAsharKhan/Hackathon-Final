import { useMemo } from "react";
import { listUsers } from "@/api/users.api";
import { useAuth } from "@/hooks/useAuth";
import { useResource } from "@/hooks/useResource";

// Leave and correction rows do not carry the requester's role, so the admin
// reads the HR accounts once to know which rows it may decide.
export const useHrEmployeeIds = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data, loading } = useResource(
    () => (isAdmin ? listUsers({ role: "hr", limit: 100 }) : Promise.resolve(null)),
    [isAdmin]
  );

  const employeeIds = useMemo(() => {
    const users = data?.users || [];
    return new Set(users.map((account) => account.employeeId).filter(Boolean));
  }, [data]);

  return { employeeIds, loading: isAdmin && loading };
};
