'use client';

// ════════════════════════════════════════════════════════════════
// PRAYER BREAKING BAR — v6 active-window (31 Mei 2026)
// PATH: src/components/bakabar/PrayerBreakingBar.tsx
// ────────────────────────────────────────────────────────────────
//
// History v6-active-window (31 Mei 2026):
//   - FIX UX: dulu begitu masuk waktu shalat (mis. Ashar 15:53), bar
//     LANGSUNG loncat ke shalat berikutnya (Maghrib) → bingung, padahal
//     lagi WAKTU Ashar. Sekarang: selama dalam window aktif, tampil
//     "🕌 Waktu Ashar" (tanpa countdown). Lewat window → countdown
//     ke shalat berikutnya (perilaku lama).
//   - Window aktif: Subuh = 60 menit, shalat lain = 20 menit.
//   - computeNextPrayer → computePrayerStatus (return mode 'active'|'next').
//
// History v5b-jumat-badge-tooltip (kept):
//   - Custom CSS tooltip badge 📿 (no cursor-help), Friday-only reminder.
//   - "Dzuhur" ALWAYS (no Friday switch, match KEMENAG/Aladhan).
//   - Prayer times dari backend /content/prayer-times (Aladhan, ±1-2 mnt).
//
// Architectural lock:
//   - Frontend = Wajah only. Zero hardcoded prayer table.
//   - Backend = Otak. Aladhan integration di teraloka-api.
// ════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// Ternate representative coords untuk Maluku Utara (provincial capital)
const TERNATE_LAT = -0.79;
const TERNATE_LNG = 127.37;

// Prayer names — ALWAYS use this array (no Friday switch per KEMENAG convention)
const PRAYER_NAMES = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'] as const;

// Window "sedang berlangsung" per shalat (menit). Lewat window → countdown
// ke shalat berikutnya. Subuh lebih panjang (60 mnt) karena rentang Subuh
// memang lama (sampai mendekati syuruq); shalat lain 20 mnt.
const ACTIVE_WINDOW_MIN = 20;
const SUBUH_WINDOW_MIN   = 60;

// Breaking news: aktif 12 jam sejak terbit, rotasi 6 dtk, poll 3 mnt.
// (Window di-compute di frontend untuk sekarang — TODO pindah ke backend
//  endpoint /content/articles/breaking saat volume artikel naik.)
const BREAKING_WINDOW_MS = 12 * 60 * 60 * 1000;
const BREAKING_ROTATE_MS = 6000;
const BREAKING_POLL_MS   = 180000;

interface PrayerTimesData {
  Fajr:    string;
  Dhuhr:   string;
  Asr:     string;
  Maghrib: string;
  Isha:    string;
}

interface BreakingItem {
  id:    string;
  text:  string;
  link?: string;
}

interface PrayerStatusInfo {
  /** 'active' = lagi dalam window shalat sekarang; 'next' = hitung mundur berikutnya */
  mode:         'active' | 'next';
  name:         string;
  time:         string;
  countdownMin: number;   // dipakai hanya saat mode 'next'
  nextDay:      boolean;
  isFriday:     boolean;
}

// ── Helpers ────────────────────────────────────────────────────

function getMalUtDateTime(): { hour: number; minute: number; isFriday: boolean } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jayapura',
    hour:     'numeric',
    minute:   'numeric',
    hour12:   false,
    weekday:  'short',
  });
  const parts = fmt.formatToParts(new Date());
  return {
    hour:     parseInt(parts.find(p => p.type === 'hour')!.value),
    minute:   parseInt(parts.find(p => p.type === 'minute')!.value),
    isFriday: parts.find(p => p.type === 'weekday')!.value === 'Fri',
  };
}

