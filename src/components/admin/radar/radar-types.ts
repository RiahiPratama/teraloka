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
