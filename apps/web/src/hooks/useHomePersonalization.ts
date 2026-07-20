import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import type { FashionDna, Product } from "../types/catalog";
import { getFashionDna, fetchCatalog } from "../services/catalogService";
import { getLiveContext } from "../services/contextService";
import { subscribeToPersonalizationRefresh } from "../services/personalizationRefresh";
import type { LiveContext } from "../services/signalCollectionService";

type PersonalizationState = { 
  context: LiveContext | null; 
  dna: FashionDna | null; 
  products: Product[]; 
  loading: boolean; 
};

const inFlight = new Map<string, Promise<{ context: LiveContext | null; dna: FashionDna | null; products: Product[] }>>();

function loadPersonalization(session: Session) {
  const key = session.user.id;
  const active = inFlight.get(key);
  if (active) return active;
  
  const request = Promise.all([
    getLiveContext(session).catch(() => null),
    getFashionDna(session).catch(() => null),
    fetchCatalog(session).catch(() => [])
  ]).then(([context, dna, products]) => ({ context, dna, products }));
  
  inFlight.set(key, request);
  void request.finally(() => inFlight.delete(key));
  return request;
}

/** Shared, event-driven source of homepage context, Fashion DNA, and product catalog. */
export function useHomePersonalization(session: Session | null): PersonalizationState {
  const [state, setState] = useState<PersonalizationState>({ 
    context: null, 
    dna: null, 
    products: [], 
    loading: Boolean(session) 
  });
  
  const refresh = useCallback(() => {
    if (!session) return;
    void loadPersonalization(session).then(({ context, dna, products }) => {
      setState((current) => ({ 
        context: context ?? current.context, 
        dna: dna ?? current.dna, 
        products: products.length > 0 ? products : current.products, 
        loading: false 
      }));
    });
  }, [session]);

  useEffect(() => {
    if (!session) return undefined;
    refresh();
    return subscribeToPersonalizationRefresh(refresh);
  }, [refresh, session]);

  return session ? state : { context: null, dna: null, products: [], loading: false };
}
