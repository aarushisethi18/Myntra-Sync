import { createContext, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase, supabaseConfigurationError } from "./supabase";

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError(supabaseConfigurationError);
      setLoading(false);
      return undefined;
    }
    let active = true;
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      setSession(data.session);
      setError(sessionError?.message ?? null);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setError(null);
      setLoading(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async () => {
    if (!supabase) throw new Error(supabaseConfigurationError);
    setError(null);
    const { error: loginError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (loginError) {
      setError(loginError.message);
      throw loginError;
    }
  }, []);

  const logout = useCallback(async () => {
    if (!supabase) throw new Error(supabaseConfigurationError);
    const userId = session?.user.id;
    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) {
      setError(logoutError.message);
      throw logoutError;
    }
    if (userId) window.sessionStorage.removeItem(`myntra-sync:context-initialized:${userId}`);
    setSession(null);
    setError(null);
  }, [session?.user.id]);

  const value = useMemo<AuthContextValue>(
    () => ({ user: session?.user ?? null, session, loading, error, login, logout }),
    [session, loading, error, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
