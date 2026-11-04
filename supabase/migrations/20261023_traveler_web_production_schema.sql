-- ==============================================================================
-- Traveler Web Production Schema Migration
-- Migration: Traveler Profiles, Preferences, Itineraries, Saved Places, Feedback
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    email TEXT,
    display_name TEXT,
    photo_url TEXT,
    role TEXT DEFAULT 'traveler',
    traveler_type TEXT DEFAULT 'solo',
    travel_pace TEXT DEFAULT 'balanced',
    budget_preference TEXT DEFAULT 'moderate',
    language TEXT DEFAULT 'en',
    interests TEXT[] DEFAULT '{}',
    accessibility TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS traveler_type TEXT DEFAULT 'solo';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS travel_pace TEXT DEFAULT 'balanced';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS budget_preference TEXT DEFAULT 'moderate';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS accessibility TEXT[] DEFAULT '{}';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 2. TRAVELER PREFERENCES
CREATE TABLE IF NOT EXISTS public.traveler_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    traveler_type TEXT DEFAULT 'solo',
    interests TEXT[] DEFAULT '{}',
    travel_pace TEXT DEFAULT 'balanced',
    budget_currency TEXT DEFAULT 'INR',
    budget_amount_per_person_per_day NUMERIC(10, 2),
    accessibility_requirements TEXT[] DEFAULT '{}',
    dietary_preferences TEXT[] DEFAULT '{}',
    preferred_start_time TIME DEFAULT '09:00:00',
    preferred_transport TEXT DEFAULT 'flexible',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. DESTINATIONS
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
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. ITINERARIES
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
    total_cost NUMERIC(10, 2) DEFAULT 0,
    total_experience_cost NUMERIC(10, 2) DEFAULT 0,
    estimated_transport_cost NUMERIC(10, 2) DEFAULT 0,
    status TEXT DEFAULT 'active',
    weather_summary JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    raw_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ITINERARY DAYS
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

-- 6. ITINERARY ITEMS
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
    price NUMERIC(10, 2) DEFAULT 0,
    distance_km NUMERIC(6, 2) DEFAULT 0,
    weather_rationale TEXT,
    image_url TEXT,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. SAVED PLACES
CREATE TABLE IF NOT EXISTS public.saved_places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    place_id TEXT NOT NULL,
    place_data JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, place_id)
);

-- 8. TRIP FEEDBACK
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

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traveler_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own preferences" ON public.traveler_preferences;
CREATE POLICY "Users can read own preferences" ON public.traveler_preferences FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Users can upsert own preferences" ON public.traveler_preferences;
CREATE POLICY "Users can upsert own preferences" ON public.traveler_preferences FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Public can view destinations" ON public.destinations;
CREATE POLICY "Public can view destinations" ON public.destinations FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Users can view own itineraries" ON public.itineraries;
CREATE POLICY "Users can view own itineraries" ON public.itineraries FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Users can create own itineraries" ON public.itineraries;
CREATE POLICY "Users can create own itineraries" ON public.itineraries FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Users can update own itineraries" ON public.itineraries;
CREATE POLICY "Users can update own itineraries" ON public.itineraries FOR UPDATE TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Users can delete own itineraries" ON public.itineraries;
CREATE POLICY "Users can delete own itineraries" ON public.itineraries FOR DELETE TO authenticated USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can view own itinerary days" ON public.itinerary_days;
CREATE POLICY "Users can view own itinerary days" ON public.itinerary_days FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.itineraries WHERE public.itineraries.id = public.itinerary_days.itinerary_id AND public.itineraries.user_id = auth.uid()::text)
);

DROP POLICY IF EXISTS "Users can view own itinerary items" ON public.itinerary_items;
CREATE POLICY "Users can view own itinerary items" ON public.itinerary_items FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.itineraries WHERE public.itineraries.id = public.itinerary_items.itinerary_id AND public.itineraries.user_id = auth.uid()::text)
);

DROP POLICY IF EXISTS "Users can manage own saved places" ON public.saved_places;
CREATE POLICY "Users can manage own saved places" ON public.saved_places FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can manage own feedback" ON public.trip_feedback;
CREATE POLICY "Users can manage own feedback" ON public.trip_feedback FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

CREATE INDEX IF NOT EXISTS idx_itineraries_user_id ON public.itineraries(user_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_start_date ON public.itineraries(start_date);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_itinerary_id ON public.itinerary_items(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_saved_places_user_id ON public.saved_places(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_feedback_user_id ON public.trip_feedback(user_id);
