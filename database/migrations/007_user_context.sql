-- One current context record per authenticated Supabase user.
CREATE TABLE IF NOT EXISTS public.user_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    city TEXT,
    state TEXT,
    country TEXT,
    temperature DOUBLE PRECISION,
    weather_condition TEXT,
    humidity INTEGER,
    wind_speed DOUBLE PRECISION,
    current_season TEXT,
    current_festival TEXT,
    festival_days_remaining INTEGER,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_context ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.user_context TO authenticated;
CREATE POLICY "Users can read their own context" ON public.user_context FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert their own context" ON public.user_context FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update their own context" ON public.user_context FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
