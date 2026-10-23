import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import * as authApi from "@/api/auth.api";
import { clearToken, setToken } from "@/lib/tokenStore";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const startSession = useCallback((session) => {
    setToken(session.accessToken);
    setUser(session.user);
    return session.user;
  }, []);

  useEffect(() => {
    let active = true;

    // A full page load restores the session from the httpOnly refresh cookie.
    const bootstrap = async () => {
      try {
        const session = await authApi.refresh();
        if (!active) return;
        startSession(session);
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
  }, [startSession]);

  const login = useCallback(
    async (credentials) => {
      const session = await authApi.login(credentials);
      return startSession(session);
    },
    [startSession]
  );

  // Registration may answer with a session or ask for an emailed code.
  const register = useCallback(
    async (account) => {
      const result = await authApi.register(account);
      if (result.accessToken) startSession(result);
      return result;
    },
    [startSession]
  );

  const verifyEmail = useCallback(
    async (verification) => {
      const session = await authApi.verifyEmail(verification);
      return startSession(session);
    },
    [startSession]
  );

  const loginWithGoogle = useCallback(
    async (credential) => {
      const session = await authApi.signInWithGoogle(credential);
      return startSession(session);
    },
    [startSession]
  );

  const loginWithFacebook = useCallback(
    async (accessToken) => {
      const session = await authApi.signInWithFacebook(accessToken);
      return startSession(session);
    },
    [startSession]
  );

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    clearToken();
    setUser(null);
  }, []);

  const updateUser = useCallback((nextUser) => {
    setUser(nextUser);
  }, []);

  const authValue = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      verifyEmail,
      loginWithGoogle,
      loginWithFacebook,
      logout,
      updateUser,
    }),
    [
      user,
      loading,
      login,
      register,
      verifyEmail,
      loginWithGoogle,
      loginWithFacebook,
      logout,
      updateUser,
    ]
  );

  return (
    <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
  );
}
