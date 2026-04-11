-- FASE 2: Migration 006 — Funding Schema (3 tables)
-- campaigns, donations, usage_reports

-- ============================================================
-- 1. CAMPAIGNS (BASUMBANG — MURNI KEMANUSIAAN)
-- ============================================================
CREATE TABLE funding.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'kesehatan', 'bencana', 'duka', 'anak_yatim', 'lansia', 'hunian_darurat'
  )),
  beneficiary_name TEXT NOT NULL,
  beneficiary_relation TEXT NOT NULL,
  beneficiary_id_photo_url TEXT, -- KTP
  proof_documents TEXT[] DEFAULT '{}', -- bukti kebutuhan

  target_amount NUMERIC(12,0) NOT NULL,
  collected_amount NUMERIC(12,0) NOT NULL DEFAULT 0,
  donor_count INT NOT NULL DEFAULT 0,

  bank_name TEXT NOT NULL,
  bank_account_number TEXT NOT NULL,
  bank_account_name TEXT NOT NULL,
  -- REKENING TERPISAH: "TeraLoka BASUMBANG"

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_review', 'active', 'completed', 'closed', 'suspended'
  )),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,

  city_id UUID REFERENCES public.cities(id),
  cover_image_url TEXT,
  deadline DATE,
  is_urgent BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_status ON funding.campaigns(status);
CREATE INDEX idx_campaigns_category ON funding.campaigns(category);
CREATE INDEX idx_campaigns_creator ON funding.campaigns(creator_id);
CREATE INDEX idx_campaigns_slug ON funding.campaigns(slug);

-- ============================================================
-- 2. DONATIONS (transfer bank, bukan payment gateway)
-- ============================================================
CREATE TABLE funding.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES funding.campaigns(id),
  donor_id UUID REFERENCES auth.users(id),
  donor_name TEXT NOT NULL,
  donor_phone TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,

  amount NUMERIC(12,0) NOT NULL,
  operational_fee NUMERIC(10,0) NOT NULL DEFAULT 0,
  -- operational_fee: Rp 2.000 / 5.000 / 10.000 (ADDED on top, bukan dipotong)
  total_transfer NUMERIC(12,0) NOT NULL,
  -- total_transfer = amount + operational_fee

  donation_code TEXT NOT NULL UNIQUE,
  -- e.g. "BS-240412-001" — untuk verifikasi transfer masuk

  transfer_proof_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN (
    'pending', 'verified', 'rejected', 'expired'
  )),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_donations_campaign ON funding.donations(campaign_id);
CREATE INDEX idx_donations_donor ON funding.donations(donor_id);
CREATE INDEX idx_donations_status ON funding.donations(verification_status);
CREATE INDEX idx_donations_code ON funding.donations(donation_code);

-- ============================================================
-- 3. USAGE_REPORTS (laporan penggunaan dana — WAJIB)
-- ============================================================
CREATE TABLE funding.usage_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES funding.campaigns(id),
  report_number INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_used NUMERIC(12,0) NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  -- items: [{ description: "Biaya operasi", amount: 5000000, receipt_url: "..." }]
  proof_photos TEXT[] DEFAULT '{}',
  submitted_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'revision_needed')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, report_number)
);

CREATE INDEX idx_usage_reports_campaign ON funding.usage_reports(campaign_id);
