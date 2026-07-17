import type { ContextResponse } from "../types/context";

const API_BASE_URL = "http://localhost:8000";

export async function getContext(): Promise<ContextResponse> {
  const response = await fetch(`${API_BASE_URL}/context`);

  if (!response.ok) {
    throw new Error("Failed to fetch context");
  }

  return response.json();
}