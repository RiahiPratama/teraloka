import { createClient } from '@/lib/supabase/server';

/**
 * Fraud Engine — Listing scam detection, trust score, BASUMBANG fraud
 * WAJIB live SEBELUM BASUMBANG launch
 */

// ============================================================
// Listing scam detection
// ============================================================
export async function detectListingFraud(listingId: string) {
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .single();

  if (!listing) return [];

  const flags: { type: string; severity: string; details: string }[] = [];

  // Price anomaly: kos < 200k or > 5jt (extreme for Ternate)
  if (listing.type === 'kos' && listing.price) {
    if (listing.price < 200_000) {
      flags.push({ type: 'price_anomaly', severity: 'high', details: `Harga terlalu murah: ${listing.price}` });
    }
    if (listing.price > 5_000_000) {
      flags.push({ type: 'price_anomaly', severity: 'medium', details: `Harga tidak wajar: ${listing.price}` });
    }
  }

  // Rapid creation: same owner > 5 listings in 24h
  const { count } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', listing.owner_id)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if ((count ?? 0) > 5) {
    flags.push({ type: 'rapid_creation', severity: 'high', details: `${count} listing dalam 24 jam` });
  }

  // Save fraud flags
  for (const flag of flags) {
    await supabase.from('fraud_flags').insert({
      target_type: 'listing',
      target_id: listingId,
      flag_type: flag.type,
      severity: flag.severity,
      details: { message: flag.details },
      auto_detected: true,
    });
  }

  return flags;
}

// ============================================================
// Update trust score
// ============================================================
export async function updateTrustScore(userId: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('created_at, is_verified')
    .eq('id', userId)
    .single();

  // Factors
  const accountAgeDays = profile
    ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000)
    : 0;

  const { count: reportCount } = await supabase
    .from('community_reports')
    .select('id', { count: 'exact', head: true })
    .eq('target_type', 'user')
    .eq('target_id', userId)
    .neq('status', 'dismissed');

  const factors = {
    account_age: accountAgeDays,
    verified_phone: profile?.is_verified || false,
    reports_against: reportCount ?? 0,
  };

  // Calculate score (0-100)
  let score = 50;
  if (factors.verified_phone) score += 15;
  if (factors.account_age > 30) score += 10;
  if (factors.account_age > 90) score += 5;
  score -= (factors.reports_against * 10);
  score = Math.max(0, Math.min(100, score));

  // Determine tier
  const tier =
    score >= 80 ? 'champion' :
    score >= 60 ? 'trusted' :
    score >= 30 ? 'basic' : 'untrusted';

  await supabase.from('trust_scores').upsert({
    user_id: userId,
    score,
    tier,
    factors,
    updated_at: new Date().toISOString(),
  });

  return { score, tier };
}
