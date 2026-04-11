-- FASE 2: Migration 008 — Triggers & Functions

-- ============================================================
-- AUTO updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_operators_updated_at BEFORE UPDATE ON transport.operators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_queue_updated_at BEFORE UPDATE ON transport.queue_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_charters_updated_at BEFORE UPDATE ON transport.charters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_articles_updated_at BEFORE UPDATE ON content.articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_reports_updated_at BEFORE UPDATE ON content.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_listings_updated_at BEFORE UPDATE ON listing.listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON funding.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_streaks_updated_at BEFORE UPDATE ON public.operator_streaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_flags_updated_at BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- AUTO-CALCULATE BAKOS TIER from price
-- ============================================================
CREATE OR REPLACE FUNCTION listing.calculate_kos_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'kos' AND NEW.price IS NOT NULL THEN
    IF NEW.price <= 800000 THEN
      NEW.listing_tier = 'ekonomi';
      NEW.listing_fee = 0;
    ELSIF NEW.price <= 1500000 THEN
      NEW.listing_tier = 'menengah';
      -- Fee 0 by default, 100k if premium upgrade
      IF NEW.is_premium_upgrade = true THEN
        NEW.listing_fee = 100000;
      ELSE
        NEW.listing_fee = 0;
      END IF;
    ELSE
      NEW.listing_tier = 'premium';
      NEW.listing_fee = 200000;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_kos_tier
  BEFORE INSERT OR UPDATE OF price, is_premium_upgrade ON listing.listings
  FOR EACH ROW EXECUTE FUNCTION listing.calculate_kos_tier();

-- ============================================================
-- AUTO-UPDATE listing rating on review insert/update
-- ============================================================
CREATE OR REPLACE FUNCTION listing.update_listing_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE listing.listings SET
    rating_avg = (SELECT COALESCE(AVG(rating), 0) FROM listing.reviews WHERE listing_id = NEW.listing_id AND status = 'active'),
    rating_count = (SELECT COUNT(*) FROM listing.reviews WHERE listing_id = NEW.listing_id AND status = 'active')
  WHERE id = NEW.listing_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_review_rating
  AFTER INSERT OR UPDATE OR DELETE ON listing.reviews
  FOR EACH ROW EXECUTE FUNCTION listing.update_listing_rating();

-- ============================================================
-- AUTO-UPDATE campaign collected_amount on donation verified
-- ============================================================
CREATE OR REPLACE FUNCTION funding.update_campaign_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_status = 'verified' THEN
    UPDATE funding.campaigns SET
      collected_amount = (
        SELECT COALESCE(SUM(amount), 0) FROM funding.donations
        WHERE campaign_id = NEW.campaign_id AND verification_status = 'verified'
      ),
      donor_count = (
        SELECT COUNT(DISTINCT donor_id) FROM funding.donations
        WHERE campaign_id = NEW.campaign_id AND verification_status = 'verified'
      )
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_donation_amount
  AFTER INSERT OR UPDATE OF verification_status ON funding.donations
  FOR EACH ROW EXECUTE FUNCTION funding.update_campaign_amount();

-- ============================================================
-- AUTO-INCREMENT contact_count on service_contacts insert
-- ============================================================
CREATE OR REPLACE FUNCTION listing.increment_contact_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE listing.listings SET contact_count = contact_count + 1
  WHERE id = NEW.listing_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contact_count
  AFTER INSERT ON listing.service_contacts
  FOR EACH ROW EXECUTE FUNCTION listing.increment_contact_count();

-- ============================================================
-- GRANT SCHEMA ACCESS to Supabase roles
-- ============================================================
GRANT USAGE ON SCHEMA content TO anon, authenticated;
GRANT USAGE ON SCHEMA transport TO anon, authenticated;
GRANT USAGE ON SCHEMA listing TO anon, authenticated;
GRANT USAGE ON SCHEMA funding TO anon, authenticated;

GRANT SELECT ON ALL TABLES IN SCHEMA content TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA transport TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA listing TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA funding TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA content TO authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA transport TO authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA listing TO authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA funding TO authenticated;
