'use client';

/**
 * TeraLoka — SOS FAB (Floating Action Button)
 * Bridge Sprint Day 12 Step 6 (10 Mei 2026) · compact + pindah kanan (10 Jun 2026)
 * ------------------------------------------------------------
 * Sticky panic button, bottom-RIGHT, always-visible across all pages.
 *
 * Visual (compact):
 *   - Red gradient circle 52px (sebelumnya 64px + halo ring-4 + ping → terlalu besar)
 *   - Teks "SOS" tebal (tanpa material-symbols icon yang sering gagal load → "sos" literal)
 *   - Shadow halus, tanpa cloud halo. Tetap merah = sinyal darurat jelas.
 *
 * Position:
 *   - bottom-right, di atas konten, di bawah modal (modal z-50+)
 *   - clear BottomNav (mobile) + safe-area iOS
 *
 * Behavior:
 *   - Click: open SosModal (3-screen flow). Always-on (emergency = no hide condition).
 */

import { useState } from 'react';
import { SosModal } from './sos-modal';

export function SosFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buka tombol SOS darurat"
        title="Tombol darurat"
        className="
          fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40
          grid place-items-center
          h-[52px] w-[52px]
          rounded-full
          bg-gradient-to-br from-[#EF4444] to-[#DC2626]
          text-white
          shadow-lg shadow-red-500/30
          hover:shadow-xl hover:shadow-red-500/40
          hover:-translate-y-1 hover:scale-105 active:scale-95
          transition-all duration-200
        "
      >
        <span className="text-[13px] font-extrabold leading-none tracking-wider">SOS</span>
      </button>

      {/* Modal — render conditionally untuk avoid mount cost saat closed */}
      {open && <SosModal onClose={() => setOpen(false)} />}
    </>
  );
}
