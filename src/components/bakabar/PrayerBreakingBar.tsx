'use client';

// ════════════════════════════════════════════════════════════════
// PRAYER BREAKING BAR — Sprint 2A Batch B v5b-jumat-badge-tooltip (15 Mei 2026)
// PATH: src/components/bakabar/PrayerBreakingBar.tsx
// ────────────────────────────────────────────────────────────────
//
// Compact inline component yang di-render INSIDE CategoryTabs container.
//
// History v5b-jumat-badge-tooltip (vs v5b-jumat-badge):
//   - FIX cursor-help bikin `?` icon saat hover badge 📿.
//     Replaced dengan custom CSS tooltip via group-hover:opacity:
//       - No more `cursor-help` class (no more `?` cursor)
//       - Instant tooltip on hover (no native delay ~1s)
//       - Custom dark rounded styling (vs native browser tooltip)
//       - Mobile: tooltip not shown on tap, but aria-label tetap untuk SR
//
// History v5b-jumat-badge (kept):
//   - "Dzuhur" ALWAYS (no Friday switch, match KEMENAG/Aladhan)
//   - 📿 badge conditional di hari Jumat (UX reminder Sholat Jumat)
//
// History v5b-format (kept):
//   - Format: "🕌 Dzuhur · Maluku Utara · 12:27 · 2j 15mnt lagi"
//   - Brand color #003526 pada prayer name
//
// History v5b (kept):
//   - Prayer times fetched from backend /content/prayer-times (Aladhan API)
//   - Akurasi ±1-2 menit (match Kompas/IslamicFinder)
//
// History v4 (kept):
//   - Layout: Breaking di kiri (flex-1), Shalat di kanan (ml-auto)
//   - Breaking source: /content/articles filter is_breaking
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

interface NextPrayerInfo {
  name:         string;
  time:         string;
  countdownMin: number;
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

function computeNextPrayer(times: PrayerTimesData): NextPrayerInfo {
  const { hour, minute, isFriday } = getMalUtDateTime();
  const timesArr = [times.Fajr, times.Dhuhr, times.Asr, times.Maghrib, times.Isha];
  const nowMin   = hour * 60 + minute;

  for (let i = 0; i < timesArr.length; i++) {
    const prayerMin = timeToMinutes(timesArr[i]);
    if (prayerMin > nowMin) {
      return {
        name:         PRAYER_NAMES[i],
        time:         timesArr[i],
        countdownMin: prayerMin - nowMin,
        nextDay:      false,
        isFriday,
      };
    }
  }
  return {
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
    const res  = await fetch(`${API}/content/articles?limit=20`);
    const data = await res.json();
    if (!data.success || !data.data?.length) return [];

    return data.data
      .filter((a: any) => a.is_breaking === true)
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
  const [nextPrayer,    setNextPrayer]    = useState<NextPrayerInfo | null>(null);

  useEffect(() => {
    Promise.all([
      fetchPrayerTimesFromBackend(),
      fetchBreakingArticles(),
    ]).then(([times, breaking]) => {
      if (times) {
        setPrayerTimes(times);
        setNextPrayer(computeNextPrayer(times));
      }
      setBreakingItems(breaking);
    });
  }, []);

  useEffect(() => {
    if (!prayerTimes) return;
    const interval = setInterval(() => {
      setNextPrayer(computeNextPrayer(prayerTimes));
    }, 60000);
    return () => clearInterval(interval);
  }, [prayerTimes]);

  if (!nextPrayer) {
    return <div className="px-1 pt-1" style={{ minHeight: 24 }} aria-hidden="true" />;
  }

  const hasBreaking = breakingItems.length > 0;
  const breaking    = breakingItems[0];

  return (
    <div className="px-1 pt-1 flex items-center gap-3 flex-wrap md:flex-nowrap text-xs min-w-0">

      {/* ── BREAKING NEWS (kiri, flex-1) ──────────────────────── */}
      {hasBreaking && (
        <div className="flex items-center gap-1.5 flex-1 min-w-0 order-1">
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
          Format hari biasa: 🕌 Dzuhur · Maluku Utara · 12:27 · 2j 15mnt lagi
          Format hari Jumat: 🕌 Dzuhur 📿 · Maluku Utara · 12:27 · 2j 15mnt lagi
          (📿 hover → custom tooltip "Sholat Jumat hari ini") */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto order-2">
        <span className="text-sm" aria-label="Mosque icon">🕌</span>

        {/* Prayer name — brand green, dynamic */}
        <span className="font-bold" style={{ color: '#003526' }}>
          {nextPrayer.name}
        </span>

        {/* Friday badge — hanya muncul di hari Jumat.
            Custom CSS tooltip via group-hover (no cursor-help → no ? icon). */}
        {nextPrayer.isFriday && (
          <span className="relative inline-flex items-center group">
            <span
              className="text-[14px] select-none"
              role="img"
              aria-label="Sholat Jumat hari ini bagi pria muslim"
            >
              📿
            </span>
            {/* Custom tooltip — instant fade in on hover, positioned below badge */}
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
        <span className="font-bold text-gray-900">{nextPrayer.time}</span>

        {/* Countdown — muted secondary */}
        <span className="text-gray-500">
          · {formatCountdown(nextPrayer.countdownMin)}
          {nextPrayer.nextDay && ' (besok)'}
        </span>
      </div>

    </div>
  );
}
