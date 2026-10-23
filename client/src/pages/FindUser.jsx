import { useState } from "react";
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
import { getErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";

export default function FindUser() {
  useDocumentTitle("Find user");

  const [uid, setUid] = useState("");
  const [result, setResult] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [inputError, setInputError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateUid = (event) => {
    setUid(event.target.value.replace(/\D/g, "").slice(0, 9));
    setInputError("");
    setRequestError("");
    setNotFound(false);
    setResult(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!/^\d{9}$/.test(uid)) {
      setInputError("Enter the nine digit user ID");
      return;
    }

    setLoading(true);
    setInputError("");
    setRequestError("");
    setNotFound(false);
    setResult(null);

    try {
      const data = await findUserByUid(uid);
      setResult(data.user);
    } catch (requestError) {
      if (requestError?.response?.status === 404) {
        setNotFound(true);
      } else {
        setRequestError(getErrorMessage(requestError));
      }
    } finally {
      setLoading(false);
    }
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

      {requestError ? (
        <ErrorState
          title="Could not look up that user"
          message={requestError}
          onRetry={() => setRequestError("")}
        />
      ) : null}

      {result ? (
        <Card className="max-w-xl p-6">
          <div className="flex items-start gap-4">
            <Avatar user={result} size="lg" />
            <div className="min-w-0 space-y-1.5">
              <h2 className="truncate text-base font-semibold">
                {result.name}
              </h2>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <span className="font-mono tabular-nums">UID {result.uid}</span>
                <CopyButton
                  value={result.uid}
                  label="Copy user id"
                  className="h-6 w-6"
                />
              </p>
              <p className="text-xs text-muted-foreground">
                Joined {formatDate(result.createdAt)}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {!result && !notFound && !requestError && !loading ? (
        <EmptyState
          icon={UserSearch}
          title="Find someone by their ID"
          description="Every account shows its nine digit ID on the profile page."
        />
      ) : null}
    </div>
  );
}
