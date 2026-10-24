import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import * as authApi from "@/api/auth.api";
import {
  clearToken,
  forgetSession,
  hasSessionHint,
  rememberSession,
  setToken,
} from "@/lib/tokenStore";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((session) => {
    setToken(session.accessToken);
    rememberSession();
    setUser(session.user);
    setEmployee(session.employee ?? null);
    setMustChangePassword(Boolean(session.mustChangePassword));
    return session;
  }, []);

  const dropSession = useCallback(() => {
    clearToken();
    forgetSession();
    setUser(null);
    setEmployee(null);
    setMustChangePassword(false);
  }, []);

  useEffect(() => {
    let active = true;

    // A full page load restores the session from the httpOnly refresh cookie.
    // Without the hint there is nothing to restore, and asking anyway would
    // put a 401 in the console of every visitor.
    const bootstrap = async () => {
      if (!hasSessionHint()) {
        if (active) setLoading(false);
        return;
      }

      try {
        const session = await authApi.refresh();
        if (active) applySession(session);
      } catch {
        if (active) dropSession();
      } finally {
        if (active) setLoading(false);
      }
    };

    bootstrap();

    const handleLogout = () => dropSession();
    const handlePasswordRequired = () => setMustChangePassword(true);

    window.addEventListener("auth:logout", handleLogout);
    window.addEventListener("auth:passwordChangeRequired", handlePasswordRequired);

    return () => {
      active = false;
      window.removeEventListener("auth:logout", handleLogout);
      window.removeEventListener(
        "auth:passwordChangeRequired",
        handlePasswordRequired
      );
    };
  }, [applySession, dropSession]);

  const login = useCallback(
    async (credentials) => applySession(await authApi.login(credentials)),
    [applySession]
  );

  const changePassword = useCallback(
    async (passwordChange) =>
      applySession(await authApi.changePassword(passwordChange)),
    [applySession]
  );

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    dropSession();
  }, [dropSession]);

  // Reloads the account summary after a profile edit or a role change.
  const refreshAccount = useCallback(async () => {
    const account = await authApi.getMe();
    setUser(account.user);
    setEmployee(account.employee ?? null);
    setMustChangePassword(Boolean(account.mustChangePassword));
    return account;
  }, []);

  const applyEmployee = useCallback((nextEmployee) => {
    setEmployee(nextEmployee ?? null);
  }, []);

  const authValue = useMemo(
    () => ({
      user,
      employee,
      mustChangePassword,
      loading,
      login,
      logout,
      changePassword,
      refreshAccount,
      applySession,
      applyEmployee,
    }),
    [
      user,
      employee,
      mustChangePassword,
      loading,
      login,
      logout,
      changePassword,
      refreshAccount,
      applySession,
      applyEmployee,
    ]
  );

  return (
    <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
  );
}
