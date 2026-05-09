'use client';

/**
 * TeraLoka — PhotoLightbox (Modal Card Redesign)
 * Sub-Sprint 1C-C-13 TD-062 Extended (9 Mei 2026)
 * ------------------------------------------------------------
 * Modal dialog untuk admin review foto bukti laporan.
 *
 * Redesign rationale:
 *   - Old: fullscreen lightbox (gallery pattern) — image fills viewport
 *   - New: contained modal card (dialog pattern) — feels like proper modal
 *
 * Features:
 * - Backdrop dimmed dengan blur-md
 * - Modal card max-w-5xl max-h-[90vh] — contained dialog
 * - Header dengan title + counter + close X
 * - Image area inside card (max-h-[60vh] for breathing room)
 * - Footer thumbnail strip kalau >1 foto
 * - Prev/Next arrows inside image area
 * - ESC to close, click backdrop to close
 * - Keyboard ← → navigate
 * - Body scroll locked
 * - Surface bg (light theme aware)
 */

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Foto laporan ${reportTitle || 'BALAPOR'}`}
    >
      {/* ── MODAL CARD ── */}
      <div
        className={cn(
          'relative w-full max-w-5xl max-h-[90vh]',
          'bg-surface border border-border rounded-2xl shadow-2xl',
          'flex flex-col overflow-hidden',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <header className="shrink-0 px-5 py-3 border-b border-border bg-surface-muted/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-8 w-8 rounded-lg bg-balapor/10 flex items-center justify-center shrink-0">
              <ImageIcon size={16} className="text-balapor" />
            </div>
            <div className="min-w-0">
              {reportDisplayId && (
                <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                  {reportDisplayId}
                </div>
              )}
              {reportTitle && (
                <div className="text-sm font-semibold text-text truncate">
                  {reportTitle}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {total > 1 && (
              <span className="text-xs text-text-muted tabular-nums font-mono px-2 py-1 bg-surface-muted rounded-md">
                {currentIndex + 1} / {total}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-7 w-7 rounded-md flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
              aria-label="Tutup"
              title="Tutup (ESC)"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* ── Image Area ── */}
        <div className="relative flex-1 overflow-hidden bg-surface-muted/20 flex items-center justify-center p-4 min-h-[400px]">
          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-2 border-text-muted/30 border-t-balapor animate-spin" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-text-muted">
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
              className="max-w-full max-h-[60vh] object-contain rounded-lg"
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
            />
          )}

          {/* Prev arrow (inside image area) */}
          {currentIndex > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((i) => i - 1);
              }}
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2',
                'h-9 w-9 rounded-full',
                'bg-surface border border-border shadow-lg',
                'flex items-center justify-center',
                'text-text-muted hover:text-text hover:bg-surface-muted',
                'transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-balapor/30',
              )}
              aria-label="Foto sebelumnya"
              title="← Sebelumnya"
            >
              <ChevronLeft size={18} />
            </button>
          )}

          {/* Next arrow (inside image area) */}
          {currentIndex < total - 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((i) => i + 1);
              }}
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2',
                'h-9 w-9 rounded-full',
                'bg-surface border border-border shadow-lg',
                'flex items-center justify-center',
                'text-text-muted hover:text-text hover:bg-surface-muted',
                'transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-balapor/30',
              )}
              aria-label="Foto selanjutnya"
              title="Selanjutnya →"
            >
              <ChevronRight size={18} />
            </button>
          )}
        </div>

        {/* ── Thumbnail Strip Footer (only if >1 photo) ── */}
        {total > 1 && (
          <footer className="shrink-0 px-5 py-3 border-t border-border bg-surface-muted/40">
            <div className="flex gap-2 justify-center overflow-x-auto">
              {photos.map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={cn(
                    'shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-balapor/30',
                    i === currentIndex
                      ? 'border-balapor scale-105 shadow-md'
                      : 'border-border opacity-60 hover:opacity-100 hover:border-text-muted',
                  )}
                  aria-label={`Foto ${i + 1}`}
                  title={`Foto ${i + 1}`}
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
          </footer>
        )}
      </div>
    </div>
  );
}
