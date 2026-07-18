import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { user, loading } = useAuth();
  if (loading) return <main className="auth-page"><div className="auth-loading" role="status">Restoring your session…</div></main>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
