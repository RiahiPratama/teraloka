'use client';

/**
 * TeraLoka — PhotoPolicyNotice
 * BALAPOR Pre-Launch Polish — Day 2 Photo Policy
 * ------------------------------------------------------------
 * Inline notice + checkbox gate untuk photo upload di /balapor/buat-laporan.
 *
 * Behavior:
 *   - Kalau !agreed: render full notice + checkbox required
 *   - Kalau agreed: render compact summary "Sudah disetujui ✓" + edit link
 *
 * Style: match lapor page palette (red BALAPOR #EF4444, gray neutral).
 */

import Link from 'next/link';

interface PhotoPolicyNoticeProps {
  agreed: boolean;
  onAgreedChange: (agreed: boolean) => void;
}

export function PhotoPolicyNotice({ agreed, onAgreedChange }: PhotoPolicyNoticeProps) {
  if (agreed) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-3">
        <span
          className="material-symbols-outlined text-emerald-600 text-base shrink-0 mt-0.5"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          check_circle
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-emerald-700">
            Aturan foto bukti sudah disetujui
          </p>
          <p className="text-xs text-emerald-600 mt-0.5">
            Silakan upload foto sesuai panduan.{' '}
            <button
              type="button"
              onClick={() => onAgreedChange(false)}
              className="underline font-semibold hover:text-emerald-700"
            >
              Lihat aturan lagi
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-[#EF4444]/20 bg-gradient-to-br from-red-50 to-orange-50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#EF4444] to-[#DC2626] flex items-center justify-center shrink-0">
          <span
            className="material-symbols-outlined text-white text-base"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            photo_camera
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-extrabold text-gray-900">Aturan Foto Bukti</h3>
          <p className="text-[11px] text-gray-500">
            Baca dulu sebelum upload — biar laporan kamu gak ditolak
          </p>
        </div>
      </div>

      {/* Allowed */}
      <div className="rounded-xl bg-white/70 border border-emerald-200 p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <span
            className="material-symbols-outlined text-emerald-600 text-base"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
          <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider">
            Yang Diizinkan
          </span>
        </div>
        <ul className="space-y-1 text-xs text-gray-700 ml-1">
          <li className="flex gap-1.5">
            <span className="text-emerald-500 shrink-0">•</span>
            <span>Infrastruktur fisik (jalan, jembatan, got, lampu)</span>
          </li>
          <li className="flex gap-1.5">
            <span className="text-emerald-500 shrink-0">•</span>
            <span>Lingkungan (sampah, banjir, kerusakan alam)</span>
          </li>
          <li className="flex gap-1.5">
            <span className="text-emerald-500 shrink-0">•</span>
            <span>Bangunan dan area umum</span>
          </li>
        </ul>
      </div>

      {/* Prohibited */}
      <div className="rounded-xl bg-white/70 border border-red-200 p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <span
            className="material-symbols-outlined text-[#DC2626] text-base"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            block
          </span>
          <span className="text-xs font-extrabold text-[#DC2626] uppercase tracking-wider">
            Yang Dilarang
          </span>
        </div>
        <ul className="space-y-1 text-xs text-gray-700 ml-1">
          <li className="flex gap-1.5">
            <span className="text-[#EF4444] shrink-0">•</span>
            <span>Wajah orang tanpa persetujuan</span>
          </li>
          <li className="flex gap-1.5">
            <span className="text-[#EF4444] shrink-0">•</span>
            <span>Plat kendaraan (kecuali pelanggaran lalu lintas)</span>
          </li>
          <li className="flex gap-1.5">
            <span className="text-[#EF4444] shrink-0">•</span>
            <span>Anak di bawah umur</span>
          </li>
          <li className="flex gap-1.5">
            <span className="text-[#EF4444] shrink-0">•</span>
            <span>Dokumen pribadi (KTP, KK, dll)</span>
          </li>
        </ul>
      </div>

      {/* Warning */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-start gap-2">
        <span
          className="material-symbols-outlined text-amber-600 text-sm shrink-0 mt-0.5"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          warning
        </span>
        <p className="text-xs text-amber-700 font-medium leading-relaxed">
          Foto yang melanggar aturan akan menyebabkan laporan ditolak oleh admin.
        </p>
      </div>

      {/* Checkbox + detail link */}
      <div className="space-y-2 pt-1">
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => onAgreedChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#EF4444] shrink-0"
          />
          <span className="text-sm font-semibold text-gray-800 leading-snug">
            Saya mengerti aturan ini dan akan upload foto sesuai panduan
          </span>
        </label>

        <div className="text-center">
          <Link
            href="/aturan/balapor/foto-bukti"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#003526] font-semibold hover:underline inline-flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-xs">menu_book</span>
            Baca aturan lengkap
            <span className="material-symbols-outlined text-xs">open_in_new</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
