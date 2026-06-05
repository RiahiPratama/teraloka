// ════════════════════════════════════════════════════════════════
// BAKABAR — Stack Layanan TeraLoka v2 (Phase 4 — Single Source)
// PATH: src/components/bakabar/StackLayananTeraLoka.tsx
// ────────────────────────────────────────────────────────────────
// v2 (31 Mei 2026): jadi SATU-SATUNYA sumber kartu Layanan kolom-3.
//   - Sebelumnya RegionSection nulis-ulang kartu ini inline + pakai
//     const LAYANAN_GRADIENT/LAYANAN_BRAND yg udah drift. Sekarang
//     semua data + style ada di sini (VARIANT_META = single source).
//   - Style DISAMAKAN ke versi compact yg live (bukan versi gede lama)
//     → tidak ada kejutan visual. Gradient = canonical brand.
//   - Tambah prop `className` → parent yg atur layout (flex-1 dll).
//   - body = teks kontekstual per-region (dari region.layanan_body).
//
// Cross-promo card untuk layanan lain TeraLoka (BAKOS/BAPASIAR/
// BADONASI/BALAPOR). Editorial-safe: link internal, no IKLAN badge
// (ini house content, bukan iklan).
// ════════════════════════════════════════════════════════════════

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ServiceVariant } from './region-data';

const VARIANT_META: Record<ServiceVariant, {
  label: string;
  href: string;
  cta: string;
  icon: string;
  gradient: string;
  brand: string;
}> = {
  bakos: {
    label:    'BAKOS',
    href:     '/bakos',
    cta:      'Gabung',
    icon:     '💬',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
    brand:    '#6D28D9',
  },
  bapasiar: {
    label:    'BAPASIAR',
    href:     '/speed',
    cta:      'Cek',
    icon:     '🛒',
    gradient: 'linear-gradient(135deg, #0EA5E9 0%, #0369A1 100%)',
    brand:    '#0369A1',
  },
  badonasi: {
    label:    'BADONASI',
    href:     '/fundraising',
    cta:      'Galang',
    icon:     '🤲',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
    brand:    '#BE185D',
  },
  balapor: {
    label:    'BALAPOR',
    href:     '/balapor',
    cta:      'Lapor',
    icon:     '📢',
    gradient: 'linear-gradient(135deg, #A21CAF 0%, #701A75 100%)',
    brand:    '#701A75',
  },
};

type Props = {
  variant:    ServiceVariant;
  body:       string;      // teks kontekstual per-region (region.layanan_body)
  className?: string;      // layout dari parent (mis. "flex-1")
};

export default function StackLayananTeraLoka({ variant, body, className = '' }: Props) {
  const meta = VARIANT_META[variant];

  return (
    <Link
      href={meta.href}
      className={`rounded-lg p-3.5 text-white relative overflow-hidden flex flex-col cursor-pointer group ${className}`}
      style={{ background: meta.gradient, minHeight: 0 }}
    >
      {/* Radial overlay decoration */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 85% 100%, rgba(255,255,255,0.2) 0%, transparent 60%)',
      }} />

      {/* Icon accent top-right (compact — match live) */}
      <div className="absolute z-[1] pointer-events-none" style={{ top: 6, right: 8, fontSize: 32, opacity: 0.2 }}>
        {meta.icon}
      </div>

      <div className="relative z-[2] flex-1 flex flex-col min-h-0">
        <p className="text-[8px] font-extrabold tracking-[1.2px] uppercase mb-1 opacity-85">
          Layanan TeraLoka
        </p>
        <h3 className="text-[17px] font-extrabold leading-[1] mb-1.5 tracking-[-0.4px]"
          style={{ fontFamily: "'Lora', Georgia, serif" }}>
          {meta.label}
        </h3>
        <p className="text-[10px] leading-[1.35] opacity-90 line-clamp-2 mb-auto">
          {body}
        </p>
        <span className="self-start mt-1.5 px-2.5 py-1 rounded text-[9px] font-extrabold flex items-center gap-1"
          style={{ background: '#fff', color: meta.brand }}>
          {meta.cta}
          <ArrowRight size={9} strokeWidth={2.8} />
        </span>
      </div>
    </Link>
  );
}
