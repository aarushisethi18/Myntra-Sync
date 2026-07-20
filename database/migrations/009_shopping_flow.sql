-- Alter products table to support rich catalog metadata
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS original_price INTEGER;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reviews INTEGER;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sizes TEXT[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS badge VARCHAR(100);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS colors TEXT[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS occasions TEXT[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fabrics TEXT[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS weather_suitability TEXT[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS festival_suitability TEXT[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS trend_tags TEXT[];

-- Create Wishlist Table
CREATE TABLE IF NOT EXISTS public.wishlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT wishlist_user_product_key UNIQUE (user_id, product_id)
);

-- Create Shopping Bag Table
CREATE TABLE IF NOT EXISTS public.bag (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    size VARCHAR(10) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT bag_user_product_size_key UNIQUE (user_id, product_id, size)
);

-- Create Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    size VARCHAR(10) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Processing',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bag ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlist TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bag TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;

-- RLS Policies
DROP POLICY IF EXISTS "Users can manage their own wishlist" ON public.wishlist;
CREATE POLICY "Users can manage their own wishlist" ON public.wishlist 
    FOR ALL TO authenticated 
    USING ((SELECT auth.uid()) = user_id) 
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage their own bag" ON public.bag;
CREATE POLICY "Users can manage their own bag" ON public.bag 
    FOR ALL TO authenticated 
    USING ((SELECT auth.uid()) = user_id) 
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage their own orders" ON public.orders;
CREATE POLICY "Users can manage their own orders" ON public.orders 
    FOR ALL TO authenticated 
    USING ((SELECT auth.uid()) = user_id) 
    WITH CHECK ((SELECT auth.uid()) = user_id);
