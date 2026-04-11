-- FASE 2: Migration 007 — Row Level Security (RLS)
-- Enable RLS + policies for all tables

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Check if current user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = required_role
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is super_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is any admin (tier 1 or 2)
CREATE OR REPLACE FUNCTION public.is_any_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role LIKE '%admin%'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PUBLIC SCHEMA RLS
-- ============================================================

-- CITIES: public read, admin write
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cities_read" ON public.cities FOR SELECT USING (true);
CREATE POLICY "cities_admin" ON public.cities FOR ALL USING (public.is_admin());

-- PROFILES: own read/update, admin all
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_own_read" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_own_update" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_admin" ON public.profiles FOR ALL USING (public.is_admin());
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

-- USER_ROLES: admin only
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_own_read" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "roles_admin" ON public.user_roles FOR ALL USING (public.is_admin());

-- NOTIFICATIONS: own read
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_own" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_admin" ON public.notifications FOR ALL USING (public.is_any_admin());

-- NOTIFICATION_LOGS: admin only
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_logs_admin" ON public.notification_logs FOR ALL USING (public.is_any_admin());

-- AUDIT_LOGS: admin only
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_admin" ON public.audit_logs FOR ALL USING (public.is_admin());

-- FEATURE_FLAGS: public read, admin write
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags_read" ON public.feature_flags FOR SELECT USING (true);
CREATE POLICY "flags_admin" ON public.feature_flags FOR ALL USING (public.is_admin());

-- USER_ACTIVITY: own read, admin all
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_own" ON public.user_activity FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "activity_admin" ON public.user_activity FOR ALL USING (public.is_any_admin());

-- COMMISSION_LEDGER: operator own, admin all
ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commission_own" ON public.commission_ledger FOR SELECT USING (operator_id = auth.uid());
CREATE POLICY "commission_admin" ON public.commission_ledger FOR ALL USING (public.is_any_admin());

-- SETTLEMENTS: operator own, admin all
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settlement_own" ON public.settlements FOR SELECT USING (operator_id = auth.uid());
CREATE POLICY "settlement_admin" ON public.settlements FOR ALL USING (public.is_any_admin());

-- WEATHER_CACHE: public read, admin/service write
ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weather_read" ON public.weather_cache FOR SELECT USING (true);
CREATE POLICY "weather_admin" ON public.weather_cache FOR ALL USING (public.is_any_admin());

-- TICKER_ITEMS: public read active, admin all
ALTER TABLE public.ticker_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ticker_read" ON public.ticker_items FOR SELECT USING (is_active = true);
CREATE POLICY "ticker_admin" ON public.ticker_items FOR ALL USING (public.is_any_admin());

-- SYSTEM_HEALTH: admin only
ALTER TABLE public.system_health_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "health_admin" ON public.system_health_snapshots FOR ALL USING (public.is_admin());

-- OPERATOR_STREAKS: own read, admin all
ALTER TABLE public.operator_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streaks_own" ON public.operator_streaks FOR SELECT USING (operator_id = auth.uid());
CREATE POLICY "streaks_admin" ON public.operator_streaks FOR ALL USING (public.is_any_admin());

-- TRUST_SCORES: own read, admin all
ALTER TABLE public.trust_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trust_own" ON public.trust_scores FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "trust_admin" ON public.trust_scores FOR ALL USING (public.is_any_admin());

-- COMMUNITY_REPORTS: own + admin
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_own" ON public.community_reports FOR SELECT USING (reporter_id = auth.uid());
CREATE POLICY "reports_insert" ON public.community_reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "reports_admin" ON public.community_reports FOR ALL USING (public.is_any_admin());

-- FRAUD_FLAGS: admin only
ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fraud_admin" ON public.fraud_flags FOR ALL USING (public.is_any_admin());

-- APP_SETTINGS: public read, admin write
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_read" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "settings_admin" ON public.app_settings FOR ALL USING (public.is_admin());

-- ============================================================
-- CONTENT SCHEMA RLS
-- ============================================================

-- ARTICLES: public read published, admin/author all
ALTER TABLE content.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "articles_public" ON content.articles FOR SELECT USING (status = 'published');
CREATE POLICY "articles_author" ON content.articles FOR ALL USING (author_id = auth.uid());
CREATE POLICY "articles_admin" ON content.articles FOR ALL USING (public.has_role('admin_content') OR public.is_admin());

ALTER TABLE content.article_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "versions_admin" ON content.article_versions FOR ALL USING (public.has_role('admin_content') OR public.is_admin());

