-- Blend flagship feature tables: shared closet, outfit voting, shared wishlist.
-- Extends blend_sessions with identity, caching, and freshness columns.

-- ─── Extend blend_sessions ───────────────────────────────────────────────────
ALTER TABLE public.blend_sessions
    ADD COLUMN IF NOT EXISTS blend_name        VARCHAR(80),
    ADD COLUMN IF NOT EXISTS blend_description TEXT,
    ADD COLUMN IF NOT EXISTS compatibility_score INTEGER,
    ADD COLUMN IF NOT EXISTS last_opened_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_computed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cached_result    JSONB;

-- ─── Shared Closet ────────────────────────────────────────────────────────────
-- Outfits that either member "saves" during a Blend session.
CREATE TABLE IF NOT EXISTS public.blend_shared_closet (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES public.blend_sessions(id) ON DELETE CASCADE,
    product_id  UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,   -- snapshot of product at save time
    occasion    VARCHAR(80),
    saved_by    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT blend_shared_closet_session_product_key UNIQUE (session_id, product_id)
);

CREATE INDEX IF NOT EXISTS blend_shared_closet_session_idx ON public.blend_shared_closet (session_id, created_at DESC);

-- ─── Outfit Votes ────────────────────────────────────────────────────────────
-- Per-user, per-outfit vote within a Blend session.
CREATE TABLE IF NOT EXISTS public.blend_outfit_votes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES public.blend_sessions(id) ON DELETE CASCADE,
    outfit_key  VARCHAR(160) NOT NULL,           -- outfit.id from engine response
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote        VARCHAR(20) NOT NULL CHECK (vote IN ('love', 'wear_soon', 'skip')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT blend_outfit_votes_session_outfit_user_key UNIQUE (session_id, outfit_key, user_id)
);

CREATE INDEX IF NOT EXISTS blend_outfit_votes_session_idx ON public.blend_outfit_votes (session_id, outfit_key);

DROP TRIGGER IF EXISTS blend_outfit_votes_set_updated_at ON public.blend_outfit_votes;
CREATE TRIGGER blend_outfit_votes_set_updated_at
    BEFORE UPDATE ON public.blend_outfit_votes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Shared Wishlist ─────────────────────────────────────────────────────────
-- AI-recommended products for both Blend members to co-explore.
CREATE TABLE IF NOT EXISTS public.blend_shared_wishlist (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES public.blend_sessions(id) ON DELETE CASCADE,
    product_id  UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    ai_reason   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT blend_shared_wishlist_session_product_key UNIQUE (session_id, product_id)
);

CREATE INDEX IF NOT EXISTS blend_shared_wishlist_session_idx ON public.blend_shared_wishlist (session_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.blend_shared_closet   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blend_outfit_votes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blend_shared_wishlist ENABLE ROW LEVEL SECURITY;

-- Helper function: returns TRUE when the current user is a member of the session.
CREATE OR REPLACE FUNCTION public.is_blend_member(p_session_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.blend_sessions
        WHERE id = p_session_id
          AND (created_by = auth.uid() OR joined_by = auth.uid())
    );
$$;

-- blend_shared_closet
DROP POLICY IF EXISTS "Blend members can read shared closet"  ON public.blend_shared_closet;
DROP POLICY IF EXISTS "Blend members can insert shared closet" ON public.blend_shared_closet;
DROP POLICY IF EXISTS "Saver can delete shared closet"        ON public.blend_shared_closet;

CREATE POLICY "Blend members can read shared closet"
    ON public.blend_shared_closet FOR SELECT TO authenticated
    USING (public.is_blend_member(session_id));

CREATE POLICY "Blend members can insert shared closet"
    ON public.blend_shared_closet FOR INSERT TO authenticated
    WITH CHECK (public.is_blend_member(session_id) AND saved_by = auth.uid());

CREATE POLICY "Saver can delete shared closet"
    ON public.blend_shared_closet FOR DELETE TO authenticated
    USING (saved_by = auth.uid());

-- blend_outfit_votes
DROP POLICY IF EXISTS "Blend members can read votes"    ON public.blend_outfit_votes;
DROP POLICY IF EXISTS "Blend members can upsert votes"  ON public.blend_outfit_votes;

CREATE POLICY "Blend members can read votes"
    ON public.blend_outfit_votes FOR SELECT TO authenticated
    USING (public.is_blend_member(session_id));

CREATE POLICY "Blend members can upsert votes"
    ON public.blend_outfit_votes FOR ALL TO authenticated
    USING (public.is_blend_member(session_id) AND user_id = auth.uid())
    WITH CHECK (public.is_blend_member(session_id) AND user_id = auth.uid());

-- blend_shared_wishlist
DROP POLICY IF EXISTS "Blend members can read shared wishlist" ON public.blend_shared_wishlist;
DROP POLICY IF EXISTS "Blend members can insert shared wishlist" ON public.blend_shared_wishlist;

CREATE POLICY "Blend members can read shared wishlist"
    ON public.blend_shared_wishlist FOR SELECT TO authenticated
    USING (public.is_blend_member(session_id));

CREATE POLICY "Blend members can insert shared wishlist"
    ON public.blend_shared_wishlist FOR INSERT TO authenticated
    WITH CHECK (public.is_blend_member(session_id));

-- Grant permissions to authenticated role
GRANT SELECT, INSERT, DELETE ON public.blend_shared_closet   TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.blend_outfit_votes    TO authenticated;
GRANT SELECT, INSERT         ON public.blend_shared_wishlist TO authenticated;
