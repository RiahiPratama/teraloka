'use client';

/**
 * TeraLoka — SOS FAB (Floating Action Button)
 * Bridge Sprint Day 12 Step 6 (10 Mei 2026)
 * ------------------------------------------------------------
 * Sticky panic button, bottom-left, always-visible across all pages.
 *
 * Visual:
 *   - Red gradient circle (urgent semantics)
 *   - Pulsing ring animation (subtle, attract attention without panic)
 *   - Material Symbols 'sos' icon (international standard)
 *   - Label "SOS" below icon (text reinforcement)
 *
 * Position:
 *   - bottom-4 left-4 (mobile-first), opposite chat widget
 *   - z-50 ensures above content, below modals (modal z-50+)
 *   - safe-area-inset-bottom support iOS notch
 *
 * Behavior:
 *   - Default: render
 *   - Click: open SosModal (3-screen flow)
 *   - Hidden conditions: NONE (per Pattern: emergency = always-on)
 *
 * Bahasa:
 *   - Tooltip "Tombol darurat"
 *   - Aria label "Buka tombol SOS darurat"
 */

import { useState } from 'react';
import { SosModal } from './sos-modal';

export function SosFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* FAB Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buka tombol SOS darurat"
        title="Tombol darurat"
        className="
          fixed left-4 z-40
          flex flex-col items-center justify-center
          h-16 w-16
          rounded-full
          bg-gradient-to-br from-[#EF4444] to-[#DC2626]
          shadow-lg shadow-red-500/40
          ring-4 ring-red-500/20
          hover:shadow-xl hover:shadow-red-500/50
          hover:scale-105
          active:scale-95
          transition-all duration-200
          group
        "
        style={{
          // Clear BottomNav (~60px height) + safe area + 16px gap
          bottom: 'calc(60px + env(safe-area-inset-bottom, 0px) + 1rem)',
        }}
      >
        {/* Pulsing ring (subtle) */}
        <span
          className="
            absolute inset-0 rounded-full
            bg-red-500/30
            animate-ping
            pointer-events-none
          "
          style={{ animationDuration: '2.5s' }}
        />

        {/* Icon */}
        <span
          className="material-symbols-outlined text-white text-2xl leading-none relative z-10"
          style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}
        >
          sos
        </span>

        {/* Label */}
        <span className="text-white text-[9px] font-extrabold mt-0.5 leading-none relative z-10 tracking-wider">
          SOS
        </span>
      </button>

      {/* Modal — render conditionally untuk avoid mount cost saat closed */}
      {open && <SosModal onClose={() => setOpen(false)} />}
    </>
  );
}
