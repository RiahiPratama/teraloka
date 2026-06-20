/** Format Rupiah: 1500000 → "Rp 1.500.000" */
export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

/** Format tanggal: "12 Apr 2026" */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Format waktu: "14:30" */
export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format relative: "5 menit lalu", "2 jam lalu" */
export function formatRelative(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
  return formatDate(date);
}

/** Format phone: "081234567890" → "0812-3456-7890" */
export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length <= 4) return clean;
  if (clean.length <= 8) return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8)}`;
}

/**
 * Normalisasi nomor HP Indonesia → format wa.me (62xxx, tanpa +).
 *   081234567890  → 6281234567890
 *   +6281234567890 → 6281234567890
 *   6281234567890  → 6281234567890
 * Dipakai utk bangun URL https://wa.me/${normalizeWaNumber(phone)}.
 */
export function normalizeWaNumber(phone: string): string {
  const cleaned = (phone ?? '').replace(/\D/g, '');
  if (cleaned.startsWith('0')) return '62' + cleaned.slice(1);
  if (cleaned.startsWith('62')) return cleaned;
  return cleaned;
}

/**
 * Mask nomor HP utk DISPLAY (privasi) — tengah ditutup, ujung tetap kelihatan.
 *   082298821212 → "0822****1212". <8 digit → apa adanya. Nomor penuh tetap dipakai di logic (wa.me).
 */
export function maskPhone(phone: string | null | undefined): string {
  const d = (phone ?? '').replace(/\D/g, '');
  if (d.length < 8) return d || '—';
  return `${d.slice(0, 4)}****${d.slice(-4)}`;
}

/** Truncate text with ellipsis */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}
