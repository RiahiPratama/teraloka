'use client';

/**
 * TeraLoka — RegionPicker
 * Mission 8 Sub-Phase 8-D Batch C3
 * ────────────────────────────────────────────────────────────────
 * 2 exports dari 1 file (related concerns co-located):
 *
 * 1. RegionPickerModal — modal full picker dengan grid region MalUt
 *    Auto-show kalau isFirstVisit (di slug page mount)
 *    Manual show via openPicker() dari useRegion()
 *
 * 2. RegionChip — chip button kecil untuk navbar (header)
 *    Display: "📍 Ternate ▾"
 *    Click → openPicker() (reuse Modal)
 *
 * History:
 *   - 16 Mei 2026: NEW (Sub-Phase 8-D Batch C3)
 */

import { useEffect, useCallback } from 'react';
import { MapPin, X, ChevronDown, Check } from 'lucide-react';
import { useRegion } from '@/contexts/RegionContext';

// ════════════════════════════════════════════════════════════════
// COMPONENT 1: RegionPickerModal — full picker dengan grid
// ════════════════════════════════════════════════════════════════

export function RegionPickerModal() {
  const {
    region,
    regions,
    setRegion,
    pickerOpen,
    closePicker,
    isFirstVisit,
    dismissFirstVisit,
  } = useRegion();

  // ESC to close
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePicker();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [pickerOpen, closePicker]);

  // Body scroll lock saat modal open
  useEffect(() => {
    if (!pickerOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [pickerOpen]);

  if (!pickerOpen) return null;

  const handleSelect = (slug: string) => {
    setRegion(slug);
    closePicker();
  };

  const handleSelectAll = () => {
    setRegion(null);
    closePicker();
  };

  const handleSkip = () => {
    dismissFirstVisit();
    closePicker();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="region-picker-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isFirstVisit) {
          closePicker();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #1B6B4A, #0891B2)' }}>
              <MapPin size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 id="region-picker-title" className="text-base font-extrabold text-gray-900 leading-tight">
                Pilih wilayahmu
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Supaya iklan & info relevan dengan daerahmu
              </p>
            </div>
          </div>

          {/* Close (X) — hanya tampil kalau bukan first-visit */}
          {!isFirstVisit && (
            <button
              type="button"
              onClick={closePicker}
              aria-label="Tutup"
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content — Region grid */}
        <div className="p-6">
          {/* "Semua Maluku Utara" — top featured option */}
          <button
            type="button"
            onClick={handleSelectAll}
            className={`w-full mb-4 px-4 py-3.5 rounded-xl border-2 flex items-center justify-between transition-all ${
              region === null
                ? 'border-emerald-700 bg-emerald-50'
                : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl shrink-0">🌏</span>
              <div className="text-left min-w-0">
                <p className="text-sm font-bold text-gray-900">Semua Maluku Utara</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Lihat semua iklan & berita dari seluruh wilayah
                </p>
              </div>
            </div>
            {region === null && (
              <Check size={20} className="text-emerald-700 shrink-0" />
            )}
          </button>

          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              atau pilih kabupaten/kota
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Grid 3-col untuk 11 regions */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {regions.map((r) => {
              const isActive = r.slug === region;
              const isSofifi = r.slug === 'sofifi';

              return (
                <button
                  key={r.slug}
                  type="button"
                  onClick={() => handleSelect(r.slug)}
                  className={`relative px-3 py-3 rounded-xl border-2 text-left transition-all ${
                    isActive
                      ? 'border-emerald-700 bg-emerald-50'
                      : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30'
                  }`}
                >
                  <p className="text-sm font-bold text-gray-900 leading-tight">
                    {r.short_label}
                  </p>
                  {isSofifi && (
                    <p className="text-[9px] text-emerald-700 font-semibold mt-0.5">
                      Ibu Kota Provinsi
                    </p>
                  )}
                  {isActive && (
                    <Check size={14} className="absolute top-2 right-2 text-emerald-700" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer — Skip option (first-visit only) */}
        {isFirstVisit && (
          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-between">
            <p className="text-[11px] text-gray-500 leading-tight">
              Kamu bisa ganti wilayah kapan saja dari menu atas
            </p>
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 underline"
            >
              Lewati & pilih nanti
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// COMPONENT 2: RegionChip — chip toggle untuk navbar
// ════════════════════════════════════════════════════════════════

interface RegionChipProps {
  /** Optional CSS class untuk wrapper. */
  className?: string;
  /** Variant: 'full' (display label) atau 'compact' (icon + short_label). */
  variant?: 'full' | 'compact';
}

export function RegionChip({ className = '', variant = 'compact' }: RegionChipProps) {
  const { shortLabel, label, openPicker, region } = useRegion();

  const display = variant === 'compact' ? shortLabel : label;
  const isAll   = region === null;

  return (
    <button
      type="button"
      onClick={openPicker}
      aria-label={`Wilayah aktif: ${label}. Klik untuk ganti.`}
      aria-haspopup="dialog"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
        isAll
          ? 'border-gray-200 bg-gray-50 hover:bg-gray-100'
          : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
      } ${className}`}
    >
      <MapPin size={12} className={isAll ? 'text-gray-500' : 'text-emerald-700'} />
      <span className={`text-[12px] font-bold ${isAll ? 'text-gray-700' : 'text-emerald-900'}`}>
        {display}
      </span>
      <ChevronDown size={11} className={isAll ? 'text-gray-400' : 'text-emerald-600'} />
    </button>
  );
}

// ════════════════════════════════════════════════════════════════
// COMPONENT 3: AutoOpenFirstVisit — auto-show modal di slug page mount
// ════════════════════════════════════════════════════════════════

/**
 * Auto-open RegionPickerModal kalau first-visit. Render di slug page.
 *
 * Usage di slug page:
 *   <RegionFirstVisitTrigger />
 *
 * Logic:
 *   - isFirstVisit true + pickerOpen false → openPicker()
 *   - Effect runs once on mount via empty deps array.
 */
export function RegionFirstVisitTrigger() {
  const { isFirstVisit, pickerOpen, openPicker } = useRegion();

  useEffect(() => {
    if (isFirstVisit && !pickerOpen) {
      // Slight delay supaya user gak kaget langsung modal pop saat slug page load
      const timer = setTimeout(() => openPicker(), 800);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirstVisit]);

  return null;
}
