/**
 * TeraLoka — AI Desk (BAKABAR editorial assistant)
 * ------------------------------------------------------------
 * Konstanta + logic FE AI Desk. Dipakai oleh Tab "AI" dashboard /admin/content
 * (src/components/admin/content/ai-desk-section.tsx). AI Desk = fungsi editorial
 * BAKABAR, super_admin-only.
 *
 * 🔴 PRINSIP LOCKED: AI = ALAT, bukan editor. Hasil = bahan kerja, BUKAN final.
 * Editor wajib verifikasi & edit sebelum dipakai (perisai hukum + kepercayaan BAKABAR).
 *
 * Enum kategori = MIRROR dari backend (repo teraloka-api). Backend SELALU balikin
 * salah satu dari 11 nilai ini; di luar enum sudah di-map ke "Lainnya" di backend.
 * Kalau backend nambah/ubah kategori, sinkronkan daftar ini.
 */

import { isValidCategory } from './categories';

export const AI_DESK_KATEGORI = [
  'Pemerintahan',
  'Politik',
  'Pendidikan',
  'Kesehatan',
  'Infrastruktur',
  'Kriminal',
  'Bencana',
  'Transportasi',
  'Ekonomi',
  'Pariwisata',
  'Lainnya',
] as const;

export type AiDeskKategori = (typeof AI_DESK_KATEGORI)[number];

/** Batas panjang teks input (mirror backend gate). */
export const AI_DESK_MAX_CHARS = 5000;

/** Bentuk respons sukses backend: { success, data: { ringkasan, kategori } }. */
export interface AiDeskResult {
  ringkasan: string;
  kategori: string;
}

/**
 * Map kategori AI Desk (TitleCase, 11 enum) → key kategori BAKABAR (lowercase).
 * Pencocokan CASE-INSENSITIVE ke SSoT `categories.ts` (bukan tabel hardcode):
 *   - Ada padanan (Politik/Pendidikan/Kesehatan/Ekonomi/Transportasi/Infrastruktur)
 *     → balikin key BAKABAR ('politik', dst). Boleh auto-set ke field kategori.
 *   - TIDAK ada padanan (Pemerintahan/Kriminal/Bencana/Pariwisata/Lainnya)
 *     → null. JANGAN auto-set; tampilkan sebagai SARAN, editor pilih manual.
 */
export function aiKategoriToBakabarKey(kategori: string): string | null {
  const key = kategori.trim().toLowerCase();
  return isValidCategory(key) ? key : null;
}

/**
 * Pesan error ramah per status code (mirror tabel kontrak handoff 2C).
 * Dipakai untuk memetakan ApiError.status → teks yang dipahami editor.
 */
export function aiDeskErrorMessage(status: number, fallback?: string): string {
  switch (status) {
    case 400:
      return 'Teks kosong atau kepanjangan (maks 5000 karakter).';
    case 422:
      return 'AI Desk cuma buat konten publik. Hapus data pribadi (NIK/no rek/email/HP) dulu.';
    case 429:
      return 'Kuota AI harian habis. Coba lagi besok.';
    case 502:
      return 'Layanan AI lagi gangguan. Coba lagi sebentar.';
    default:
      return fallback || 'Gagal menganalisis. Coba lagi sebentar.';
  }
}
