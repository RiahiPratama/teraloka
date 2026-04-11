-- FASE 2: Migration 002 — Public Schema (18 tables)
-- cities, profiles, user_roles, notifications, notification_logs,
-- audit_logs, feature_flags, user_activity, commission_ledger,
-- settlements, weather_cache, ticker_items, system_health_snapshots,
-- operator_streaks, trust_scores, community_reports, fraud_flags, app_settings

-- ============================================================
-- 1. CITIES
-- ============================================================
CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  province TEXT NOT NULL DEFAULT 'Maluku Utara',
  is_hub BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.cities (name, slug, is_hub) VALUES
  ('Ternate', 'ternate', true),
  ('Tidore', 'tidore', false),
  ('Sofifi', 'sofifi', false),
  ('Jailolo', 'jailolo', false),
  ('Sidangoli', 'sidangoli', false),
  ('Tobelo', 'tobelo', false),
  ('Bacan', 'bacan', false),
  ('Morotai', 'morotai', false),
  ('Sanana', 'sanana', false);

-- ============================================================
-- 2. PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  city_id UUID REFERENCES public.cities(id),
  avatar_url TEXT,
  emergency_contact JSONB,
  -- emergency_contact: { name, phone, relationship }
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_phone ON public.profiles(phone);
CREATE INDEX idx_profiles_city ON public.profiles(city_id);

-- ============================================================
-- 3. USER_ROLES
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN (
    'super_admin',
    'admin_content', 'admin_transport', 'admin_listing', 'admin_funding',
    'operator_speed', 'operator_ship',
    'owner_listing', 'provider_service'
  )),
  service_scope TEXT, -- e.g. 'speed', 'content', 'listing'
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- ============================================================
-- 4. NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('wa', 'push', 'in_app')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);

-- ============================================================
-- 5. NOTIFICATION_LOGS
-- ============================================================
CREATE TABLE public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES public.notifications(id),
  channel TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'fonnte',
  phone TEXT,
  template TEXT,
  status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
  provider_response JSONB,
  retry_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_logs_status ON public.notification_logs(status);
CREATE INDEX idx_notif_logs_created ON public.notification_logs(created_at);

-- ============================================================
-- 6. AUDIT_LOGS
-- ============================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at);

-- ============================================================
-- 7. FEATURE_FLAGS
-- ============================================================
CREATE TABLE public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('speed_seat_claims', false, 'Enable BAPASIAR seat claim (Phase 1)'),
  ('basumbang', false, 'Enable BASUMBANG crowdfunding'),
  ('ppob', false, 'Enable PPOB bill payments'),
  ('events', false, 'Enable Tiket Event'),
  ('ship_booking', false, 'Enable Kapal Lokal booking'),
  ('ferry_booking', false, 'Enable Ferry booking'),
  ('pelni_booking', false, 'Enable Pelni booking'),
  ('edukazia_api', false, 'Enable EduKazia API integration');

-- ============================================================
-- 8. USER_ACTIVITY
-- ============================================================
CREATE TABLE public.user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_activity_user ON public.user_activity(user_id);
CREATE INDEX idx_user_activity_created ON public.user_activity(created_at);

-- ============================================================
-- 9. COMMISSION_LEDGER
-- ============================================================
CREATE TABLE public.commission_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL CHECK (service_type IN (
    'speed', 'ship', 'ferry', 'kos', 'properti', 'kendaraan', 'jasa', 'event'
  )),
  reference_id UUID NOT NULL,
  operator_id UUID REFERENCES auth.users(id),
  amount NUMERIC(12,0) NOT NULL,
  rate_type TEXT NOT NULL CHECK (rate_type IN ('flat', 'percentage', 'first_month')),
  rate_value NUMERIC(10,4) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled', 'cancelled')),
  settlement_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_commission_service ON public.commission_ledger(service_type);
CREATE INDEX idx_commission_operator ON public.commission_ledger(operator_id);
CREATE INDEX idx_commission_status ON public.commission_ledger(status);

