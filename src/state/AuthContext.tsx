import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api";
import type { Session, User } from "../types";
import { initTelegram } from "../telegram";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  isDev: boolean;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDev, setIsDev] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;
    initTelegram();
    api
      .bootstrap()
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setError("Не удалось создать сессию");
          return;
        }
        setSession(result);
        setUserState(result.user);
        setIsDev(result.is_dev);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Не удалось подключиться к серверу";
        setError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (user?.accent) {
      document.documentElement.setAttribute("data-accent", user.accent);
    } else {
      document.documentElement.removeAttribute("data-accent");
    }
  }, [user?.accent]);

  const refreshUser = useCallback(async () => {
    const fresh = await api.me();
    setUserState(fresh);
  }, []);

  const setUser = useCallback((next: User) => {
    setUserState(next);
    if (next.accent) {
      document.documentElement.setAttribute("data-accent", next.accent);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, error, isDev, refreshUser, setUser }),
    [user, loading, error, isDev, refreshUser, setUser, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
