// ════════════════════════════════════════════════════════════════
// BAKOS — Shared constants, types & helpers (public LP)
// PATH: src/components/bakos/public/bakos-links.ts
// ════════════════════════════════════════════════════════════════

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.teraloka.com/api/v1';

export interface Listing {
  id: string;
  title: string;
  slug: string;
  photos: string[];
  cover_image_url: string | null;
  price: number;
  price_period: string;
  is_negotiable: boolean;
  kos_type: string | null;
  facilities: unknown;            // 🛡️ jsonb di DB → di-guard via facList()
  address: string | null;
  city_id: string | null;
  nearby_landmarks?: string[] | null;
  listing_tier: string;
  rating_avg: number;
  rating_count: number;
  has_room_types: boolean;
  accommodation_type: string | null;
  is_verified?: boolean;          // 🛡️ opsional — badge HANYA jika true
  source?: string;                // 🛡️ opsional — 'seed' = belum dikonfirmasi
  room_available?: number | null;
}

export const PRICE_FILTERS = [
  { key: 'all', label: 'Semua harga' },
  { key: '0-999999', label: 'Di bawah Rp 1 juta' },
  { key: '1000000-2000000', label: 'Rp 1 juta – 2 juta' },
  { key: '2000001-99999999', label: 'Di atas Rp 2 juta' },
] as const;

export const SORT_OPTIONS = [
  { key: 'relevan',   label: 'Paling relevan' },
  { key: 'termurah',  label: 'Harga termurah' },
  { key: 'termahal',  label: 'Harga termahal' },
] as const;

export const KOS_TYPES = [
  { key: '', label: 'Semua' },
  { key: 'putra', label: 'Putra' },
  { key: 'putri', label: 'Putri' },
  { key: 'campur', label: 'Campur' },
] as const;

export const QUICK = [
  { icon: 'ac_unit', label: 'AC' },
  { icon: 'wifi', label: 'WiFi cepat' },
  { icon: 'bathroom', label: 'KM dalam' },
  { icon: 'two_wheeler', label: 'Parkir motor' },
  { icon: 'restaurant', label: 'Dapur bersama' },
  { icon: 'sailing', label: 'Dekat speedboat', special: true },
] as const;

// Area populer MalUt — shortcut pencarian (set query 'q'); BUKAN agregasi backend.
// 🛡️ photo = foto mood area (Unsplash), bukan foto kos asli. Swappable.
export interface Area {
  name: string;
  land: string;
  q: string;
  icon: string;
  tone: 'green' | 'blue' | 'amber' | 'purple';
  photo: string;
  tag?: string;
}

export const AREAS: Area[] = [
  { name: 'Akehuda', land: 'Dekat Unkhair', q: 'Akehuda', icon: 'school', tone: 'green',
    photo: 'https://images.unsplash.com/photo-1562774053-701939374585?w=600', tag: 'Terpopuler' },
  { name: 'Kalumpang', land: 'Pusat kota', q: 'Kalumpang', icon: 'storefront', tone: 'blue',
    photo: 'https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=600' },
  { name: 'Bastiong', land: 'Pelabuhan · akses speedboat', q: 'Bastiong', icon: 'anchor', tone: 'amber',
    photo: 'https://images.unsplash.com/photo-1502209524164-acea936639a2?w=600', tag: 'Akses speed' },
  { name: 'Sasa', land: 'Dekat STAIN', q: 'Sasa', icon: 'menu_book', tone: 'purple',
    photo: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600' },
];

export const TIPE: Record<string, { lbl: string; cls: string }> = {
  putra: { lbl: 'Putra', cls: 'putra' },
  putri: { lbl: 'Putri', cls: 'putri' },
  campur: { lbl: 'Campur', cls: 'campur' },
};

export function formatRupiah(n: number): string {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}jt`;
  if (n >= 1_000) return `Rp ${Math.round(n / 1_000)}rb`;
  return `Rp ${n}`;
}

// 🛡️ facilities = jsonb → bisa array, objek {ac:true}, atau null. Normalisasi ke string[].
export function facList(f: unknown): string[] {
  if (Array.isArray(f)) return f.map(String);
  if (f && typeof f === 'object') {
    return Object.entries(f as Record<string, unknown>)
      .filter(([, v]) => v === true || (typeof v === 'string' && v))
      .map(([k]) => k);
  }
  return [];
}
