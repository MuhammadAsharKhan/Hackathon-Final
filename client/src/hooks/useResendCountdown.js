import { useCallback, useEffect, useState } from "react";

export function useResendCountdown(seconds = 60) {
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const restart = useCallback(() => setCountdown(seconds), [seconds]);
  const clear = useCallback(() => setCountdown(0), []);

  return { countdown, restart, clear };
}
