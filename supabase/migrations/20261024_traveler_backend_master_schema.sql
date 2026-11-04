-- ==============================================================================
-- Traveler Web & Master Backend Production Schema Migration
-- Migration: Complete Production Schema for LocalLens / Traveler Companion
-- Tables: profiles, traveler_preferences, destinations, experiences,
--         experience_images, experience_categories, itineraries,
--         itinerary_days, itinerary_items, saved_places, trip_feedback,
--         recommendation_feedback, weather_cache, notifications
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    email TEXT,
    display_name TEXT,
    photo_url TEXT,
    role TEXT DEFAULT 'traveler',
    traveler_type TEXT DEFAULT 'solo',
    travel_pace TEXT DEFAULT 'balanced',
    budget_preference TEXT DEFAULT 'moderate',
    preferred_currency TEXT DEFAULT 'INR',
    language TEXT DEFAULT 'en',
    interests TEXT[] DEFAULT '{}',
    accessibility TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. TRAVELER PREFERENCES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.traveler_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    traveler_type TEXT DEFAULT 'solo',
    interests TEXT[] DEFAULT '{}',
    travel_pace TEXT DEFAULT 'balanced',
    budget_currency TEXT DEFAULT 'INR',
    budget_amount_per_person_per_day NUMERIC(10, 2) DEFAULT 2500.00,
    accessibility_requirements TEXT[] DEFAULT '{}',
    dietary_preferences TEXT[] DEFAULT '{}',
    preferred_activity_categories TEXT[] DEFAULT '{}',
    preferred_start_time TIME DEFAULT '09:00:00',
    preferred_transport TEXT DEFAULT 'flexible',
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. DESTINATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    normalized_name TEXT NOT NULL,
    state TEXT,
    country TEXT DEFAULT 'India',
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    timezone TEXT DEFAULT 'Asia/Kolkata',
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    provider TEXT DEFAULT 'nominatim',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 4. EXPERIENCE CATEGORIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.experience_categories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 5. EXPERIENCES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.experiences (
    experience_id TEXT PRIMARY KEY,
    id TEXT UNIQUE,
    provider_id TEXT DEFAULT 'admin',
    experience_name TEXT NOT NULL,
    category TEXT NOT NULL,
    sub_category TEXT,
    city TEXT NOT NULL,
    district TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    location TEXT,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    description TEXT,
    tags TEXT,
    price_inr NUMERIC(10, 2) DEFAULT 0.0,
    currency TEXT DEFAULT 'INR',
    duration_hours NUMERIC(4, 2) DEFAULT 1.0,
    duration_minutes INT DEFAULT 60,
    rating NUMERIC(3, 2) DEFAULT 4.8,
    review_count INT DEFAULT 120,
    image_url TEXT,
    indoor_outdoor TEXT DEFAULT 'Flexible',
    weather_suitability TEXT,
    opening_hours TEXT DEFAULT '09:00 AM - 08:00 PM',
    best_for TEXT,
    accessibility TEXT[] DEFAULT '{}',
    local_experience BOOLEAN DEFAULT true,
    hidden_gem BOOLEAN DEFAULT false,
    booking_required BOOLEAN DEFAULT false,
    verification_status TEXT DEFAULT 'verified',
    source TEXT DEFAULT 'curated',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 6. EXPERIENCE IMAGES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.experience_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experience_id TEXT NOT NULL REFERENCES public.experiences(experience_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    is_primary BOOLEAN DEFAULT false,
    attribution TEXT,
    source TEXT DEFAULT 'unsplash',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 7. ITINERARIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.itineraries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    destination_name TEXT NOT NULL,
    destination_coords JSONB,
    start_date DATE NOT NULL,
    days_count INT DEFAULT 1,
    pace TEXT DEFAULT 'balanced',
    traveler_type TEXT DEFAULT 'solo',
    interests TEXT[] DEFAULT '{}',
    budget JSONB DEFAULT '{}',
    total_cost NUMERIC(10, 2) DEFAULT 0.0,
    total_experience_cost NUMERIC(10, 2) DEFAULT 0.0,
    estimated_transport_cost NUMERIC(10, 2) DEFAULT 0.0,
    total_duration_minutes INT DEFAULT 360,
    status TEXT DEFAULT 'active',
    weather_summary JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    raw_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 8. ITINERARY DAYS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.itinerary_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerary_id TEXT NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
    day_number INT NOT NULL,
    date DATE NOT NULL,
    weather_summary JSONB DEFAULT '{}',
    title TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (itinerary_id, day_number)
);

-- ------------------------------------------------------------------------------
-- 9. ITINERARY ITEMS (ACTIVITIES) TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.itinerary_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerary_id TEXT NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
    itinerary_day_id UUID REFERENCES public.itinerary_days(id) ON DELETE CASCADE,
    place_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    sub_category TEXT,
    location TEXT,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    sequence_order INT NOT NULL DEFAULT 1,
    start_time TEXT,
    end_time TEXT,
    duration_minutes INT DEFAULT 60,
    price NUMERIC(10, 2) DEFAULT 0.0,
    distance_km NUMERIC(6, 2) DEFAULT 0.0,
    weather_rationale TEXT,
    image_url TEXT,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 10. SAVED PLACES (WISHLIST) TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    place_id TEXT NOT NULL,
    place_data JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, place_id)
);