-- ============================================================
-- 10. SETTLEMENTS
-- ============================================================
CREATE TABLE public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES auth.users(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_amount NUMERIC(12,0) NOT NULL,
  total_transactions INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'calculated' CHECK (status IN (
    'calculated', 'invoice_sent', 'paid', 'overdue'
  )),
  invoice_wa_sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  proof_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_settlements_operator ON public.settlements(operator_id);
CREATE INDEX idx_settlements_status ON public.settlements(status);

-- ============================================================
-- 11. WEATHER_CACHE
-- ============================================================
CREATE TABLE public.weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_key TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  risk_level TEXT CHECK (risk_level IN ('safe', 'warning', 'danger')),
  source TEXT NOT NULL DEFAULT 'bmkg',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_weather_location ON public.weather_cache(location_key);

-- ============================================================
-- 12. TICKER_ITEMS
-- ============================================================
CREATE TABLE public.ticker_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority TEXT NOT NULL CHECK (priority IN ('darurat', 'kemanusiaan', 'breaking', 'transport', 'promo')),
  text TEXT NOT NULL,
  link TEXT,
  source_type TEXT, -- 'manual', 'weather', 'transport', 'fundraising'
  source_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_ticker_active ON public.ticker_items(is_active, priority);

-- ============================================================
-- 13. SYSTEM_HEALTH_SNAPSHOTS
-- ============================================================
CREATE TABLE public.system_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL, -- 'supabase', 'vercel', 'upstash', 'fonnte', 'api'
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  response_time_ms INT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_service ON public.system_health_snapshots(service, created_at);

-- ============================================================
-- 14. OPERATOR_STREAKS
-- ============================================================
CREATE TABLE public.operator_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_active_date DATE,
  total_active_days INT NOT NULL DEFAULT 0,
  badges JSONB NOT NULL DEFAULT '[]',
  -- badges: [{ type: 'streak_7', earned_at: '...' }, ...]
  nudge_level TEXT CHECK (nudge_level IN ('none', 'gentle', 'warning', 'deactivate')),
  last_nudge_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(operator_id)
);

-- ============================================================
-- 15. TRUST_SCORES
-- ============================================================
CREATE TABLE public.trust_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  tier TEXT NOT NULL DEFAULT 'basic' CHECK (tier IN ('untrusted', 'basic', 'trusted', 'champion')),
  factors JSONB NOT NULL DEFAULT '{}',
  -- factors: { account_age, verified_phone, successful_transactions, reports_against, ... }
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_trust_tier ON public.trust_scores(tier);

-- ============================================================
-- 16. COMMUNITY_REPORTS
-- ============================================================
CREATE TABLE public.community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('listing', 'user', 'campaign', 'article')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'scam', 'inappropriate', 'spam', 'fake_photos', 'price_anomaly',
    'harassment', 'duplicate', 'other'
  )),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_reports_target ON public.community_reports(target_type, target_id);
CREATE INDEX idx_community_reports_status ON public.community_reports(status);

-- ============================================================
-- 17. FRAUD_FLAGS
-- ============================================================
CREATE TABLE public.fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('listing', 'campaign', 'user')),
  target_id UUID NOT NULL,
  flag_type TEXT NOT NULL CHECK (flag_type IN (
    'duplicate_photo', 'price_anomaly', 'suspicious_creator',
    'rapid_creation', 'beneficiary_mismatch', 'target_too_high', 'other'
  )),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details JSONB,
  auto_detected BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'confirmed', 'false_positive')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fraud_target ON public.fraud_flags(target_type, target_id);
CREATE INDEX idx_fraud_status ON public.fraud_flags(status, severity);

-- ============================================================
-- 18. APP_SETTINGS
-- ============================================================
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (key, value, description) VALUES
  ('maintenance_mode', 'false', 'Enable maintenance mode'),
  ('fonnte_balance_threshold', '50000', 'Alert when Fonnte balance below this'),
  ('settlement_cycle_day', '"monday"', 'Weekly settlement cycle day'),
  ('max_upload_size_mb', '5', 'Max image upload size in MB');
