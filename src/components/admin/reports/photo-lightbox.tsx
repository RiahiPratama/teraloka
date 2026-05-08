'use client';

/**
 * TeraLoka — PhotoLightbox
 * Sub-Sprint 1C-C-10 — Admin photo evidence viewer
 * ------------------------------------------------------------
 * Fullscreen photo gallery modal untuk admin review foto bukti laporan.
 *
 * Features:
 * - Fullscreen overlay dengan backdrop dimmed
 * - Prev/Next arrow navigation
 * - Counter "1 / N"
 * - ESC to close
 * - Click backdrop to close
 * - Keyboard: ← → untuk navigate
 * - Loading state per image
 * - Image error fallback
 *
 * Usage:
 *   <PhotoLightbox
 *     photos={['url1', 'url2']}
 *     initialIndex={0}
 *     reportTitle="Laporan A"
 *     onClose={() => setLightbox(null)}
 *   />
 */

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Image as ImageIcon } from 'lucide-react';

export interface PhotoLightboxProps {
  /** Array URL foto untuk display */
  photos: string[] | null;
  /** Index awal (default 0) */
  initialIndex?: number;
  /** Title laporan untuk context header */
  reportTitle?: string;
  /** Display ID laporan (BL-2026-XXXX) */
  reportDisplayId?: string | null;
  /** Callback close */
  onClose: () => void;
}

export function PhotoLightbox({
  photos,
  initialIndex = 0,
  reportTitle,
  reportDisplayId,
  onClose,
}: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const total = photos?.length ?? 0;
  const currentPhoto = photos?.[currentIndex];

  // Reset loading state on photo change
  useEffect(() => {
    setLoading(true);
    setError(false);
  }, [currentIndex]);

  // Keyboard nav: ESC close, arrows navigate
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex((i) => i - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < total - 1) {
        setCurrentIndex((i) => i + 1);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex, total, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!photos || photos.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Foto laporan ${reportTitle || 'BALAPOR'}`}
    >
      {/* Top bar — title + counter + close */}
      <div
        className="absolute top-0 inset-x-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <ImageIcon size={18} className="text-white/80 shrink-0" />
          <div className="min-w-0">
            {reportDisplayId && (
              <div className="text-[10px] font-mono text-white/60 uppercase tracking-wider">
                {reportDisplayId}
              </div>
            )}
            {reportTitle && (
              <div className="text-sm font-semibold text-white truncate">
                {reportTitle}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-white/70 tabular-nums font-mono">
            {currentIndex + 1} / {total}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Image container */}
      <div
        className="relative max-w-7xl max-h-[85vh] mx-auto w-full px-4"
        onClick={(e) => e.stopPropagation()}
      >
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-white/70">
            <div className="text-center">
              <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Gagal memuat foto</p>
              <p className="text-xs mt-1 font-mono opacity-60 truncate max-w-md">
                {currentPhoto}
              </p>
            </div>
          </div>
        )}
        {currentPhoto && !error && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={currentPhoto}
            alt={`Foto bukti ${currentIndex + 1} dari ${total}`}
            className="max-w-full max-h-[85vh] mx-auto object-contain rounded-lg shadow-2xl"
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
          />
        )}
      </div>

      {/* Prev arrow */}
      {currentIndex > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setCurrentIndex((i) => i - 1);
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          aria-label="Foto sebelumnya"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Next arrow */}
      {currentIndex < total - 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setCurrentIndex((i) => i + 1);
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          aria-label="Foto selanjutnya"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Bottom thumbnail strip (hide on mobile, useful for >2 photos) */}
      {total > 1 && (
        <div
          className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/60 to-transparent hidden sm:block"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-2 justify-center overflow-x-auto">
            {photos.map((url, i) => (
              <button
                key={`${url}-${i}`}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={`shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${
                  i === currentIndex
                    ? 'border-white scale-110'
                    : 'border-white/30 opacity-60 hover:opacity-100'
                }`}
                aria-label={`Foto ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
