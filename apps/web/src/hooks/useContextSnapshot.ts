import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { getLiveContext } from "../services/contextService";

export function useContextSnapshot(session: Session | null) {
  return useQuery({
    queryKey: ["context-snapshot", session?.user.id],
    queryFn: async () => {
      const activeSession = session as Session;
      const context = await getLiveContext(activeSession);
      return { context, fashionDna: context.fashionDna };
    },
    enabled: Boolean(session),
    staleTime: 5 * 60_000,
  });
}
