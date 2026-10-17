/**
 * Auth context — wraps the data API's session methods and exposes
 * the current user plus register / login / logout actions.
 * Unauthenticated users can still browse the feed; posting,
 * liking and discussing require registration ("register to participate").
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api } from "@/lib/api";
import type { SessionUser, AuthResult } from "@/types";

interface AuthContextValue {
  user: SessionUser | null;
  /** true while the initial session restore is in flight */
  loading: boolean;
  /**
   * Register the user. Returns the outcome so the UI can show the
   * "verify your email" popup when the platform requires confirmation.
   */
  register: (
    handle: string,
    email: string,
    password: string,
  ) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
  confirmEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getSession()
      .then((session) => {
        if (!cancelled) setUser(session);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const register = useCallback(
    async (handle: string, email: string, password: string) => {
      const result = await api.signUp(handle, email, password);
      if (result.user) setUser(result.user);
      return result;
    },
    [],
  );

  const login = useCallback(async (email: string, password: string) => {
    const next = await api.signIn(email, password);
    setUser(next);
    return next;
  }, []);

  const logout = useCallback(async () => {
    await api.signOut();
    setUser(null);
  }, []);

  const confirmEmail = useCallback(async (email: string) => {
    await api.confirmEmail(email);
  }, []);

  const value = useMemo(
    () => ({ user, loading, register, login, logout, confirmEmail }),
    [user, loading, register, login, logout, confirmEmail],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
