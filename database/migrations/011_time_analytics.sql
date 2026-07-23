-- Lightweight, session-aware fields for Time Analytics. behavior_events already
-- backs the behavior engine, so extending it keeps one source of truth.
ALTER TABLE public.behavior_events
    ADD COLUMN IF NOT EXISTS session_id TEXT,
    ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

ALTER TABLE public.behavior_events
    ADD CONSTRAINT behavior_events_duration_seconds_nonnegative
    CHECK (duration_seconds IS NULL OR duration_seconds >= 0) NOT VALID;

CREATE INDEX IF NOT EXISTS behavior_events_analytics_category_idx
    ON public.behavior_events (user_id, category, created_at DESC)
    WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS behavior_events_analytics_brand_idx
    ON public.behavior_events (user_id, brand, created_at DESC)
    WHERE brand IS NOT NULL;
