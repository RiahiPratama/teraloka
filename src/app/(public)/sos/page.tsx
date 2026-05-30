'use client';

/**
 * TeraLoka — SOS Direct Page
 * Bridge Sprint Day 12 Step 6 (10 Mei 2026)
 * ------------------------------------------------------------
 * Dedicated landing page untuk PWA shortcut.
 *
 * Flow:
 *   - User long-press TeraLoka icon di home screen
 *   - Tap "SOS Darurat" shortcut
 *   - PWA buka /sos route langsung
 *   - Modal SOS auto-open
 *   - 2 detik dari home screen ke SOS form (UX panic mode)
 *
 * Behavior:
 *   - Auto-open modal saat mount
 *   - Background: minimal landing dengan info hotline
 *   - Saat modal close: redirect ke homepage (atau tetap di /sos)
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SosModal } from '@/components/balapor/sos-modal';

export default function SosDirectPage() {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  // Saat modal close, redirect ke homepage
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => router.push('/'), 200);
      return () => clearTimeout(timer);
    }
  }, [open, router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-amber-50">
      {/* Background landing — minimal */}
      <div className="max-w-md mx-auto px-5 py-12 text-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#EF4444] to-[#DC2626] shadow-xl shadow-red-500/30 mb-4">
          <span
            className="material-symbols-outlined text-white text-5xl"
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}
          >
            sos
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900">Tombol Darurat</h1>
        <p className="text-sm text-gray-600 mt-2">
          Siaran daruratmu dikirim ke tim TeraLoka &amp; komunitas sekitar. Untuk pertolongan langsung, telepon nomor darurat resmi di bawah.
        </p>

        {/* Hotline langsung visible (kalau modal somehow gak buka) */}
        <div className="mt-8 rounded-2xl bg-white border-2 border-amber-300 p-4 text-left">
          <p className="text-sm font-extrabold text-amber-900 mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-700">
              phone_in_talk
            </span>
            Darurat? Telepon sekarang:
          </p>
          <a
            href="tel:112"
            className="mb-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#EF4444] to-[#DC2626] p-3.5 text-center text-white shadow-lg shadow-red-500/25 active:scale-95 transition"
          >
            <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>call</span>
            <span className="text-base font-extrabold">112 · Panggilan Darurat Nasional</span>
          </a>
          <p className="text-[11px] text-amber-700/90 mb-3 leading-snug">
            Nomor 112 gratis &amp; aktif 24 jam dari seluruh Indonesia — operator akan meneruskan ke instansi terdekat (Damkar, Polisi, Ambulans, Basarnas).
          </p>
          <div className="grid grid-cols-2 gap-2">
            <a
              href="tel:115"
              className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center hover:bg-amber-100 active:scale-95 transition"
            >
              <p className="text-[10px] text-amber-700 font-bold uppercase">Basarnas</p>
              <p className="text-xl font-extrabold text-amber-900 mt-0.5">115</p>
            </a>
            <a
              href="tel:113"
              className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center hover:bg-amber-100 active:scale-95 transition"
            >
              <p className="text-[10px] text-amber-700 font-bold uppercase">Damkar</p>
              <p className="text-xl font-extrabold text-amber-900 mt-0.5">113</p>
            </a>
            <a
              href="tel:110"
              className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center hover:bg-amber-100 active:scale-95 transition"
            >
              <p className="text-[10px] text-amber-700 font-bold uppercase">Polisi</p>
              <p className="text-xl font-extrabold text-amber-900 mt-0.5">110</p>
            </a>
            <a
              href="tel:118"
              className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center hover:bg-amber-100 active:scale-95 transition"
            >
              <p className="text-[10px] text-amber-700 font-bold uppercase">Ambulans</p>
              <p className="text-xl font-extrabold text-amber-900 mt-0.5">118</p>
            </a>
          </div>
        </div>

        {/* Re-open modal kalau accidentally closed */}
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-6 rounded-2xl bg-gradient-to-br from-[#EF4444] to-[#DC2626] text-white font-extrabold px-6 py-3 shadow-lg shadow-red-500/30 active:scale-[0.98]"
          >
            Buka Form SOS
          </button>
        )}
      </div>

      {/* Modal */}
      {open && <SosModal onClose={() => setOpen(false)} />}
    </main>
  );
}
