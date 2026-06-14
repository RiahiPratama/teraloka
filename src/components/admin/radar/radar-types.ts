// ════════════════════════════════════════════════════════════════
// Radar Anggaran — types + konstanta (super-admin internal)
// PATH: src/components/admin/radar/radar-types.ts
// ────────────────────────────────────────────────────────────────
// Lead pengawasan anggaran. Bahasa NETRAL (lead "perlu ditelusuri",
// BUKAN vonis). INTERNAL ONLY. NO jembatan otomatis ke artikel.
// Endpoint backend: /admin/watchdog (CRUD, super_admin).
// ════════════════════════════════════════════════════════════════

export const WATCHDOG_API = '/admin/watchdog';

export type WatchdogStatus = 'baru' | 'ditelusuri' | 'layak' | 'tidak_layak';
export type WatchdogPriority = 'tinggi' | 'sedang' | 'rendah';

// 🛡️ Flag NETRAL = COMPUTED di backend (radar-rules). Client HANYA RENDER
// lead.flags[] — DILARANG recompute di sini (Backend = OTAK). tone cuma
// info/attention (TIDAK ADA danger/merah → nyiratin vonis).
export type FlagTone = 'info' | 'attention';

export interface Flag {
  code:  string;
  label: string;
  tone:  FlagTone;
}

export interface WatchdogLead {
  id:                   string;
  paket_name:           string;
  satker:               string;
  pagu:                 number | null;
  location_id:          string | null;
  source:               string | null;
  sumber_url:           string | null;
  status:               WatchdogStatus;
  priority:             WatchdogPriority;
  klasifikasi_internal: string | null;
  catatan_verifikasi:   string | null;
  created_by:           string | null;
  created_at:           string;
  updated_at:           string;
  flags?:               Flag[];   // dari response (computed backend) — render-only
  // Fase 1 enrich SIRUP (NULLABLE — banyak lead null di sebagian field). Render-only.
  uraian_pekerjaan?:    string | null;
  volume_raw?:          string | null;
  volume_qty?:          number | null;
  volume_unit?:         string | null;
  unit_price?:          number | null;
  nama_klpd?:           string | null;
  lokasi_detail?:       string | null;
  detail_fetched_at?:   string | null;
}

// Label NETRAL — bukan vonis. "layak" = layak DITELUSURI lebih lanjut.
export const STATUS_LABEL: Record<WatchdogStatus, string> = {
  baru:        'Baru',
  ditelusuri:  'Sedang Ditelusuri',
  layak:       'Layak Telusur',
  tidak_layak: 'Tidak Dilanjutkan',
};

export const STATUS_BADGE: Record<WatchdogStatus, 'info' | 'warning' | 'healthy' | 'neutral'> = {
  baru:        'info',
  ditelusuri:  'warning',
  layak:       'healthy',
  tidak_layak: 'neutral',
};

export const PRIORITY_LABEL: Record<WatchdogPriority, string> = {
  tinggi: 'Tinggi',
  sedang: 'Sedang',
  rendah: 'Rendah',
};

export const PRIORITY_BADGE: Record<WatchdogPriority, 'critical' | 'warning' | 'neutral'> = {
  tinggi: 'critical',
  sedang: 'warning',
  rendah: 'neutral',
};

export const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as WatchdogStatus[]).map((v) => ({
  value: v,
  label: STATUS_LABEL[v],
}));

export const PRIORITY_OPTIONS = (Object.keys(PRIORITY_LABEL) as WatchdogPriority[]).map((v) => ({
  value: v,
  label: PRIORITY_LABEL[v],
}));

// 🛡️ Framework triase 3-lensa — PANDUAN keputusan editor manusia SEBELUM tandai
// "layak". Muncul di triase saat status diarahkan ke 'layak'.
// 🔴 BUKAN scoring: NO angka/skor, NO auto-verdict, NO blocker, NO ranking.
//    Cuma NAMPILIN pertanyaan + catat centang manusia. Keputusan 100% di tangan
//    editor (Riahi), bukan komputasi. Amber/flag ≠ layak.
export interface TriaseLens {
  key:   string;
  title: string;     // nama lensa
  hint:  string;     // 1 kalimat: lensa ini nguji apa
  items: string[];   // pertanyaan panduan (manusia centang)
}

