import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import type { FashionDna } from "../types/catalog";
import { getFashionDna } from "../services/catalogService";
import { getLiveContext } from "../services/contextService";
import { subscribeToPersonalizationRefresh } from "../services/personalizationRefresh";
import type { LiveContext } from "../services/signalCollectionService";

type PersonalizationState = { context: LiveContext | null; dna: FashionDna | null; loading: boolean };
const inFlight = new Map<string, Promise<{ context: LiveContext | null; dna: FashionDna | null }>>();

function loadPersonalization(session: Session) {
  const key = session.user.id;
  const active = inFlight.get(key);
  if (active) return active;
  const request = Promise.all([getLiveContext(session).catch(() => null), getFashionDna(session)]).then(([context, dna]) => ({ context, dna }));
  inFlight.set(key, request);
  void request.finally(() => inFlight.delete(key));
  return request;
}

/** Shared, event-driven source of homepage context and Fashion DNA. */
export function useHomePersonalization(session: Session | null): PersonalizationState {
  const [state, setState] = useState<PersonalizationState>({ context: null, dna: null, loading: Boolean(session) });
  const refresh = useCallback(() => {
    if (!session) return;
    void loadPersonalization(session).then(({ context, dna }) => {
      setState((current) => ({ context: context ?? current.context, dna: dna ?? current.dna, loading: false }));
    });
  }, [session]);

  useEffect(() => {
    if (!session) return undefined;
    refresh();
    return subscribeToPersonalizationRefresh(refresh);
  }, [refresh, session]);

  return session ? state : { context: null, dna: null, loading: false };
}
