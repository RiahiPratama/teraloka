// ════════════════════════════════════════════════════════════════
// BAKOS Detail — shared types & helpers
// PATH: src/components/bakos/public/detail/types.ts
// ════════════════════════════════════════════════════════════════

export interface Room {
  id: string; room_type: string; description: string | null; price: number;
  price_period: string; total_rooms: number; available_rooms: number;
  size_m2: number | null; facilities: string[]; photos: string[];
}

export interface ListingDetail {
  id: string; display_id: string | null; title: string; slug: string;
  description: string | null; photos: string[]; cover_image_url: string | null;
  price: number; price_period: string; is_negotiable: boolean; kos_type: string | null;
  facilities: unknown; area: string | null; address: string | null; city_id: string | null;
  nearby_landmarks: string[] | string | null; listing_tier: string; is_verified: boolean;
  rating_avg: number; rating_count: number; has_room_types: boolean; room_size_m2: number | null;
  accommodation_type: string | null; kos_rules: string | null; electricity_type: string | null;
  contact_enabled: boolean; is_claimable: boolean; is_managed: boolean; owner_id: string;
}

export const SECTIONS = [
  { id: 'foto', label: 'Foto' },
  { id: 'tentang', label: 'Tentang' },
  { id: 'fasilitas', label: 'Fasilitas' },
  { id: 'kamar', label: 'Tipe Kamar' },
  { id: 'lokasi', label: 'Lokasi' },
  { id: 'ulasan', label: 'Ulasan' },
] as const;

// nama fasilitas → material-symbol (tolerant: lowercase keyword match)
export function facIcon(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes('wifi') || s.includes('internet')) return 'wifi';
  if (s.includes('ac') || s.includes('pendingin')) return 'ac_unit';
  if (s.includes('mandi') || s.includes('km ') || s.includes('shower') || s.includes('toilet')) return 'shower';
  if (s.includes('parkir mobil') || s.includes('mobil')) return 'directions_car';
  if (s.includes('parkir') || s.includes('motor')) return 'two_wheeler';
  if (s.includes('dapur') || s.includes('kulkas') || s.includes('masak')) return 'kitchen';
  if (s.includes('air panas')) return 'hot_tub';
  if (s.includes('air') || s.includes('pdam')) return 'water_drop';
  if (s.includes('kasur') || s.includes('tempat tidur')) return 'bed';
  if (s.includes('lemari')) return 'checkroom';
  if (s.includes('meja')) return 'desk';
  if (s.includes('kursi')) return 'chair';
  if (s.includes('cctv') || s.includes('keamanan') || s.includes('security')) return 'videocam';
  if (s.includes('laundry') || s.includes('cuci')) return 'local_laundry_service';
  if (s.includes('jendela')) return 'window';
  if (s.includes('tv') || s.includes('televisi')) return 'tv';
  return 'check_circle';
}

export function facLabel(raw: string): string {
  if (raw.includes('_')) return raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return raw;
}

// ikon kecil reusable
export function MS({ n }: { n: string }) {
  return <span className="ms material-symbols-outlined">{n}</span>;
}
