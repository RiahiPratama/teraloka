'use client';

/**
 * TeraLoka — Ad Tracking Beacon (client-side)
 * SESI 11 (31 Mei 2026)
 * ------------------------------------------------------------
 * Kumpulin impresi (dari useAdView — viewability IAB 50%/1 detik) + klik,
 * lalu kirim batch ke POST /public/ads/track via navigator.sendBeacon
 * (reliable walau user pindah halaman). Pengganti auto-fire server-side
 * lama yang ngitung tiap refresh.
 *
 * API:
 *   - queueImpression(id) : dipanggil useAdView pas iklan LULUS viewability
 *   - queueClick(id)      : dipanggil saat user klik iklan (langsung flush)
 *   - flushAdTracking()   : kirim semua yg pending sekarang (dipakai internal)
 *
 * Dedup: Set → 1 iklan kehitung sekali per sesi-halaman (sebelum flush).
 * Flush triggers:
 *   - impresi  → debounce 4 detik (biar gak spam request)
 *   - klik     → langsung (user mungkin segera pindah halaman)
 *   - tab hidden (visibilitychange) + pagehide → catch-all sebelum unload
 *
 * PATH: src/lib/adTracking.ts
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';
const TRACK_URL = `${API_URL}/public/ads/track`;

// Module-level pending queues (per browser tab/bundle)
const pendingImpressions = new Set<string>();
const pendingClicks = new Set<string>();

let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersBound = false;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined';
}

/**
 * Kirim payload. Prioritas: sendBeacon (reliable saat unload, non-blocking).
 * Fallback: fetch keepalive kalau sendBeacon gak tersedia / nolak.
 */
function sendPayload(payload: { impressions: string[]; clicks: string[] }): boolean {
  const json = JSON.stringify(payload);

  if (typeof navigator.sendBeacon === 'function') {
    try {
      // Blob type application/json → Hono c.req.json() bisa parse
      const blob = new Blob([json], { type: 'application/json' });
      if (navigator.sendBeacon(TRACK_URL, blob)) return true;
    } catch {
      /* fallthrough ke fetch */
    }
  }

  try {
    // keepalive: request tetap jalan walau halaman lagi unload
    void fetch(TRACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json,
      keepalive: true,
    }).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

export function flushAdTracking(): void {
  if (!isBrowser()) return;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const impressions = [...pendingImpressions];
  const clicks = [...pendingClicks];
  if (impressions.length === 0 && clicks.length === 0) return;

  const sent = sendPayload({ impressions, clicks });
  if (sent) {
    pendingImpressions.clear();
    pendingClicks.clear();
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushAdTracking();
  }, 4000);
}

function bindListenersOnce(): void {
  if (listenersBound || !isBrowser()) return;
  listenersBound = true;
  // tab disembunyiin / pindah → flush. Paling reliable buat mobile + desktop.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAdTracking();
  });
  window.addEventListener('pagehide', () => flushAdTracking());
}

/**
 * Catat 1 impresi (iklan beneran keliatan ≥50% selama ≥1 detik).
 * Idempoten dalam 1 batch: id sama gak numpuk.
 */
export function queueImpression(adId: string): void {
  if (!isBrowser() || !adId) return;
  bindListenersOnce();
  if (pendingImpressions.has(adId)) return;
  pendingImpressions.add(adId);
  scheduleFlush();
}

/**
 * Catat 1 klik. Langsung flush — user kemungkinan segera pindah halaman.
 */
export function queueClick(adId: string): void {
  if (!isBrowser() || !adId) return;
  bindListenersOnce();
  pendingClicks.add(adId);
  flushAdTracking();
}
