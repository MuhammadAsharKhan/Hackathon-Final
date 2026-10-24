import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

// One confirm dialog per page. ask() describes the action and what it runs;
// a failing action keeps the dialog open with the server message.
export const useConfirm = () => {
  const [request, setRequest] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const ask = useCallback((next) => {
    setError("");
    setRequest({ confirmLabel: "Delete", ...next });
  }, []);

  const close = useCallback(() => {
    if (loading) return;
    setError("");
    setRequest(null);
  }, [loading]);

  const confirm = useCallback(async () => {
    if (!request?.run) return;

    setLoading(true);
    setError("");

    try {
      await request.run();
      setRequest(null);
    } catch (failure) {
      const message = getErrorMessage(failure);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [request]);

  const dialogProps = useMemo(
    () => ({
      open: Boolean(request),
      title: request?.title,
      description: request?.description,
      confirmLabel: request?.confirmLabel,
      error: error || undefined,
      loading,
      onClose: close,
      onConfirm: confirm,
    }),
    [request, error, loading, close, confirm]
  );

  return { ask, close, dialogProps };
};
