'use client';

/**
 * useMobileCarousel — primitive carousel mobile (style-agnostic)
 * ------------------------------------------------------------
 * Foundation piece #1 untuk mobile UX TeraLoka (BALAPOR landing sekarang,
 * BAKABAR mobile nanti). Hook ini HANYA ngurus logika:
 *   - ref ke track (container scroll-snap horizontal)
 *   - auto-advance (cuma aktif di mobile via matchMedia + cuma kalau track keliatan)
 *   - pause saat user interaksi (touch/pointer/hover)
 *   - sync index aktif saat user swipe manual
 *   - goTo(i) buat dot indicator
 *
 * PENTING — anti page-jump:
 *   Scroll dilakukan HORIZONTAL-ONLY di dalam track (track.scrollTo({left})),
 *   BUKAN scrollIntoView. scrollIntoView bisa maksa halaman scroll vertikal
 *   balik ke carousel saat ada di luar viewport (ganggu user). Track scroll
 *   horizontal gak pernah nyentuh scroll vertikal window.
 *
 *   Tambahan: IntersectionObserver gate autoplay → cuma geser kalau track
 *   lagi keliatan di layar.
 *
 * Styling (grid desktop ↔ flex carousel mobile) DILUAR scope hook ini —
 * di-handle via CSS media query di masing-masing section. Hook style-agnostic
 * biar bisa dipake di dunia inline-style (landing) maupun Tailwind (BAKABAR).
 */

import { useEffect, useRef, useState } from 'react';

interface UseMobileCarouselOptions {
  /** Interval auto-advance (ms). Default 4500. */
  intervalMs?: number;
  /** Breakpoint mobile (px). Auto-advance cuma aktif di bawah ini. Default 768. */
  breakpoint?: number;
}

export function useMobileCarousel<T extends HTMLElement = HTMLDivElement>(
  itemCount: number,
  options: UseMobileCarouselOptions = {},
) {
  const intervalMs = options.intervalMs ?? 4500;
  const breakpoint = options.breakpoint ?? 768;

  const trackRef = useRef<T | null>(null);
  const [active, setActive] = useState(0);
  const pausedRef = useRef(false);
  const visibleRef = useRef(true);

  /**
   * Scroll track ke card index i — HORIZONTAL-ONLY, center-aligned.
   * Pakai getBoundingClientRect (robust, gak peduli offsetParent) + hitung
   * delta relatif ke scrollLeft track. TIDAK pernah scroll window vertikal.
   */
  const scrollToIndex = (i: number) => {
    const track = trackRef.current;
    const child = track?.children[i] as HTMLElement | undefined;
    if (!track || !child) return;
    const trackRect = track.getBoundingClientRect();
    const childRect = child.getBoundingClientRect();
    const delta =
      (childRect.left - trackRect.left) - (track.clientWidth - child.clientWidth) / 2;
    track.scrollTo({ left: track.scrollLeft + delta, behavior: 'smooth' });
  };

  const goTo = (i: number) => {
    setActive(i);
    scrollToIndex(i);
  };

  // Track keliatan di viewport? (gate autoplay biar gak geser saat off-screen)
  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => { visibleRef.current = entries[0]?.isIntersecting ?? true; },
      { threshold: 0.2 },
    );
    io.observe(track);
    return () => io.disconnect();
  }, []);

  // Sync index aktif saat user swipe manual (debounce via rAF)
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const trackRect = track.getBoundingClientRect();
        const center = trackRect.left + track.clientWidth / 2;
        let nearest = 0;
        let best = Infinity;
        for (let i = 0; i < track.children.length; i++) {
          const c = track.children[i] as HTMLElement;
          const r = c.getBoundingClientRect();
          const cc = r.left + r.width / 2;
          const d = Math.abs(cc - center);
          if (d < best) { best = d; nearest = i; }
        }
        setActive((prev) => (prev === nearest ? prev : nearest));
      });
    };

    track.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      track.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [itemCount]);

  // Auto-advance (mobile only + track keliatan) + pause saat interaksi
  useEffect(() => {
    if (typeof window === 'undefined' || itemCount <= 1) return;

    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      if (pausedRef.current || !visibleRef.current) return;
      setActive((prev) => {
        const next = (prev + 1) % itemCount;
        scrollToIndex(next);
        return next;
      });
    };

    const start = () => {
      if (mq.matches && !timer) timer = setInterval(tick, intervalMs);
    };
    const stop = () => {
      if (timer) { clearInterval(timer); timer = null; }
    };
    const onMqChange = () => { stop(); start(); };

    start();
    mq.addEventListener?.('change', onMqChange);

    const track = trackRef.current;
    const pause = () => { pausedRef.current = true; };
    const resume = () => { pausedRef.current = false; };
    track?.addEventListener('pointerdown', pause);
    track?.addEventListener('mouseenter', pause);
    track?.addEventListener('touchstart', pause, { passive: true });
    window.addEventListener('pointerup', resume);
    track?.addEventListener('mouseleave', resume);
    window.addEventListener('touchend', resume, { passive: true });

    return () => {
      stop();
      mq.removeEventListener?.('change', onMqChange);
      track?.removeEventListener('pointerdown', pause);
      track?.removeEventListener('mouseenter', pause);
      track?.removeEventListener('touchstart', pause);
      window.removeEventListener('pointerup', resume);
      track?.removeEventListener('mouseleave', resume);
      window.removeEventListener('touchend', resume);
    };
  }, [itemCount, intervalMs, breakpoint]);

  return { trackRef, active, goTo };
}