-- REPORTS: own + admin
ALTER TABLE content.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_insert" ON content.reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "reports_own" ON content.reports FOR SELECT USING (reporter_id = auth.uid());
CREATE POLICY "reports_admin" ON content.reports FOR ALL USING (public.has_role('admin_content') OR public.is_admin());

ALTER TABLE content.report_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report_updates_admin" ON content.report_updates FOR ALL USING (public.has_role('admin_content') OR public.is_admin());

ALTER TABLE content.moderation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "moderation_admin" ON content.moderation_logs FOR ALL USING (public.has_role('admin_content') OR public.is_admin());

ALTER TABLE content.takedown_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "takedown_admin" ON content.takedown_requests FOR ALL USING (public.has_role('admin_content') OR public.is_admin());

-- ============================================================
-- TRANSPORT SCHEMA RLS
-- ============================================================

-- PORTS & ROUTES: public read
ALTER TABLE transport.ports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ports_read" ON transport.ports FOR SELECT USING (true);
CREATE POLICY "ports_admin" ON transport.ports FOR ALL USING (public.has_role('admin_transport') OR public.is_admin());

ALTER TABLE transport.routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "routes_read" ON transport.routes FOR SELECT USING (true);
CREATE POLICY "routes_admin" ON transport.routes FOR ALL USING (public.has_role('admin_transport') OR public.is_admin());

-- OPERATORS: public read active, own update, admin all
ALTER TABLE transport.operators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "operators_public" ON transport.operators FOR SELECT USING (is_active = true);
CREATE POLICY "operators_own" ON transport.operators FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "operators_admin" ON transport.operators FOR ALL USING (public.has_role('admin_transport') OR public.is_admin());

-- QUEUE_ENTRIES: public read, operator manage own, admin all
ALTER TABLE transport.queue_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "queue_read" ON transport.queue_entries FOR SELECT USING (true);
CREATE POLICY "queue_operator" ON transport.queue_entries FOR ALL USING (
  operator_id IN (SELECT id FROM transport.operators WHERE user_id = auth.uid())
);
CREATE POLICY "queue_admin" ON transport.queue_entries FOR ALL USING (public.has_role('admin_transport') OR public.is_admin());

-- SEAT_CLAIMS: own + operator + admin
ALTER TABLE transport.seat_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "claims_own" ON transport.seat_claims FOR SELECT USING (passenger_id = auth.uid());
CREATE POLICY "claims_insert" ON transport.seat_claims FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "claims_operator" ON transport.seat_claims FOR ALL USING (
  queue_entry_id IN (
    SELECT qe.id FROM transport.queue_entries qe
    JOIN transport.operators op ON qe.operator_id = op.id
    WHERE op.user_id = auth.uid()
  )
);
CREATE POLICY "claims_admin" ON transport.seat_claims FOR ALL USING (public.has_role('admin_transport') OR public.is_admin());

-- CHARTERS
ALTER TABLE transport.charters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "charters_own" ON transport.charters FOR SELECT USING (requester_id = auth.uid());
CREATE POLICY "charters_insert" ON transport.charters FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "charters_admin" ON transport.charters FOR ALL USING (public.has_role('admin_transport') OR public.is_admin());

-- DEPARTURES: public read, admin write
ALTER TABLE transport.departures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departures_read" ON transport.departures FOR SELECT USING (true);
CREATE POLICY "departures_admin" ON transport.departures FOR ALL USING (public.has_role('admin_transport') OR public.is_admin());

-- FERRY
ALTER TABLE transport.ferry_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ferry_sched_read" ON transport.ferry_schedules FOR SELECT USING (true);
CREATE POLICY "ferry_sched_admin" ON transport.ferry_schedules FOR ALL USING (public.has_role('admin_transport') OR public.is_admin());

ALTER TABLE transport.ferry_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ferry_book_own" ON transport.ferry_bookings FOR SELECT USING (passenger_id = auth.uid());
CREATE POLICY "ferry_book_insert" ON transport.ferry_bookings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ferry_book_admin" ON transport.ferry_bookings FOR ALL USING (public.has_role('admin_transport') OR public.is_admin());

-- SHIP
ALTER TABLE transport.ship_vessels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ship_vessels_read" ON transport.ship_vessels FOR SELECT USING (true);
CREATE POLICY "ship_vessels_admin" ON transport.ship_vessels FOR ALL USING (public.has_role('admin_transport') OR public.is_admin());

ALTER TABLE transport.ship_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ship_routes_read" ON transport.ship_routes FOR SELECT USING (true);
CREATE POLICY "ship_routes_admin" ON transport.ship_routes FOR ALL USING (public.has_role('admin_transport') OR public.is_admin());

