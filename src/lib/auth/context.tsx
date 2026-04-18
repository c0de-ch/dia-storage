"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "user" | "viewer";
  avatarUrl?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/v1/auth/me", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) {
          setUser(null);
          return;
        }
        throw new Error("Errore nel caricamento dell'utente");
      }
      const data = await res.json();
      setUser(data.user ?? data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Si è verificato un errore. Riprova più tardi."
      );
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      window.location.href = "/accesso";
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      logout,
      refresh: fetchUser,
    }),
    [user, loading, error, logout, fetchUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve essere usato all'interno di <AuthProvider>");
  }
  return ctx;
}
