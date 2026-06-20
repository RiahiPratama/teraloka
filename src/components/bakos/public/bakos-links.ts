// ════════════════════════════════════════════════════════════════
// BAKOS — Shared constants, types & helpers (public LP)
// PATH: src/components/bakos/public/bakos-links.ts
// ════════════════════════════════════════════════════════════════

import type { SyntheticEvent } from 'react';

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
  // 🛡️ C-premium-only: pin presisi HANYA utk kos berbayar (BE gate revealed).
  //    Free → null → tak muncul di peta /cari (insentif upgrade).
  latitude?: number | null;
  longitude?: number | null;
  is_managed?: boolean;           // true = berbayar aktif (gate revealed)
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
  // Rupiah lengkap dgn pemisah ribuan titik: 1250000 → "Rp 1.250.000"
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`;
}

// 🛡️ placeholder abu-abu + ikon rumah (SVG inline) untuk gambar yang gagal load.
export const IMG_FALLBACK =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='300'%3E%3Crect%20width='400'%20height='300'%20fill='%23eef0f2'/%3E%3Cpath%20d='M200%20120l-60%2045v70h120v-70z'%20fill='none'%20stroke='%23b8c0c8'%20stroke-width='8'%20stroke-linejoin='round'/%3E%3C/svg%3E";

export function onImgError(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.dataset.fb) return;        // cegah loop kalau fallback pun gagal
  img.dataset.fb = '1';
  img.src = IMG_FALLBACK;
}

// 🛡️ facilities = jsonb → bisa array (legacy), objek {key:true}, atau null. → array KEY.
export function facList(f: unknown): string[] {
  if (Array.isArray(f)) return f.map(String);
  if (f && typeof f === 'object') {
    return Object.entries(f as Record<string, unknown>)
      .filter(([, v]) => v === true || (typeof v === 'string' && v))
      .map(([k]) => k);
  }
  return [];
}

// ── Fasilitas KANONIK (key↔label). DB simpan object {key:true} snake_case. ──
// LISTING (area bersama) — form owner listing-level + filter.
export const LISTING_FAC_LABEL: Record<string, string> = {
  parkir_motor: 'Area parkir motor', parkir_mobil: 'Area parkir mobil',
  dapur_bersama: 'Dapur bersama', ruang_tamu: 'Ruang tamu', ruang_santai: 'Ruang santai',
  jemuran: 'Jemuran', tempat_cuci: 'Tempat cuci', mushola: 'Mushola', taman: 'Taman',
  cctv: 'CCTV area umum', satpam: 'Satpam 24 jam', air_pdam: 'Air PDAM',
};
// ROOM (per kamar) — form kamar + display detail.
export const ROOM_FAC_LABEL: Record<string, string> = {
  ac: 'AC', wifi: 'WiFi', kamar_mandi_dalam: 'Kamar mandi dalam', kamar_mandi_luar: 'Kamar mandi luar',
  kloset_duduk: 'Kloset duduk', kloset_jongkok: 'Kloset jongkok', shower: 'Shower',
  water_heater: 'Water heater', dapur_pribadi: 'Dapur pribadi', kasur: 'Kasur', lemari: 'Lemari',
  meja_belajar: 'Meja belajar', televisi: 'Televisi', jendela: 'Jendela', balkon: 'Balkon',
  kipas_angin: 'Kipas angin', kulkas: 'Kulkas', listrik_token: 'Listrik token', listrik_included: 'Listrik included',
};
const FAC_LABEL: Record<string, string> = { ...LISTING_FAC_LABEL, ...ROOM_FAC_LABEL };

// key → label tampil (fallback: prettify snake_case kalau key tak dikenal).
export function facLabel(key: string): string {
  return FAC_LABEL[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// label[] (pilihan chip owner) → object {key:true} kanonik untuk disimpan ke BE.
export function labelsToFacObject(labels: string[], dict: Record<string, string>): Record<string, boolean> {
  const rev: Record<string, string> = {};
  for (const [key, label] of Object.entries(dict)) rev[label] = key;
  const out: Record<string, boolean> = {};
  for (const l of labels) out[rev[l] ?? l.toLowerCase().replace(/\s+/g, '_')] = true;
  return out;
}
