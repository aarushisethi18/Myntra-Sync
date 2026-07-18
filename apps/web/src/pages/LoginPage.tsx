import { useState } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const { user, loading, error: authError, login } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <main className="auth-page"><div className="auth-loading" role="status">Restoring your session…</div></main>;
  if (user) return <Navigate to="/" replace />;

  async function handleGoogleLogin() {
    setError(null);
    setSubmitting(true);
    try {
      await login();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Google sign-in could not be started. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-logo" aria-hidden="true">M</div>
        <p className="eyebrow">Your personal style companion</p>
        <h1 id="login-title">Myntra Sync</h1>
        <p className="login-subtitle">Shopping shouldn&apos;t begin when you open the app.</p>
        <button className="google-login-button" onClick={handleGoogleLogin} disabled={submitting} type="button">
          <span className="google-mark" aria-hidden="true">G</span>
          {submitting ? "Connecting to Google…" : "Continue with Google"}
        </button>
        {(error ?? authError) && <p className="auth-error" role="alert">{error ?? authError}</p>}
      </section>
    </main>
  );
}
