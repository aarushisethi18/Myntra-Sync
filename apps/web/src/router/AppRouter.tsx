import { useCallback, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "../auth/ProtectedRoute";
import ContextInitialization from "../components/ContextInitialization";
import { useAuth } from "../hooks/useAuth";
import { useLiveContextCollection } from "../hooks/useLiveContextCollection";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";

function AuthenticatedHome() {
  const { user, logout } = useAuth();
  useLiveContextCollection();
  const storageKey = `myntra-sync:context-initialized:${user?.id ?? "anonymous"}`;
  const [initializing, setInitializing] = useState(() => window.sessionStorage.getItem(storageKey) !== "true");
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const finishInitialization = useCallback(() => {
    window.sessionStorage.setItem(storageKey, "true");
    setInitializing(false);
  }, [storageKey]);
  async function handleLogout() {
    setLogoutError(null);
    try { await logout(); } catch (error) { setLogoutError(error instanceof Error ? error.message : "We couldn't sign you out. Please try again."); }
  }
  if (initializing) return <ContextInitialization trigger={storageKey} onComplete={finishInitialization} />;
  return <><div className="logout-control"><button onClick={handleLogout} type="button">Log out</button>{logoutError && <span role="alert">{logoutError}</span>}</div><HomePage /></>;
}

export default function AppRouter() {
  const { user } = useAuth();
  return <BrowserRouter><Routes>
    <Route path="/" element={<ProtectedRoute><AuthenticatedHome key={user?.id} /></ProtectedRoute>} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter>;
}
