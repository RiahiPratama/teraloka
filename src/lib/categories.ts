// ════════════════════════════════════════════════════════════════
// BAKABAR — KATEGORI (TEMA) Single Source of Truth v1.0
// PATH: src/lib/categories.ts
// ────────────────────────────────────────────────────────────────
// 2 Jun 2026 — SSoT tema BAKABAR. Sebelumnya daftar kategori
// digandakan 3x (new/edit/hub) + drift dgn header. File ini =
// SATU sumber. Import dari sini, JANGAN define ulang inline.
//
// Dimensi navigasi BAKABAR ada DUA, terpisah:
//   • KANAL  (asal/lokasi)  → "berita ini dari mana?"  → nasional, ternate, ..., viral
//                              SSoT = REGIONS (region-data.ts) + 'viral'.
//   • KATEGORI (tema)        → "berita ini tentang apa?" → FILE INI.
//
// 🛡️ "viral" BUKAN tema — itu KANAL (asal). Jangan masukin ke sini.
//
// Konsumen file ini:
//   - office/newsroom/bakabar/hub/new   (form: pilih tema)
//   - office/newsroom/bakabar/hub/[id]/edit
//   - office/newsroom/bakabar/hub       (filter dropdown)
//   - components/bakabar/BakabarHeader  (drawer TOPIK)
//   - app/(public)/bakabar/kategori/[slug] (halaman rak tema)
//
// Icon = Lucide React (RULE 34). Disatuin: icon dari header (publik),
// warna dari editor (chip form).
// ════════════════════════════════════════════════════════════════

import {
  Newspaper, Landmark, Wallet, HeartHandshake, Ship, Trophy,
  Stethoscope, GraduationCap, Drama, Cpu, Cloud, MessageSquare, Construction,
  type LucideIcon,
} from 'lucide-react';

export type Category = {
  /** disimpan di `content.articles.category` + jadi segmen URL /bakabar/kategori/<key> */
  key:   string;
  label: string;
  Icon:  LucideIcon;
  /** warna chip/badge (editor form + badge kategori publik) */
  color: string;
};

export const CATEGORIES: Category[] = [
  { key: 'berita',       label: 'Berita',       Icon: Newspaper,      color: '#1B6B4A' },
  { key: 'politik',      label: 'Politik',      Icon: Landmark,       color: '#7C3AED' },
  { key: 'ekonomi',      label: 'Ekonomi',      Icon: Wallet,         color: '#059669' },
  { key: 'sosial',       label: 'Sosial',       Icon: HeartHandshake, color: '#0891B2' },
  { key: 'transportasi', label: 'Transportasi', Icon: Ship,           color: '#0284C7' },
  { key: 'infrastruktur', label: 'Infrastruktur', Icon: Construction,  color: '#EA580C' },
  { key: 'olahraga',     label: 'Olahraga',     Icon: Trophy,         color: '#DC2626' },
  { key: 'kesehatan',    label: 'Kesehatan',    Icon: Stethoscope,    color: '#E11D48' },
  { key: 'pendidikan',   label: 'Pendidikan',   Icon: GraduationCap,  color: '#CA8A04' },
  { key: 'budaya',       label: 'Budaya',       Icon: Drama,          color: '#DB2777' },
  { key: 'teknologi',    label: 'Teknologi',    Icon: Cpu,            color: '#2563EB' },
  { key: 'cuaca',        label: 'Cuaca',        Icon: Cloud,          color: '#0EA5E9' },
  { key: 'opini',        label: 'Opini',        Icon: MessageSquare,  color: '#6B7280' },
];

/** key-only array — buat validasi/iterasi cepat. */
export const CATEGORY_KEYS: string[] = CATEGORIES.map((c) => c.key);

/** lookup O(1) by key. */
export const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c]),
);

/** ambil meta kategori (Icon/label/color) dari key. null-safe. */
export function getCategory(key: string | null | undefined): Category | undefined {
  return key ? CATEGORY_MAP[key] : undefined;
}

/** validasi key kategori — dipakai halaman /kategori/[slug] buat 404 kalau invalid. */
export function isValidCategory(key: string): boolean {
  return key in CATEGORY_MAP;
}

/** label dari key, fallback ke key yg dikapitalisasi (mis. data lama 'pemerintahan'). */
export function categoryLabel(key: string | null | undefined): string {
  if (!key) return 'Umum';
  return CATEGORY_MAP[key]?.label ?? (key.charAt(0).toUpperCase() + key.slice(1));
}