ALTER TABLE transport.ship_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ship_sched_read" ON transport.ship_schedules FOR SELECT USING (true);
CREATE POLICY "ship_sched_admin" ON transport.ship_schedules FOR ALL USING (public.has_role('admin_transport') OR public.is_admin());

ALTER TABLE transport.ship_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ship_book_own" ON transport.ship_bookings FOR SELECT USING (passenger_id = auth.uid());
CREATE POLICY "ship_book_insert" ON transport.ship_bookings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ship_book_admin" ON transport.ship_bookings FOR ALL USING (public.has_role('admin_transport') OR public.is_admin());

ALTER TABLE transport.ship_departures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ship_dep_read" ON transport.ship_departures FOR SELECT USING (true);
CREATE POLICY "ship_dep_admin" ON transport.ship_departures FOR ALL USING (public.has_role('admin_transport') OR public.is_admin());

-- PELNI
ALTER TABLE transport.pelni_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pelni_sched_read" ON transport.pelni_schedules FOR SELECT USING (true);
CREATE POLICY "pelni_sched_admin" ON transport.pelni_schedules FOR ALL USING (public.has_role('admin_transport') OR public.is_admin());

ALTER TABLE transport.pelni_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pelni_book_own" ON transport.pelni_bookings FOR SELECT USING (passenger_id = auth.uid());
CREATE POLICY "pelni_book_insert" ON transport.pelni_bookings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "pelni_book_admin" ON transport.pelni_bookings FOR ALL USING (public.has_role('admin_transport') OR public.is_admin());

-- ============================================================
-- LISTING SCHEMA RLS
-- ============================================================

-- LISTINGS: public read active, owner manage own
ALTER TABLE listing.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "listings_public" ON listing.listings FOR SELECT USING (status = 'active');
CREATE POLICY "listings_own" ON listing.listings FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "listings_insert" ON listing.listings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "listings_admin" ON listing.listings FOR ALL USING (public.has_role('admin_listing') OR public.is_admin());

-- REVIEWS: public read, own insert
ALTER TABLE listing.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_read" ON listing.reviews FOR SELECT USING (status = 'active');
CREATE POLICY "reviews_insert" ON listing.reviews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "reviews_own" ON listing.reviews FOR UPDATE USING (reviewer_id = auth.uid());
CREATE POLICY "reviews_admin" ON listing.reviews FOR ALL USING (public.has_role('admin_listing') OR public.is_admin());

-- SERVICE_CONTACTS: own + listing owner + admin
ALTER TABLE listing.service_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts_own" ON listing.service_contacts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "contacts_insert" ON listing.service_contacts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "contacts_owner" ON listing.service_contacts FOR SELECT USING (
  listing_id IN (SELECT id FROM listing.listings WHERE owner_id = auth.uid())
);
CREATE POLICY "contacts_admin" ON listing.service_contacts FOR ALL USING (public.has_role('admin_listing') OR public.is_admin());

-- ============================================================
-- FUNDING SCHEMA RLS
-- ============================================================

-- CAMPAIGNS: public read active, creator manage own
ALTER TABLE funding.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_public" ON funding.campaigns FOR SELECT USING (status = 'active' OR status = 'completed');
CREATE POLICY "campaigns_own" ON funding.campaigns FOR ALL USING (creator_id = auth.uid());
CREATE POLICY "campaigns_insert" ON funding.campaigns FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "campaigns_admin" ON funding.campaigns FOR ALL USING (public.has_role('admin_funding') OR public.is_admin());

-- DONATIONS: own + campaign creator read, insert for authenticated
ALTER TABLE funding.donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "donations_public" ON funding.donations FOR SELECT USING (
  verification_status = 'verified' AND (is_anonymous = false OR donor_id = auth.uid())
);
CREATE POLICY "donations_own" ON funding.donations FOR SELECT USING (donor_id = auth.uid());
CREATE POLICY "donations_insert" ON funding.donations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "donations_admin" ON funding.donations FOR ALL USING (public.has_role('admin_funding') OR public.is_admin());

-- USAGE_REPORTS: public read, creator manage
ALTER TABLE funding.usage_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usage_public" ON funding.usage_reports FOR SELECT USING (status = 'approved');
CREATE POLICY "usage_own" ON funding.usage_reports FOR ALL USING (submitted_by = auth.uid());
CREATE POLICY "usage_admin" ON funding.usage_reports FOR ALL USING (public.has_role('admin_funding') OR public.is_admin());
