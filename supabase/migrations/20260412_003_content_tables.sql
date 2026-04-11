-- FASE 2: Migration 003 — Content Schema (6 tables)
-- articles, article_versions, reports, report_updates,
-- moderation_logs, takedown_requests

-- ============================================================
-- 1. ARTICLES (BAKABAR)
-- ============================================================
CREATE TABLE content.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  body TEXT NOT NULL,
  cover_image_url TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'berita', 'politik', 'ekonomi', 'sosial', 'budaya',
    'olahraga', 'teknologi', 'kesehatan', 'pendidikan',
    'transportasi', 'cuaca', 'opini'
  )),
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  source TEXT, -- 'original', 'balapor', 'press_release'
  source_report_id UUID, -- link to BALAPOR report if applicable
  author_id UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ,
  view_count INT NOT NULL DEFAULT 0,
  city_id UUID REFERENCES public.cities(id),
  is_breaking BOOLEAN NOT NULL DEFAULT false,
  is_ticker BOOLEAN NOT NULL DEFAULT false,
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_articles_status ON content.articles(status, published_at DESC);
CREATE INDEX idx_articles_slug ON content.articles(slug);
CREATE INDEX idx_articles_category ON content.articles(category);
CREATE INDEX idx_articles_city ON content.articles(city_id);
CREATE INDEX idx_articles_author ON content.articles(author_id);
CREATE INDEX idx_articles_breaking ON content.articles(is_breaking) WHERE is_breaking = true;

-- ============================================================
-- 2. ARTICLE_VERSIONS (audit trail)
-- ============================================================
CREATE TABLE content.article_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES content.articles(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  edited_by UUID REFERENCES auth.users(id),
  change_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(article_id, version_number)
);

-- ============================================================
-- 3. REPORTS (BALAPOR)
-- ============================================================
CREATE TABLE content.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id),
  anonymity_level TEXT NOT NULL DEFAULT 'anonim' CHECK (anonymity_level IN ('anonim', 'pseudonym', 'nama_terang')),
  pseudonym TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'infrastruktur', 'layanan_publik', 'lingkungan', 'keamanan',
    'kesehatan', 'pendidikan', 'transportasi', 'lainnya'
  )),
  location TEXT,
  city_id UUID REFERENCES public.cities(id),
  photos TEXT[] DEFAULT '{}',
  risk_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'reviewing', 'verified', 'published', 'rejected', 'takedown'
  )),
  rejection_reason TEXT,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  linked_article_id UUID REFERENCES content.articles(id),
  tos_accepted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_status ON content.reports(status, risk_score DESC);
CREATE INDEX idx_reports_reporter ON content.reports(reporter_id);
CREATE INDEX idx_reports_city ON content.reports(city_id);

-- ============================================================
-- 4. REPORT_UPDATES
-- ============================================================
CREATE TABLE content.report_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES content.reports(id) ON DELETE CASCADE,
  update_type TEXT NOT NULL CHECK (update_type IN ('status_change', 'comment', 'escalation')),
  old_status TEXT,
  new_status TEXT,
  comment TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. MODERATION_LOGS
-- ============================================================
CREATE TABLE content.moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('article', 'report')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'approve', 'reject', 'flag', 'escalate', 'publish', 'unpublish', 'takedown'
  )),
  reason TEXT,
  moderator_id UUID REFERENCES auth.users(id),
  auto_moderated BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_moderation_entity ON content.moderation_logs(entity_type, entity_id);

-- ============================================================
-- 6. TAKEDOWN_REQUESTS
-- ============================================================
CREATE TABLE content.takedown_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES content.articles(id),
  report_id UUID REFERENCES content.reports(id),
  requester_name TEXT NOT NULL,
  requester_contact TEXT NOT NULL,
  reason TEXT NOT NULL,
  legal_basis TEXT, -- e.g. 'UU ITE Pasal 27'
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'reviewing', 'approved', 'rejected'
  )),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_takedown_status ON content.takedown_requests(status, deadline);
