/**
 * TeraLoka — AI Penulis (BAKABAR editorial writer)
 * ------------------------------------------------------------
 * Konstanta + tipe FE untuk Section "AI Penulis" di Tab AI (/admin/content).
 * Bahan mentah → DRAFT editorial. Dipakai oleh
 * src/components/admin/content/ai-penulis-section.tsx.
 *
 * 🔴 TERPISAH dari AI Desk (/admin/ai/desk). Endpoint sendiri:
 *   POST /api/v1/admin/ai/penulis/generate
 * Shape MIRROR backend (teraloka-api, proven prod). Jangan diubah sepihak.
 *
 * 🔴 PRINSIP LOCKED: AI = ALAT. Output = DRAFT, editor manusia gatekeeper final.
 * TIDAK auto-publish. quote_fabrication_detected = gerbang keamanan UI (lihat section).
 */

/** Task A–E (mirror PenulisTask backend). value dikirim apa adanya ke endpoint. */
export const PENULIS_TASKS: { value: PenulisTask; label: string }[] = [
  { value: 'A', label: 'A · Synthesis multi-source → artikel BAKABAR original' },
  { value: 'B', label: 'B · BALAPOR convert → artikel (pelapor primary source)' },
  { value: 'C', label: 'C · Aggregator cluster + editorial commentary' },
  { value: 'D', label: 'D · Edit/rewrite draft kontributor (voice TeraLoka)' },
  { value: 'E', label: 'E · SEO headline + meta' },
];

export type PenulisTask = 'A' | 'B' | 'C' | 'D' | 'E';

/** Batas panjang bahan mentah (mirror MAX_CHARS backend). */
export const PENULIS_MAX_CHARS = 20000;

export interface PenulisSeoMeta {
  title?: string;
  description?: string;
  slug?: string;
  tags?: string[];
  kategori?: string;
}

/** Shape data sukses (mirror PenulisResult backend). */
export interface PenulisResult {
  draft: string;
  seo_meta: PenulisSeoMeta | null;
  self_audit_notes: string[];
  engine_used: 'gemini' | 'groq';
  word_count: number;
  /** TRUE = auditor mekanis temukan kutipan fabrikasi → JANGAN PUBLISH. */
  quote_fabrication_detected: boolean;
  disclaimer: string;
}

/**
 * Pesan error ramah per status code (mirror kontrak route penulis.ts).
 *  400 BAD_REQUEST · 422 AI_GATE_DENIED (PII/non-publik) · 429 BUDGET_EXCEEDED ·
 *  503 AI_PENULIS_ERROR / AI_UPSTREAM_ERROR.
 */
export function aiPenulisErrorMessage(status: number, fallback?: string): string {
  switch (status) {
    case 400:
      return 'Bahan kosong, tidak valid, atau kepanjangan (maks 20.000 karakter).';
    case 422:
      return 'Bahan mengandung data privat/non-publik. Bersihkan dulu — AI Penulis cuma untuk konten publik.';
    case 429:
      return 'Kuota AI harian habis. Coba lagi besok.';
    case 503:
      return 'Layanan AI Penulis lagi gangguan. Coba lagi sebentar.';
    default:
      return fallback || 'Gagal membuat draft. Coba lagi sebentar.';
  }
}