-- ------------------------------------------------------------------------------
-- 11. TRIP FEEDBACK TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trip_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    itinerary_id TEXT,
    place_id TEXT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    feedback_type TEXT DEFAULT 'general',
    comments TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 12. RECOMMENDATION FEEDBACK TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recommendation_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    place_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('like', 'dislike', 'bookmark', 'view', 'skip')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 13. WEATHER CACHE TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weather_cache (
    cache_key TEXT PRIMARY KEY,
    destination TEXT,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    forecast_data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 14. NOTIFICATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT DEFAULT 'trip_update',
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traveler_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone authenticated can read/write their own profile; public read for display
DROP POLICY IF EXISTS "Users can read profiles" ON public.profiles;
CREATE POLICY "Users can read profiles" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
CREATE POLICY "Users can manage own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid()::text = id) WITH CHECK (auth.uid()::text = id);

-- Preferences: Private to owner
DROP POLICY IF EXISTS "Users can view own preferences" ON public.traveler_preferences;
CREATE POLICY "Users can view own preferences" ON public.traveler_preferences FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Users can manage own preferences" ON public.traveler_preferences;
CREATE POLICY "Users can manage own preferences" ON public.traveler_preferences FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- Destinations & Experiences: Publicly viewable
DROP POLICY IF EXISTS "Public can view destinations" ON public.destinations;
CREATE POLICY "Public can view destinations" ON public.destinations FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "Public can view experiences" ON public.experiences;
CREATE POLICY "Public can view experiences" ON public.experiences FOR SELECT TO anon, authenticated USING (verification_status = 'verified');
DROP POLICY IF EXISTS "Public can view experience images" ON public.experience_images;
CREATE POLICY "Public can view experience images" ON public.experience_images FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public can view categories" ON public.experience_categories;
CREATE POLICY "Public can view categories" ON public.experience_categories FOR SELECT TO anon, authenticated USING (is_active = true);

-- Itineraries: Private to owner
DROP POLICY IF EXISTS "Users can manage own itineraries" ON public.itineraries;
CREATE POLICY "Users can manage own itineraries" ON public.itineraries FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Users can view own itinerary days" ON public.itinerary_days;
CREATE POLICY "Users can view own itinerary days" ON public.itinerary_days FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.itineraries WHERE public.itineraries.id = public.itinerary_days.itinerary_id AND public.itineraries.user_id = auth.uid()::text)
);
DROP POLICY IF EXISTS "Users can view own itinerary items" ON public.itinerary_items;
CREATE POLICY "Users can view own itinerary items" ON public.itinerary_items FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.itineraries WHERE public.itineraries.id = public.itinerary_items.itinerary_id AND public.itineraries.user_id = auth.uid()::text)
);

-- Saved Places: Private to owner
DROP POLICY IF EXISTS "Users can manage own saved places" ON public.saved_places;
CREATE POLICY "Users can manage own saved places" ON public.saved_places FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- Feedback & Notifications: Private to owner
DROP POLICY IF EXISTS "Users can manage own feedback" ON public.trip_feedback;
CREATE POLICY "Users can manage own feedback" ON public.trip_feedback FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Users can manage recommendation feedback" ON public.recommendation_feedback;
CREATE POLICY "Users can manage recommendation feedback" ON public.recommendation_feedback FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notifications;
CREATE POLICY "Users can manage own notifications" ON public.notifications FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- Indexes for high-throughput querying
CREATE INDEX IF NOT EXISTS idx_itineraries_user ON public.itineraries(user_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_start_date ON public.itineraries(start_date);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_itinerary ON public.itinerary_items(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_experiences_city ON public.experiences(city);
CREATE INDEX IF NOT EXISTS idx_experiences_category ON public.experiences(category);
CREATE INDEX IF NOT EXISTS idx_experiences_coords ON public.experiences(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_saved_places_user ON public.saved_places(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_feedback_user ON public.trip_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_weather_cache_expires ON public.weather_cache(expires_at);
