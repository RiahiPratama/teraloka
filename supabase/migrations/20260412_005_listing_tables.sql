-- FASE 2: Migration 005 — Listing Schema (3 tables)
-- listings (type discriminator: kos/properti/kendaraan/jasa),
-- reviews, service_contacts

-- ============================================================
-- 1. LISTINGS (unified — 4 types via `type` column)
-- ============================================================
CREATE TABLE listing.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('kos', 'properti', 'kendaraan', 'jasa')),
  source TEXT NOT NULL DEFAULT 'local' CHECK (source IN ('local', 'edukazia')),
  edukazia_id TEXT, -- external ID from EduKazia API

  -- Common fields
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  photos TEXT[] DEFAULT '{}',
  city_id UUID REFERENCES public.cities(id),
  address TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  phone TEXT, -- owner phone (NEVER shown in UI — anti-bypass)
  
  -- Pricing
  price NUMERIC(12,0), -- harga sewa/jual
  transaction_type TEXT CHECK (transaction_type IN ('sewa', 'jual', 'rental')),
  price_period TEXT CHECK (price_period IN ('bulan', 'hari', 'tahun', 'sekali')),

  -- BAKOS tier fields (auto-calculated from price)
  listing_tier TEXT CHECK (listing_tier IN ('ekonomi', 'menengah', 'premium')),
  listing_fee NUMERIC(10,0) NOT NULL DEFAULT 0, -- 0 / 100000 / 200000
  listing_fee_status TEXT NOT NULL DEFAULT 'free' CHECK (listing_fee_status IN ('free', 'active', 'expired', 'grace')),
  listing_fee_paid_until DATE,
  is_premium_upgrade BOOLEAN NOT NULL DEFAULT false, -- tier 2 opsional Rp 100k

  -- Kos-specific
  kos_type TEXT CHECK (kos_type IN ('putra', 'putri', 'campur')),
  facilities JSONB DEFAULT '[]', -- ["AC", "KM Dalam", "WiFi", "Laundry"]
  room_available INT,

  -- Properti-specific
  property_type TEXT CHECK (property_type IN ('rumah', 'tanah', 'ruko')),
  land_area_m2 NUMERIC(10,2),
  building_area_m2 NUMERIC(10,2),
  certificate_type TEXT, -- SHM, HGB, dll

  -- Kendaraan-specific
  vehicle_type TEXT CHECK (vehicle_type IN ('motor', 'mobil')),
  vehicle_brand TEXT,
  vehicle_year INT,
  vehicle_condition TEXT CHECK (vehicle_condition IN ('baru', 'bekas')),

  -- Jasa-specific
  service_category TEXT, -- 'laundry', 'tukang', 'service_ac', etc
  service_area TEXT, -- area jangkauan

  -- Status & metrics
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive', 'expired', 'suspended')),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  view_count INT NOT NULL DEFAULT 0,
  contact_count INT NOT NULL DEFAULT 0,
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count INT NOT NULL DEFAULT 0,
  stale_days INT NOT NULL DEFAULT 0,
  last_refreshed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listings_type ON listing.listings(type, status);
CREATE INDEX idx_listings_owner ON listing.listings(owner_id);
CREATE INDEX idx_listings_city ON listing.listings(city_id);
CREATE INDEX idx_listings_tier ON listing.listings(listing_tier) WHERE type = 'kos';
CREATE INDEX idx_listings_price ON listing.listings(price);
CREATE INDEX idx_listings_status ON listing.listings(status);
CREATE INDEX idx_listings_source ON listing.listings(source) WHERE source = 'edukazia';
CREATE INDEX idx_listings_slug ON listing.listings(slug);
CREATE INDEX idx_listings_service_cat ON listing.listings(service_category) WHERE type = 'jasa';

-- BAKOS search ordering: premium first, then premium-upgrade, then rest
CREATE INDEX idx_listings_kos_order ON listing.listings(
  listing_fee_status,
  listing_tier DESC,
  is_premium_upgrade DESC,
  rating_avg DESC,
  view_count DESC
) WHERE type = 'kos' AND status = 'active';

-- ============================================================
-- 2. REVIEWS
-- ============================================================
CREATE TABLE listing.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listing.listings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  photos TEXT[] DEFAULT '{}',
  is_verified_transaction BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'flagged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_id, reviewer_id)
);

CREATE INDEX idx_reviews_listing ON listing.reviews(listing_id);

-- ============================================================
-- 3. SERVICE_CONTACTS (WA relay tracking)
-- ============================================================
CREATE TABLE listing.service_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listing.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  tracking_code TEXT NOT NULL UNIQUE, -- "TL-KOS-0412", "TL-JASA-0412"
  contact_method TEXT NOT NULL DEFAULT 'wa_relay',
  followup_status TEXT DEFAULT 'pending' CHECK (followup_status IN (
    'pending', 'deal', 'not_deal', 'still_looking', 'no_response'
  )),
  followup_sent_at TIMESTAMPTZ,
  followup_responded_at TIMESTAMPTZ,
  owner_confirmed BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_contacts_listing ON listing.service_contacts(listing_id);
CREATE INDEX idx_service_contacts_user ON listing.service_contacts(user_id);
CREATE INDEX idx_service_contacts_followup ON listing.service_contacts(followup_status);
CREATE INDEX idx_service_contacts_code ON listing.service_contacts(tracking_code);
