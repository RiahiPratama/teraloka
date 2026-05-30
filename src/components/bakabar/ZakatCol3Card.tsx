// ════════════════════════════════════════════════════════════════
// BAKABAR — Zakat Col-3 Card (Phase 4 — Tahap 1b, House Content)
// PATH: src/components/bakabar/ZakatCol3Card.tsx
// ────────────────────────────────────────────────────────────────
// Kartu ajakan ZAKAT untuk slot kolom-3 (zona atas, rotasi house content).
//   - Versi VERTICAL khusus kolom-3 sempit. ZakatCTACard asli
//     (src/app/(public)/fundraising/_components/) = versi horizontal-lebar
//     untuk halaman fundraising → JANGAN dicampur, beda use case.
//   - Struktur/styling SENGAJA mirror StackLayananTeraLoka biar serasi
//     di slot rotasi yang sama (promosi layanan ↔ zakat selang-seling).
//   - Identitas zakat: gradient hijau TeraLoka + glow pink halus +
//     overline pink → beda rasa dari kartu layanan, tapi 1 bahasa desain.
//   - Link ke /fundraising/zakat (kalkulator zakat existing). No data fetch.
// ════════════════════════════════════════════════════════════════

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const GRADIENT = 'linear-gradient(135deg, #047857 0%, #003526 100%)';
const BRAND    = '#047857';

type Props = { className?: string };

export default function ZakatCol3Card({ className = '' }: Props) {
  return (
    <Link
      href="/fundraising/zakat"
      className={`rounded-lg p-3.5 text-white relative overflow-hidden flex flex-col cursor-pointer group ${className}`}
      style={{ background: GRADIENT, minHeight: 0 }}
    >
      {/* Glow pink halus → identitas zakat (kartu layanan pakai putih) */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 85% 100%, rgba(236,72,153,0.25) 0%, transparent 60%)',
      }} />

      {/* Icon accent top-right (compact, match StackLayananTeraLoka) */}
      <div className="absolute z-[1] pointer-events-none" style={{ top: 6, right: 8, fontSize: 32, opacity: 0.22 }}>
        🤲
      </div>

      <div className="relative z-[2] flex-1 flex flex-col min-h-0">
        <p className="text-[8px] font-extrabold tracking-[1.2px] uppercase mb-1" style={{ color: '#F9A8D4' }}>
          BADONASI · Zakat
        </p>
        <h3 className="text-[17px] font-extrabold leading-[1] mb-1.5 tracking-[-0.4px]"
          style={{ fontFamily: "'Lora', Georgia, serif" }}>
          Tunaikan Zakat
        </h3>
        <p className="text-[10px] leading-[1.35] opacity-90 line-clamp-2 mb-auto">
          Hitung & tunaikan zakat fitrah, maal, atau penghasilan — cepat, sesuai syariah.
        </p>
        <span className="self-start mt-1.5 px-2.5 py-1 rounded text-[9px] font-extrabold flex items-center gap-1"
          style={{ background: '#fff', color: BRAND }}>
          Hitung Zakat
          <ArrowRight size={9} strokeWidth={2.8} />
        </span>
      </div>
    </Link>
  );
}
