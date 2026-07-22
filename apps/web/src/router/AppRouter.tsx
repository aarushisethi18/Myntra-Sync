import { useCallback, useState } from "react";
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
import RecommendationInsightsPage from "../pages/RecommendationInsightsPage";

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
        <Route path="/recommendation-insights" element={<ProtectedRoute><RecommendationInsightsPage /></ProtectedRoute>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
