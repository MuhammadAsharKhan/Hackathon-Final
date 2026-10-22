import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import * as authApi from "@/api/auth.api";
import { clearToken, setToken } from "@/lib/tokenStore";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const session = await authApi.refresh();
        if (!active) return;
        setToken(session.accessToken);
        setUser(session.user);
      } catch {
        if (!active) return;
        clearToken();
        setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    bootstrap();

    const handleLogout = () => {
      clearToken();
      setUser(null);
    };

    window.addEventListener("auth:logout", handleLogout);

    return () => {
      active = false;
      window.removeEventListener("auth:logout", handleLogout);
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const session = await authApi.login(credentials);
    setToken(session.accessToken);
    setUser(session.user);
    return session.user;
  }, []);

  const register = useCallback(async (payload) => {
    const session = await authApi.register(payload);
    setToken(session.accessToken);
    setUser(session.user);
    return session.user;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    clearToken();
    setUser(null);
  }, []);

  const updateUser = useCallback((nextUser) => {
    setUser(nextUser);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, updateUser }),
    [user, loading, login, register, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
