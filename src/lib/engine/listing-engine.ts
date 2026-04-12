import { createClient } from '@/lib/supabase/server';
import { getListingTier } from '@/lib/domain/listing-rules';

/**
 * Listing Engine — Lifecycle, tier calculation, search, filter
 * Shared across BAKOS, Properti, Kendaraan, Jasa
 */

// ============================================================
// PUBLIC: Search listings
// ============================================================
export async function searchListings(params: {
  type: 'kos' | 'properti' | 'kendaraan' | 'jasa';
  page?: number;
  limit?: number;
  city_id?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  category?: string; // jasa only
  transaction_type?: string; // properti/kendaraan
}) {
  const { type, page = 1, limit = 20, city_id, minPrice, maxPrice, search, category, transaction_type } = params;
  const supabase = await createClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from('listings')
    .select('id, title, slug, photos, price, price_period, transaction_type, city_id, address, listing_tier, listing_fee_status, is_premium_upgrade, rating_avg, rating_count, view_count, contact_count, kos_type, facilities, property_type, vehicle_type, vehicle_brand, service_category, source, created_at', { count: 'exact' })
    .eq('type', type)
    .eq('status', 'active');

  if (city_id) query = query.eq('city_id', city_id);
  if (minPrice) query = query.gte('price', minPrice);
  if (maxPrice) query = query.lte('price', maxPrice);
  if (search) query = query.ilike('title', `%${search}%`);
  if (category) query = query.eq('service_category', category);
  if (transaction_type) query = query.eq('transaction_type', transaction_type);

  // BAKOS ordering: premium first
  if (type === 'kos') {
    query = query
      .order('listing_tier', { ascending: false }) // premium > menengah > ekonomi
      .order('is_premium_upgrade', { ascending: false })
      .order('rating_avg', { ascending: false })
      .order('created_at', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  return { data: data ?? [], total: count ?? 0, page, limit };
}

// ============================================================
// PUBLIC: Get listing detail
// ============================================================
export async function getListingBySlug(slug: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (error) return null;

  // Increment view
  supabase.from('listings').update({ view_count: (data.view_count || 0) + 1 }).eq('id', data.id).then(() => {});

  return data;
}

// ============================================================
// OWNER: Create listing
// ============================================================
export async function createListing(listing: {
  owner_id: string;
  type: 'kos' | 'properti' | 'kendaraan' | 'jasa';
  title: string;
  description?: string;
  photos?: string[];
  city_id?: string;
  address?: string;
  price?: number;
  transaction_type?: string;
  price_period?: string;
  phone: string;
  // Type-specific
  kos_type?: string;
  facilities?: string[];
  room_available?: number;
  property_type?: string;
  land_area_m2?: number;
  building_area_m2?: number;
  vehicle_type?: string;
  vehicle_brand?: string;
  vehicle_year?: number;
  vehicle_condition?: string;
  service_category?: string;
  service_area?: string;
}) {
  const supabase = await createClient();

  const slug = listing.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80) + '-' + Date.now().toString(36).slice(-4);

  // Auto-calculate tier for kos
  let tierData = {};
  if (listing.type === 'kos' && listing.price) {
    const tier = getListingTier(listing.price);
    tierData = {
      listing_tier: tier.tier,
      listing_fee: tier.fee,
      listing_fee_status: tier.fee > 0 ? 'active' : 'free',
    };
  }

  const { data, error } = await supabase
    .from('listings')
    .insert({
      ...listing,
      ...tierData,
      slug,
      source: 'local',
      status: 'draft',
      facilities: listing.facilities ? JSON.stringify(listing.facilities) : '[]',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================
// OWNER: Get my listings
// ============================================================
export async function getOwnerListings(ownerId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('listings')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  return data ?? [];
}

// ============================================================
// ANTI-BYPASS: Create WA relay contact
// ============================================================
export async function createContact(
  listingId: string,
  userId: string,
) {
  const supabase = await createClient();

  // Generate tracking code: TL-KOS-0412-xxxx
  const { data: listing } = await supabase
    .from('listings')
    .select('type, owner_id, phone')
    .eq('id', listingId)
    .single();

  if (!listing) throw new Error('Listing not found');

  const typeCode = listing.type.toUpperCase().slice(0, 3);
  const dateCode = new Date().toISOString().slice(5, 10).replace('-', '');
  const random = Math.random().toString(36).slice(-4).toUpperCase();
  const trackingCode = `TL-${typeCode}-${dateCode}-${random}`;

  const { data: contact, error } = await supabase
    .from('service_contacts')
    .insert({
      listing_id: listingId,
      user_id: userId,
      tracking_code: trackingCode,
      contact_method: 'wa_relay',
      followup_status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;

  return { contact, ownerPhone: listing.phone, trackingCode };
}

// ============================================================
// Get reviews for a listing
// ============================================================
export async function getListingReviews(listingId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('reviews')
    .select('*, reviewer:profiles!reviewer_id(full_name, avatar_url)')
    .eq('listing_id', listingId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  return data ?? [];
}
