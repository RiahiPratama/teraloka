'use client';

/**
 * TeraLoka — Status History Bar (System Health · Level 2)
 * ------------------------------------------------------------
 * Segmen berwarna per bucket waktu, ala status page GitHub/Vercel.
 *
 * 🔴 3 STATE (bukan 2) — prinsip "jangan nampilin keyakinan yang gak didukung data":
 *   - ijo  = ok    (ada sample, di luar insiden)
 *   - merah= down  (overlap insiden — didukung data incident)
 *   - ABU  = no-data/gap (TIDAK ada sample di bucket — cron belum jalan / sebelum
 *            data mulai). Gap TIDAK dicat ijo: "gak ada data" ≠ "sehat".
 *
 * Response tak punya status per titik → diturunkan dari incidents ∩ cakupan sample.
 * a11y: warna + title per segmen (hover) + aria-label ringkas. Tanpa animasi.
 */

import { useMemo } from 'react';
import type { ServiceHistory } from '@/types/health';

type Seg = 'ok' | 'down' | 'nodata';

const SEG_CLASS: Record<Seg, string> = {
  ok: 'bg-status-healthy',
  down: 'bg-status-critical',
  nodata: 'bg-text-muted/25',
};
const SEG_LABEL: Record<Seg, string> = {
  ok: 'Operational',
  down: 'Down',
  nodata: 'Tidak ada data',
};

const DAY_MS = 24 * 60 * 60 * 1000;

function segCount(windowDays: number): number {
  if (windowDays <= 1) return 24;
  if (windowDays <= 7) return 28;
  return 30;
}

function fmt(ms: number): string {
  return new Date(ms).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function StatusHistoryBar({
  history,
  windowDays,
  now,
}: {
  history: ServiceHistory;
  windowDays: number;
  /** Akhir window (waktu fetch). Prop, bukan Date.now() di render → pure. */
  now: number;
}) {
  const segs = useMemo(() => {
    const end = now;
    const start = end - windowDays * DAY_MS;
    const n = segCount(windowDays);
    const step = (end - start) / n;

    const sampleTimes = history.sparkline
      .map((p) => new Date(p.checked_at).getTime())
      .filter((t) => Number.isFinite(t));

    const incidents = history.incidents.map((i) => ({
      from: new Date(i.started_at).getTime(),
      to: i.ended_at ? new Date(i.ended_at).getTime() : end,
    }));

    const out: { state: Seg; from: number; to: number }[] = [];
    for (let i = 0; i < n; i++) {
      const from = start + i * step;
      const to = from + step;
      const inIncident = incidents.some((iv) => iv.from < to && iv.to > from);
      const hasSample = sampleTimes.some((t) => t >= from && t < to);
      const state: Seg = inIncident ? 'down' : hasSample ? 'ok' : 'nodata';
      out.push({ state, from, to });
    }
    return out;
  }, [history, windowDays, now]);

  const counts = segs.reduce(
    (acc, s) => ((acc[s.state] += 1), acc),
    { ok: 0, down: 0, nodata: 0 } as Record<Seg, number>
  );

  return (
    <div
      className="flex items-stretch gap-[2px] h-6"
      role="img"
      aria-label={`Riwayat status ${windowDays} hari: ${counts.ok} periode operational, ${counts.down} down, ${counts.nodata} tanpa data.`}
    >
      {segs.map((s, i) => (
        <span
          key={i}
          className={`flex-1 rounded-[2px] ${SEG_CLASS[s.state]}`}
          title={`${fmt(s.from)} – ${fmt(s.to)} · ${SEG_LABEL[s.state]}`}
        />
      ))}
    </div>
  );
}
