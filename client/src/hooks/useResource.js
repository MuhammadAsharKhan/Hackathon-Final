import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/lib/errors";

// One read request with the three states every data view needs. Pass the
// values that identify the request in deps; reload() re-runs it.
export const useResource = (loader, deps = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    loaderRef
      .current()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((failure) => {
        if (!active) return;
        setError(getErrorMessage(failure));
        setData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return { data, loading, error, reload, setData };
};