export const TRIASE_FRAMEWORK: TriaseLens[] = [
  {
    key: 'newsworthiness',
    title: 'Layak Jadi Cerita?',
    hint: 'Lensa terkuat — kalau lemah di sini, jangan lanjut walau pagu besar.',
    items: [
      'Nyentuh layanan publik warga langsung (kesehatan, jalan, air, listrik)?',
      'Ada anomali yang warga awam bisa "lho kok gini" — bukan cuma nilai besar?',
      'Kepentingan publik jelas, bukan urusan administratif internal?',
    ],
  },
  {
    key: 'feasibility',
    title: 'Bisa Dikejar Sendiri?',
    hint: 'Realistis buat tim kecil — bukan investigasi yang butuh redaksi besar.',
    items: [
      'Sumber primer kebuka (detail SIRUP / LPSE bisa diakses)?',
      'Bisa diverifikasi tanpa tim besar?',
      'Satker bisa dikontak buat hak jawab?',
    ],
  },
  {
    key: 'legal_safety',
    title: 'Aman Dipublikasi?',
    hint: 'Pelindung hukum — semua poin ini harus bisa dijawab sebelum tayang.',
    items: [
      'Bisa diframe "dianggarkan/direncanakan", bukan "dihabiskan"?',
      'Ada dokumen pendukung, bukan cuma flag radar?',
      'Hak jawab ke satker feasible sebelum publikasi?',
    ],
  },
];

export function formatPagu(pagu: number | null): string {
  if (pagu == null) return '—';
  return `Rp ${pagu.toLocaleString('id-ID')}`;
}

/** True kalau lead udah di-enrich detail SIRUP (status read-only, dari detail_fetched_at). */
export function isEnriched(lead: WatchdogLead): boolean {
  return !!lead.detail_fetched_at;
}

/**
 * Volume + harga satuan — NETRAL, fakta apa adanya. 🛡️ NO interpretasi (tinggi/mahal),
 * NO hitung selisih, NO warna alarm. null kalau gak ada data → caller sembunyiin baris.
 */
export function formatVolume(lead: WatchdogLead): string | null {
  const { volume_qty, volume_unit, unit_price, volume_raw } = lead;
  if (typeof unit_price === 'number' && typeof volume_qty === 'number' && volume_unit) {
    return `${volume_qty} ${volume_unit} · Rp ${unit_price.toLocaleString('id-ID')} / ${volume_unit}`;
  }
  if (typeof volume_qty === 'number' && volume_unit) {
    return `${volume_qty} ${volume_unit}`;
  }
  if (volume_raw && volume_raw.trim()) return volume_raw.trim();
  return null;
}

// ─── Radar Smart v1: flag chip presentation ─────────────────────
// Tooltip per code = jelasin rule + tegas "bukan indikasi masalah". Fallback
// generik kalau code baru muncul dari backend.
// 🛡️ Flag.code = string (union BE terpisah dari FE) → semua code ter-cover; tooltip
//    di-sinkron manual. v2: +pagu_relatif (amber/attention, sinyal triase utama).
export const FLAG_TOOLTIP: Record<string, string> = {
  pagu_relatif:
    'Nilai paket jauh di atas median paket sejenis — layak dilihat lebih dulu, bukan indikasi masalah.',
  pagu_besar:
    'Pagu di atas ambang — anggaran besar, dampak publik besar, layak dilihat. Bukan indikasi masalah.',
  pola_berulang:
    'Satker/paket serupa muncul berulang — layak dilihat polanya, bukan indikasi masalah.',
  non_tender_besar:
    'Perlu cek metode pengadaan — sekadar penanda telusur, bukan indikasi masalah.',
};

export function flagTooltip(flag: Flag): string {
  return FLAG_TOOLTIP[flag.code] ?? `${flag.label} — penanda telusur, bukan indikasi masalah.`;
}

// 🛡️ Chip flag: info=biru (status-info), attention=amber (status-warning).
// TIDAK ADA merah/danger (itu cuma buat error/delete).
export const FLAG_CHIP_CLASS: Record<FlagTone, string> = {
  info:      'bg-status-info/8 border-status-info/30 text-status-info',
  attention: 'bg-status-warning/8 border-status-warning/30 text-status-warning',
};

// ─── Radar Smart v1: sort + preset pagu (query param ke backend) ─
export const SORT_OPTIONS = [
  { value: 'pagu_desc', label: 'Pagu terbesar' },
  { value: 'pagu_asc',  label: 'Pagu terkecil' },
  { value: 'terbaru',   label: 'Terbaru' },
  { value: 'satker',    label: 'Satker (A-Z)' },
];

// min_pagu preset (max_pagu defer dari UI v1 — min cukup). value '' = semua.
export const PAGU_PRESETS = [
  { value: '',           label: 'Semua pagu' },
  { value: '100000000',  label: '> 100 jt' },
  { value: '500000000',  label: '> 500 jt' },
  { value: '1000000000', label: '> 1 M' },
];
