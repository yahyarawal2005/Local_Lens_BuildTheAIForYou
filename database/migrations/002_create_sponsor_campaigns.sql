-- ==============================================================================
-- LocalLens: Sponsor Campaigns & Boosted Provider Listings
-- Table: sponsor_campagins (with alias view sponsor_campaigns)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.sponsor_campagins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    provider_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Adventure',
    description TEXT,
    image_url TEXT,
    price_inr NUMERIC(10, 2) NOT NULL DEFAULT 499.00,
    original_price NUMERIC(10, 2),
    rating NUMERIC(3, 2) DEFAULT 4.8,
    reviews_count INT DEFAULT 120,
    location VARCHAR(255) DEFAULT 'Panvel, Maharashtra',
    distance_km NUMERIC(5, 2) DEFAULT 3.5,
    duration VARCHAR(50) DEFAULT '2-3 hrs',
    badge_text VARCHAR(100) DEFAULT 'Sponsored Choice',
    boost_tier VARCHAR(100) DEFAULT 'Weekly Surge',
    is_active BOOLEAN DEFAULT TRUE,
    tags TEXT[] DEFAULT ARRAY['Local Favorite', 'Top Rated'],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Optional view for standard spelling compatibility
CREATE OR REPLACE VIEW public.sponsor_campaigns AS
SELECT * FROM public.sponsor_campagins;

-- Enable RLS
ALTER TABLE public.sponsor_campagins ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active sponsor campaigns
CREATE POLICY "Allow public read of active sponsor campaigns"
ON public.sponsor_campagins
FOR SELECT
USING (is_active = true);

-- Seed Sample Sponsor Campaigns
INSERT INTO public.sponsor_campagins (
    title,
    provider_name,
    category,
    description,
    image_url,
    price_inr,
    original_price,
    rating,
    reviews_count,
    location,
    distance_km,
    duration,
    badge_text,
    boost_tier,
    is_active,
    tags
) VALUES
(
    'Sunset Kayaking at Versova Cove',
    'SeaBreeze Adventures & Co.',
    'Adventure',
    'Exclusive 2-hour guided twilight paddle with safety gear, dry-bags, and hot cutting chai.',
    'assets/images/destinations/waterfall.png',
    1199.00,
    1699.00,
    4.9,
    142,
    'Versova Waters, Mumbai',
    4.8,
    '2.5 hrs',
    'Featured Partner',
    'Festival Surge',
    true,
    ARRAY['Kayaking', 'Sunset', 'Safety Certified']
),
(
    'Authentic Agri-Koli Seafood Thali Masterclass',
    'Anandi Mai’s Coastal Kitchen',
    'Food',
    'Taste authentic coastal delicacies with fresh surmai fry, crab masala, and sol kadhi tasting.',
    'assets/images/destinations/food_trail.png',
    650.00,
    850.00,
    4.9,
    218,
    'Old Panvel Harbor Road',
    2.1,
    '1.5 hrs',
    'Sponsored Choice',
    'Weekly Push',
    true,
    ARRAY['Culinary', 'Chef Curated', 'Fresh Catch']
),
(
    'Karnala Fortress Guided Eco-Trek & Birding',
    'Sahyadri Explorers Guild',
    'Nature',
    'Explore rare bird sanctuaries, 12th-century hill fort ruins, and lush canopy trails with a naturalist.',
    'assets/images/destinations/sunset_coast.png',
    499.00,
    750.00,
    4.8,
    384,
    'Karnala Bird Sanctuary, Panvel',
    9.5,
    '3.5 hrs',
    'Weekend Boost',
    'Weekend Spark',
    true,
    ARRAY['Eco-Trek', 'Bird Watching', 'Naturalist Guide']
),
(
    'Chhatrapati Heritage & Pottery Workshop',
    'Artisan Clay Studios & Heritage',
    'Culture',
    'Handcraft your own terracotta pot and tour historic 18th-century wada architecture with master artisans.',
    'assets/images/destinations/heritage_walk.png',
    550.00,
    700.00,
    4.7,
    96,
    'Heritage Lane, Old Panvel',
    1.4,
    '2.0 hrs',
    'Verified Provider',
    'Weekly Push',
    true,
    ARRAY['Hands-on Pottery', 'Culture', 'Take-Home Souvenir']
);
