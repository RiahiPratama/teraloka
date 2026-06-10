'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS Owner — Kos Card (presentational)
// PATH: src/components/bakos/owner/OwnerKosCard.tsx
// PENANDA: L5-FE-OWNER-CARD
// ────────────────────────────────────────────────────────────────
// Kartu satu kos di dashboard owner: cover + judul + harga + badge
// gerbang (status 2-gate) + chip ringkas (kamar/foto/dilihat).
// 🛡️ Anti-fabrikasi: hanya tampilkan angka yang BENAR ADA dari backend
//    (view_count/contact_count mentah). Tidak ada grafik/statistik palsu.
// ════════════════════════════════════════════════════════════════

import { Clock, Lock, CheckCircle2, PauseCircle, Building2, BedDouble, Image as ImageIcon, Eye } from 'lucide-react';
import { type OwnerKosCard as KosCard, GATE_VIEW, BAKOS_TOKENS, formatRp } from './types';

function GateBadge({ gate }: { gate: KosCard['gate'] }) {
  const v = GATE_VIEW[gate];
  const Icon = v.icon === 'clock' ? Clock : v.icon === 'lock' ? Lock : v.icon === 'check' ? CheckCircle2 : PauseCircle;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: v.bg, color: v.fg }}
    >
      <Icon size={11} />
      {v.label}
    </span>
  );
}

function Chip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md"
      style={{ backgroundColor: BAKOS_TOKENS.surfaceAlt, color: BAKOS_TOKENS.textSecondary }}
    >
      {icon}
      {text}
    </span>
  );
}

export default function OwnerKosCard({
  kos,
  onManage,
}: {
  kos: KosCard;
  onManage: (id: string) => void;
}) {
  const roomsLabel =
    kos.rooms_cap == null ? `${kos.rooms_sum} kamar` : `${kos.rooms_sum}/${kos.rooms_cap} kamar`;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: BAKOS_TOKENS.surface, border: `0.5px solid ${BAKOS_TOKENS.border}` }}
    >
      <div className="flex gap-3 p-3">
        {/* Cover */}
        <div
          className="w-20 h-20 rounded-lg shrink-0 overflow-hidden flex items-center justify-center"
          style={{ background: BAKOS_TOKENS.surfaceAlt }}
        >
          {kos.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={kos.cover_image_url} alt={kos.title} className="w-full h-full object-cover" />
          ) : (
            <Building2 size={24} style={{ color: BAKOS_TOKENS.textTertiary }} />
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold truncate" style={{ color: BAKOS_TOKENS.textPrimary }}>
              {kos.title}
            </p>
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: BAKOS_TOKENS.textTertiary }}>
            {kos.display_id ?? 'ID belum dibuat'}
          </p>
          <p className="text-sm font-bold mt-1" style={{ color: BAKOS_TOKENS.accent }}>
            {formatRp(kos.price)}
            <span className="text-[10px] font-normal" style={{ color: BAKOS_TOKENS.textSecondary }}>
              {' '}/bulan
            </span>
          </p>
          <div className="mt-1.5">
            <GateBadge gate={kos.gate} />
          </div>
        </div>
      </div>

      {/* Chips + aksi */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-2"
        style={{ borderTop: `0.5px solid ${BAKOS_TOKENS.border}`, background: BAKOS_TOKENS.surfaceAlt }}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <Chip icon={<BedDouble size={11} />} text={roomsLabel} />
          <Chip icon={<ImageIcon size={11} />} text={`${kos.photos_count} foto`} />
          <Chip icon={<Eye size={11} />} text={`${kos.view_count} dilihat`} />
        </div>
        <button
          type="button"
          onClick={() => onManage(kos.id)}
          className="text-[11px] font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-transform shrink-0"
          style={{ background: BAKOS_TOKENS.accent, color: '#fff' }}
        >
          Kelola
        </button>
      </div>
    </div>
  );
}
