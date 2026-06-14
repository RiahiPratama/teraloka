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

// 🛡️ Checklist pengingat anti-pidana SEBELUM tandai "layak" — reminder kerja
// internal, BUKAN vonis. Muncul di triase saat status diarahkan ke 'layak'.
export const VERIFICATION_CHECKLIST = [
  'Sumber primer dicek (dokumen SIRUP/LPSE asli, bukan cuma flag)',
  'Framing "dianggarkan" bukan "dihabiskan" (data RENCANA/RUP)',
  'Rencana hak jawab (kontak satker sebelum publish)',
  'Cek dasar hukum bila perlu',
];

export function formatPagu(pagu: number | null): string {
  if (pagu == null) return '—';
  return `Rp ${pagu.toLocaleString('id-ID')}`;
}

// ─── Radar Smart v1: flag chip presentation ─────────────────────
// Tooltip per code = jelasin rule + tegas "bukan tuduhan". Fallback generik
// kalau code baru muncul dari backend (mis. 'non_tender_besar'/Cek Metode).
export const FLAG_TOOLTIP: Record<string, string> = {
  pagu_besar:
    'Pagu di atas ambang. Anggaran besar = dampak publik besar, layak dilihat. Bukan tuduhan.',
  pola_berulang:
    'Nama paket serupa muncul berulang di hasil ini — menarik ditelusuri. Bukan tuduhan.',
  non_tender_besar:
    'Perlu cek metode pengadaan. Sekadar penanda telusur. Bukan tuduhan.',
};

export function flagTooltip(flag: Flag): string {
  return FLAG_TOOLTIP[flag.code] ?? `${flag.label} — penanda telusur, bukan tuduhan.`;
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