function formatMalUtDate(d: Date): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jayapura',
    year:     'numeric',
    month:    '2-digit',
    day:      '2-digit',
  });
  return fmt.format(d);
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function formatCountdown(minutes: number): string {
  if (minutes <= 0) return 'sekarang';
  if (minutes < 60) return `${minutes} mnt lagi`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} jam lagi`;
  return `${h}j ${m}mnt lagi`;
}

/**
 * v6: tentukan status shalat.
 *  1) Cari shalat yang TERAKHIR masuk waktunya (start <= now).
 *  2) Kalau masih dalam window aktif (Subuh 60mnt, lain 20mnt) → mode 'active'.
 *  3) Selain itu → mode 'next' (hitung mundur shalat berikutnya, termasuk
 *     wrap ke Subuh besok).
 */
function computePrayerStatus(times: PrayerTimesData): PrayerStatusInfo {
  const { hour, minute, isFriday } = getMalUtDateTime();
  const timesArr = [times.Fajr, times.Dhuhr, times.Asr, times.Maghrib, times.Isha];
  const nowMin   = hour * 60 + minute;

  // 1) shalat yang terakhir masuk (start <= now) hari ini
  let currentIdx = -1;
  for (let i = 0; i < timesArr.length; i++) {
    if (timeToMinutes(timesArr[i]) <= nowMin) currentIdx = i;
  }

  // 2) cek window aktif
  if (currentIdx >= 0) {
    const startMin = timeToMinutes(timesArr[currentIdx]);
    const windowMin = currentIdx === 0 ? SUBUH_WINDOW_MIN : ACTIVE_WINDOW_MIN;
    if (nowMin <= startMin + windowMin) {
      return {
        mode:         'active',
        name:         PRAYER_NAMES[currentIdx],
        time:         timesArr[currentIdx],
        countdownMin: 0,
        nextDay:      false,
        isFriday,
      };
    }
  }

  // 3) shalat berikutnya (hitung mundur)
  for (let i = 0; i < timesArr.length; i++) {
    const prayerMin = timeToMinutes(timesArr[i]);
    if (prayerMin > nowMin) {
      return {
        mode:         'next',
        name:         PRAYER_NAMES[i],
        time:         timesArr[i],
        countdownMin: prayerMin - nowMin,
        nextDay:      false,
        isFriday,
      };
    }
  }

  // wrap → Subuh besok
  return {
    mode:         'next',
    name:         PRAYER_NAMES[0],
    time:         times.Fajr,
    countdownMin: (24 * 60 - nowMin) + timeToMinutes(times.Fajr),
    nextDay:      true,
    isFriday,
  };
}

// ── Fetchers ───────────────────────────────────────────────────

async function fetchPrayerTimesFromBackend(): Promise<PrayerTimesData | null> {
  try {
    const today = formatMalUtDate(new Date());
    const url   = `${API}/content/prayer-times?lat=${TERNATE_LAT}&lng=${TERNATE_LNG}&date=${today}`;
    const res   = await fetch(url);
    const json  = await res.json();
    if (json.success && json.data?.timings) {
      return json.data.timings as PrayerTimesData;
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchBreakingArticles(): Promise<BreakingItem[]> {
  try {
    const res  = await fetch(`${API}/content/articles?limit=40`);
    const data = await res.json();
    if (!data.success || !data.data?.length) return [];

    const now = Date.now();
    return data.data
      .filter((a: any) =>
        a.is_breaking === true &&
        a.published_at &&
        now - new Date(a.published_at).getTime() < BREAKING_WINDOW_MS,
      )
      .slice(0, 5)
      .map((a: any) => ({
        id:   a.id,
        text: a.title,
        link: `/bakabar/${a.slug}`,
      }));
  } catch {
    return [];
  }
}

// ── Component ──────────────────────────────────────────────────

export default function PrayerBreakingBar() {
  const [prayerTimes,   setPrayerTimes]   = useState<PrayerTimesData | null>(null);
  const [breakingItems, setBreakingItems] = useState<BreakingItem[]>([]);
  const [breakingIdx,   setBreakingIdx]   = useState(0);
  const [prayerStatus,  setPrayerStatus]  = useState<PrayerStatusInfo | null>(null);

  useEffect(() => {
    Promise.all([
      fetchPrayerTimesFromBackend(),
      fetchBreakingArticles(),
    ]).then(([times, breaking]) => {
      if (times) {
        setPrayerTimes(times);
        setPrayerStatus(computePrayerStatus(times));
      }
      setBreakingItems(breaking);
    });
  }, []);

  useEffect(() => {
    if (!prayerTimes) return;
    const interval = setInterval(() => {
      setPrayerStatus(computePrayerStatus(prayerTimes));
    }, 60000);
    return () => clearInterval(interval);
  }, [prayerTimes]);

  // Poll breaking tiap 3 menit → breaking baru muncul tanpa reload.
  // Tiap poll, reset rotasi ke item terbaru (prioritas yang paling baru).
  useEffect(() => {
    const id = setInterval(() => {
      fetchBreakingArticles().then((items) => {
        setBreakingItems(items);
        setBreakingIdx(0);
      });
    }, BREAKING_POLL_MS);
    return () => clearInterval(id);
  }, []);

  // Rotasi antar breaking tiap 6 detik (hanya kalau lebih dari 1).
  useEffect(() => {
    if (breakingItems.length < 2) return;
    const id = setInterval(() => {
      setBreakingIdx((i) => (i + 1) % breakingItems.length);
    }, BREAKING_ROTATE_MS);
    return () => clearInterval(id);
  }, [breakingItems.length]);

  if (!prayerStatus) {
    return <div className="px-1 pt-1" style={{ minHeight: 24 }} aria-hidden="true" />;
  }

  const hasBreaking = breakingItems.length > 0;
  const breaking    = breakingItems[Math.min(breakingIdx, breakingItems.length - 1)];
  const isActive    = prayerStatus.mode === 'active';

  return (
    <div className="px-1 pt-1 flex items-center gap-x-3 gap-y-1 flex-wrap md:flex-nowrap text-xs min-w-0">

      {/* ── BREAKING NEWS (kiri, flex-1) ──────────────────────── */}
      {hasBreaking && (
        <div className="flex items-center gap-1.5 w-full md:w-auto md:flex-1 min-w-0 order-1">
          <span className="flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-extrabold tracking-wider text-red-500 text-[10px]">
              BREAKING
            </span>
          </span>
          {breaking.link ? (
            <Link
              href={breaking.link}
              className="font-semibold text-gray-800 truncate hover:text-red-600 transition-colors"
            >
              {breaking.text}
            </Link>
          ) : (
            <span className="font-semibold text-gray-800 truncate">
              {breaking.text}
            </span>
          )}
        </div>
      )}

      {/* ── SHALAT MALUKU UTARA (kanan, ml-auto) ──────────────────
          mode 'active'  : 🕌 Waktu Ashar · Maluku Utara · 15:53
          mode 'next'    : 🕌 Maghrib · Maluku Utara · 18:31 · 2j 38mnt lagi
          Jumat: + badge 📿 (hover → tooltip "Sholat Jumat hari ini") */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto order-2">
        <span className="text-sm" aria-label="Mosque icon">🕌</span>

        {/* Prayer name — brand green. Prefix "Waktu " saat sedang berlangsung. */}
        <span className="font-bold" style={{ color: '#003526' }}>
          {isActive ? `Waktu ${prayerStatus.name}` : prayerStatus.name}
        </span>

        {/* Friday badge — hanya muncul di hari Jumat (reminder Sholat Jumat). */}
        {prayerStatus.isFriday && (
          <span className="relative inline-flex items-center group">
            <span
              className="text-[14px] select-none"
              role="img"
              aria-label="Sholat Jumat hari ini bagi pria muslim"
            >
              📿
            </span>
            <span
              role="tooltip"
              className="absolute top-full left-1/2 -translate-x-1/2 mt-2
                         px-2.5 py-1.5 bg-gray-900 text-white text-[10px] font-medium
                         whitespace-nowrap rounded-md shadow-lg
                         opacity-0 group-hover:opacity-100 pointer-events-none
                         transition-opacity duration-150 z-50"
            >
              Sholat Jumat hari ini
            </span>
          </span>
        )}

        <span className="text-gray-400">·</span>

        {/* Region — full name "Maluku Utara" */}
        <span className="text-gray-700">Maluku Utara</span>

        <span className="text-gray-400">·</span>

        {/* Time — prominent bold dark */}
        <span className="font-bold text-gray-900">{prayerStatus.time}</span>

        {/* Countdown — HANYA saat mode 'next'. Saat 'active' disembunyikan. */}
        {!isActive && (
          <span className="text-gray-500">
            · {formatCountdown(prayerStatus.countdownMin)}
            {prayerStatus.nextDay && ' (besok)'}
          </span>
        )}
      </div>

    </div>
  );
}
