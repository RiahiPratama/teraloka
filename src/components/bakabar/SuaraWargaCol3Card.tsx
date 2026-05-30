// ════════════════════════════════════════════════════════════════
// BAKABAR — Suara Warga Col-3 Card (Phase 4 — Tahap 3, Data Real BALAPOR)
// PATH: src/components/bakabar/SuaraWargaCol3Card.tsx
// ────────────────────────────────────────────────────────────────
// Kartu "Suara Warga MalUt" untuk slot kolom-3 zona atas.
//   - Mini-list 3 laporan BALAPOR yg sudah verified/published
//     (GET /public/reports/recent — di-fetch di BakabarShell).
//   - Field minim (title, category, location, created_at) → desain
//     teks-driven, bukan visual. Pas konsep "suara warga".
//   - Whole card = Link ke /balapor (route report detail belum pasti,
//     jadi 1 destinasi aman). Brand BALAPOR = ungu (#A21CAF).
//   - Fallback (reports kosong) di-handle di RegionSection → slot
//     balik ke promosi layanan, gak ada kartu bolong.
// ════════════════════════════════════════════════════════════════

import Link from 'next/link';
import { ArrowRight, MapPin, Megaphone } from 'lucide-react';

export type BalaporReport = {
  id:         string;
  title:      string;
  category?:  string;
  location?:  string | null;
  created_at: string;
};

const CAT_COLOR: Record<string, string> = {
  pendidikan:    '#0369A1',
  lingkungan:    '#15803D',
  kesehatan:     '#BE185D',
  infrastruktur: '#B45309',
  sosial:        '#7C3AED',
  hukum:         '#B91C1C',
  kriminal:      '#B91C1C',
  transportasi:  '#0E7490',
  ekonomi:       '#A16207',
  bencana:       '#DC2626',
};
function catColor(c?: string) {
  return (c && CAT_COLOR[c]) || '#A21CAF';
}

function timeAgo(dateStr: string) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return 'hari ini';
  if (d < 7) return `${d} hari lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

type Props = { reports: BalaporReport[]; className?: string };

export default function SuaraWargaCol3Card({ reports, className = '' }: Props) {
  const items = reports.slice(0, 3);
  if (items.length === 0) return null; // safety; RegionSection juga sudah fallback

  return (
    <Link
      href="/balapor"
      className={`rounded-lg overflow-hidden relative flex flex-col cursor-pointer group bg-white ${className}`}
      style={{ border: '1px solid #E5E7EB', minHeight: 0 }}
    >
      {/* Header */}
      <div className="px-3.5 py-2.5 flex items-center gap-2 shrink-0"
        style={{ borderBottom: '1px solid #E5E7EB' }}>
        <div className="w-[3px] h-[16px] rounded-sm shrink-0" style={{ background: '#A21CAF' }} />
        <Megaphone size={13} strokeWidth={2.4} style={{ color: '#A21CAF' }} className="shrink-0" />
        <div className="text-[13px] font-extrabold text-gray-900 truncate">
          Suara Warga MalUt
        </div>
      </div>

      {/* List laporan (isi tinggi) */}
      <div className="flex-1 flex flex-col min-h-0">
        {items.map((r, idx) => (
          <div
            key={r.id}
            className="px-3.5 py-2.5 flex-1 flex flex-col justify-center"
            style={{ borderBottom: idx < items.length - 1 ? '1px solid #F3F4F6' : 'none' }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: catColor(r.category) }} />
              <span className="text-[9px] font-bold uppercase tracking-[0.5px]" style={{ color: catColor(r.category) }}>
                {r.category || 'umum'}
              </span>
            </div>
            <h4 className="text-[12.5px] font-semibold leading-[1.3] text-gray-900 line-clamp-2"
              style={{ fontFamily: "'Lora', Georgia, serif" }}>
              {r.title}
            </h4>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400">
              {r.location && (
                <span className="flex items-center gap-0.5 truncate">
                  <MapPin size={9} strokeWidth={2.2} className="shrink-0" />
                  <span className="truncate">{r.location}</span>
                </span>
              )}
              {r.location && <span>·</span>}
              <span className="shrink-0">{timeAgo(r.created_at)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="px-3.5 py-2.5 flex items-center justify-between shrink-0"
        style={{ borderTop: '1px solid #F3F4F6' }}>
        <span className="text-[10px] text-gray-500">Laporan warga terverifikasi</span>
        <span className="flex items-center gap-0.5 text-[10px] font-extrabold" style={{ color: '#A21CAF' }}>
          Lihat semua
          <ArrowRight size={10} strokeWidth={2.8} />
        </span>
      </div>
    </Link>
  );
}
