'use client';

/**
 * TeraLoka — useAdView hook
 * SESI 11 (31 Mei 2026)
 * ------------------------------------------------------------
 * Sensor viewability standar IAB buat impresi iklan:
 *   - Iklan dihitung 1 impresi kalau ≥50% badannya keliatan di viewport
 *     SELAMA minimal 1 detik tanpa putus.
 *   - Fire SEKALI per mount (scroll naik-turun gak numpuk).
 *   - Kalau iklan keluar viewport sebelum 1 detik → timer batal (gak dihitung).
 *
 * Pemakaian (per komponen banner):
 *   const viewRef = useAdView(ad.id);
 *   return <div ref={viewRef}> ...banner... </div>;
 *
 * Aman SSR: observer cuma jalan di client (useEffect). Admin/preview gak
 * kehitung selama hook ini cuma dipasang di komponen render PUBLIK.
 *
 * PATH: src/hooks/useAdView.ts
 */

import { useEffect, useRef } from 'react';
import { queueImpression } from '@/lib/adTracking';

const VISIBLE_RATIO = 0.5;   // IAB: ≥50% piksel keliatan
const DWELL_MS = 1000;       // IAB: nempel ≥1 detik

export function useAdView<T extends HTMLElement = HTMLDivElement>(
  adId: string | null | undefined,
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !adId) return;
    if (typeof IntersectionObserver === 'undefined') return;

    let fired = false;
    let dwellTimer: ReturnType<typeof setTimeout> | null = null;

    const clearDwell = () => {
      if (dwellTimer) {
        clearTimeout(dwellTimer);
        dwellTimer = null;
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        const visible =
          entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO;

        if (visible && !fired) {
          // Mulai hitung dwell 1 detik (kalau belum jalan)
          if (!dwellTimer) {
            dwellTimer = setTimeout(() => {
              fired = true;
              clearDwell();
              queueImpression(adId);
              observer.disconnect(); // selesai — fire 1x per mount
            }, DWELL_MS);
          }
        } else {
          // Keluar viewport / di bawah 50% sebelum 1 detik → batalin
          clearDwell();
        }
      },
      { threshold: [0, VISIBLE_RATIO, 1] },
    );

    observer.observe(el);

    return () => {
      clearDwell();
      observer.disconnect();
    };
  }, [adId]);

  return ref;
}
