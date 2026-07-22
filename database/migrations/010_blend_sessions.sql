-- Blend persists collaboration state, never generated fashion intelligence.
-- Compatibility, outfits, explanations and moodboards are recomputed from the
-- latest pair of Context snapshots whenever a Blend is requested.
CREATE TABLE IF NOT EXISTS blend_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invite_code VARCHAR(32) NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'joined', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT blend_session_different_members CHECK (joined_by IS NULL OR joined_by <> created_by)
);

CREATE INDEX IF NOT EXISTS blend_sessions_created_by_idx ON blend_sessions (created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS blend_sessions_joined_by_idx ON blend_sessions (joined_by, created_at DESC);

CREATE OR REPLACE FUNCTION touch_blend_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blend_sessions_touch_updated_at ON blend_sessions;
CREATE TRIGGER blend_sessions_touch_updated_at
BEFORE UPDATE ON blend_sessions
FOR EACH ROW EXECUTE FUNCTION touch_blend_session_updated_at();
