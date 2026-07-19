-- Persistent implicit-interaction history and continuously updated Fashion DNA.
CREATE TABLE IF NOT EXISTS public.behavior_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    product_id TEXT,
    brand TEXT,
    category TEXT,
    color TEXT,
    fabric TEXT,
    fit TEXT,
    style TEXT,
    occasion TEXT,
    price NUMERIC(12, 2),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fashion_dna (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    trend_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    experimentation_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    budget_min NUMERIC(12, 2),
    budget_max NUMERIC(12, 2),
    preferred_season TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fashion_affinity_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dimension TEXT NOT NULL,
    value TEXT NOT NULL,
    score DOUBLE PRECISION NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fashion_affinity_scores_user_dimension_value_key UNIQUE (user_id, dimension, value)
);

CREATE INDEX IF NOT EXISTS behavior_events_user_created_at_idx ON public.behavior_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS behavior_events_product_idx ON public.behavior_events (user_id, product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS behavior_events_type_idx ON public.behavior_events (user_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS behavior_events_event_id_idx ON public.behavior_events (user_id, (metadata->>'eventId')) WHERE metadata ? 'eventId';
CREATE UNIQUE INDEX IF NOT EXISTS behavior_events_user_event_id_key ON public.behavior_events (user_id, (metadata->>'eventId')) WHERE metadata ? 'eventId';
CREATE INDEX IF NOT EXISTS fashion_affinity_scores_rank_idx ON public.fashion_affinity_scores (user_id, dimension, score DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS fashion_dna_set_updated_at ON public.fashion_dna;
CREATE TRIGGER fashion_dna_set_updated_at BEFORE UPDATE ON public.fashion_dna FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.behavior_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fashion_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fashion_affinity_scores ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.behavior_events TO authenticated;
GRANT SELECT ON public.fashion_dna, public.fashion_affinity_scores TO authenticated;
DROP POLICY IF EXISTS "Users can insert their behavior events" ON public.behavior_events;
DROP POLICY IF EXISTS "Users can read their behavior events" ON public.behavior_events;
DROP POLICY IF EXISTS "Users can read their Fashion DNA" ON public.fashion_dna;
DROP POLICY IF EXISTS "Users can read their affinity scores" ON public.fashion_affinity_scores;
CREATE POLICY "Users can insert their behavior events" ON public.behavior_events FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can read their behavior events" ON public.behavior_events FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can read their Fashion DNA" ON public.fashion_dna FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can read their affinity scores" ON public.fashion_affinity_scores FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
