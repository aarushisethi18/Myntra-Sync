const PERSONALIZATION_REFRESH_EVENT = "myntra-personalization-refresh";
let pendingRefresh: ReturnType<typeof window.setTimeout> | undefined;

/** Coalesces context and behaviour changes into one homepage refresh. */
export function requestPersonalizationRefresh(): void {
  if (pendingRefresh) window.clearTimeout(pendingRefresh);
  pendingRefresh = window.setTimeout(() => {
    pendingRefresh = undefined;
    window.dispatchEvent(new Event(PERSONALIZATION_REFRESH_EVENT));
  }, 350);
}

export function subscribeToPersonalizationRefresh(listener: () => void): () => void {
  window.addEventListener(PERSONALIZATION_REFRESH_EVENT, listener);
  return () => window.removeEventListener(PERSONALIZATION_REFRESH_EVENT, listener);
}