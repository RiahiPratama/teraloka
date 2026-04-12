/**
 * EduKazia API Integration — Guru privat
 * API Pull + Redis cache (TTL 6 jam)
 * 
 * EduKazia = Source of Truth (data, kualifikasi, kontrak)
 * TeraLoka = Etalase tambahan (distribution channel)
 */

const EDUKAZIA_API_URL = process.env.EDUKAZIA_API_URL || 'https://edukazia.com/api/v1';
const CACHE_TTL_HOURS = 6;

interface EdukaziaTutor {
  id: string;
  name: string;
  subjects: string[];
  city: string;
  rating: number;
  photo_url: string;
  available: boolean;
}

/**
 * Fetch tutors from EduKazia API (with cache)
 */
export async function fetchTutors(city: string = 'ternate'): Promise<EdukaziaTutor[]> {
  // TODO: Add Upstash Redis cache when available
  // const cached = await redis.get(`edukazia:tutors:${city}`);
  // if (cached) return JSON.parse(cached);

  try {
    const res = await fetch(
      `${EDUKAZIA_API_URL}/public/tutors?city=${city}&available=true`,
      { next: { revalidate: CACHE_TTL_HOURS * 3600 } }, // Next.js cache
    );

    if (!res.ok) return [];

    const data = await res.json();
    const tutors = data.data || [];

    // TODO: Cache in Redis
    // await redis.set(`edukazia:tutors:${city}`, JSON.stringify(tutors), { ex: CACHE_TTL_HOURS * 3600 });

    return tutors;
  } catch {
    return []; // Fail silently — EduKazia down shouldn't break TeraLoka
  }
}

/**
 * Sync EduKazia tutors into TeraLoka listings table
 * Run periodically (cron) to keep listings fresh
 */
export async function syncTutorsToListings() {
  // TODO: Implementation
  // 1. Fetch from EduKazia API
  // 2. Upsert into listing.listings with source='edukazia'
  // 3. Deactivate tutors no longer in EduKazia
}
