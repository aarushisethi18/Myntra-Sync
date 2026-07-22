import { lazy, Suspense, useCallback, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "../auth/ProtectedRoute";
import ContextInitialization from "../components/ContextInitialization";
import { useAuth } from "../hooks/useAuth";
import { useLiveContextCollection } from "../hooks/useLiveContextCollection";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import BagPage from "../pages/BagPage";
import WishlistPage from "../pages/WishlistPage";
import OrdersPage from "../pages/OrdersPage";
import CatalogPage from "../pages/CatalogPage";
import BlendPage from "../features/blend/pages/BlendFlowPage";

const WrappedPage = lazy(() => import("../features/wrapped/WrappedPage"));

function AuthenticatedHome() {
  const { user } = useAuth();
  useLiveContextCollection();
  const storageKey = `myntra-sync:context-initialized:${user?.id ?? "anonymous"}`;
  const [initializing, setInitializing] = useState(() => window.sessionStorage.getItem(storageKey) !== "true");
  
  const finishInitialization = useCallback(() => {
    window.sessionStorage.setItem(storageKey, "true");
    setInitializing(false);
  }, [storageKey]);

  if (initializing) {
    return <ContextInitialization trigger={storageKey} onComplete={finishInitialization} />;
  }
  return <HomePage />;
}

export default function AppRouter() {
  const { user } = useAuth();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProtectedRoute><AuthenticatedHome key={user?.id} /></ProtectedRoute>} />
        <Route path="/bag" element={<ProtectedRoute><BagPage /></ProtectedRoute>} />
        <Route path="/wishlist" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
        <Route path="/catalog/:collection" element={<ProtectedRoute><CatalogPage /></ProtectedRoute>} />
        <Route path="/blend" element={<ProtectedRoute><BlendPage /></ProtectedRoute>} />
        <Route path="/blend/invite/:inviteCode" element={<ProtectedRoute><BlendPage /></ProtectedRoute>} />
        <Route path="/wrapped" element={<ProtectedRoute><Suspense fallback={<div className="min-h-screen bg-[#2a1e4a]" />}><WrappedPage /></Suspense></ProtectedRoute>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
