import { useRef, useState } from "react";
import { UserSearch, UserX } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import CopyButton from "@/components/ui/CopyButton";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import ErrorState from "@/components/ui/ErrorState";
import { findUserByUid } from "@/api/users.api";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useMountedRef } from "@/hooks/useMountedRef";
import { getErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";

export default function FindUser() {
  useDocumentTitle("Find user");

  const [uid, setUid] = useState("");
  const [foundUser, setFoundUser] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [inputError, setInputError] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [loading, setLoading] = useState(false);
  const mountedRef = useMountedRef();
  const requestRef = useRef(0);

  const updateUid = (event) => {
    requestRef.current += 1;
    setUid(event.target.value.replace(/\D/g, "").slice(0, 9));
    setLoading(false);
    setInputError("");
    setLookupError("");
    setNotFound(false);
    setFoundUser(null);
  };

  const find = async (candidateUid) => {
    if (loading) return;

    if (!/^\d{9}$/.test(candidateUid)) {
      setInputError("Enter the nine digit user ID");
      return;
    }

    const requestId = ++requestRef.current;
    setLoading(true);
    setInputError("");
    setLookupError("");
    setNotFound(false);
    setFoundUser(null);

    try {
      const userData = await findUserByUid(candidateUid);
      if (!mountedRef.current || requestRef.current !== requestId) return;
      setFoundUser(userData.user);
    } catch (failure) {
      if (!mountedRef.current || requestRef.current !== requestId) return;
      if (failure?.response?.status === 404) {
        setNotFound(true);
      } else {
        setLookupError(getErrorMessage(failure));
      }
    } finally {
      if (mountedRef.current && requestRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    find(uid);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find user"
        description="Look up an account by its nine digit user ID."
      />

      <Card className="max-w-xl p-6">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-start" onSubmit={handleSubmit} noValidate>
          <div className="w-full sm:max-w-xs">
            <Input
              label="User ID"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={9}
              autoComplete="off"
              placeholder="123456789"
              value={uid}
              onChange={updateUid}
              error={inputError}
              className="font-mono tracking-wide tabular-nums"
            />
          </div>
          <Button type="submit" loading={loading} className="sm:mt-6">
            Find user
          </Button>
        </form>
      </Card>

      {notFound ? (
        <EmptyState
          icon={UserX}
          title="No account with that ID"
          description="Check the number and try again."
        />
      ) : null}

      {lookupError ? (
        <ErrorState
          title="Could not look up that user"
          message={lookupError}
          onRetry={() => find(uid)}
        />
      ) : null}

      {foundUser ? (
        <Card className="max-w-xl p-6">
          <div className="flex items-start gap-4">
            <Avatar user={foundUser} size="lg" />
            <div className="min-w-0 space-y-1.5">
              <h2 className="truncate text-base font-semibold">
                {foundUser.name}
              </h2>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <span className="font-mono tabular-nums">
                  UID {foundUser.uid}
                </span>
                <CopyButton
                  value={foundUser.uid}
                  label="Copy user id"
                  className="h-10 w-10 sm:h-8 sm:w-8"
                />
              </p>
              <p className="text-xs text-muted-foreground">
                Joined {formatDate(foundUser.createdAt)}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {!foundUser && !notFound && !lookupError && !loading ? (
        <EmptyState
          icon={UserSearch}
          title="Find someone by their ID"
          description="Every account shows its nine digit ID on the profile page."
        />
      ) : null}
    </div>
  );
}
