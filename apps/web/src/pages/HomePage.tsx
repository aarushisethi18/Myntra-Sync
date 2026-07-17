import { useEffect, useState } from "react";

import ContextCard from "../components/ContextCard";
import { getContext } from "../services/contextService";
import type { ContextResponse } from "../types/context";

export default function HomePage() {
  const [context, setContext] = useState<ContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadContext() {
      try {
        const data = await getContext();
        setContext(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load context.");
      } finally {
        setLoading(false);
      }
    }

    loadContext();
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
  }

  if (!context) {
    return <div className="p-8">No context available.</div>;
  }

  return (
    <main className="max-w-4xl mx-auto p-8">
      <ContextCard context={context} />
    </main>
  );
}