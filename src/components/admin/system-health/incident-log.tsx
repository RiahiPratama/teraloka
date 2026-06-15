'use client';

/**
 * TeraLoka — Incident Log (System Health · Level 2)
 * ------------------------------------------------------------
 * Gabungan insiden semua service (transisi ke 'down'), urut terbaru dulu.
 * Empty = tone positif ("Tidak ada insiden"). a11y: ikon + label, bukan warna doang.
 */

import { useMemo } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SERVICE_META } from '@/components/admin/system-health/shared';
import { formatDate, formatTime } from '@/utils/format';
import type { HealthServiceKey, HealthHistorySummary } from '@/types/health';

function durationLabel(min: number | null): string {
  if (min === null) return 'berlangsung';
  if (min < 1) return '<1 menit';
  if (min < 60) return `${Math.round(min)} menit`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h} jam ${m} menit` : `${h} jam`;
}

export function IncidentLog({ services }: { services: HealthHistorySummary['services'] }) {
  const rows = useMemo(() => {
    const flat = (Object.keys(services) as HealthServiceKey[]).flatMap((key) =>
      services[key].incidents.map((inc) => ({ key, inc }))
    );
    flat.sort(
      (a, b) => new Date(b.inc.started_at).getTime() - new Date(a.inc.started_at).getTime()
    );
    return flat;
  }, [services]);

  if (rows.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-status-healthy/8 border border-status-healthy/20 px-4 py-3">
        <CheckCircle2 size={16} className="text-status-healthy shrink-0" />
        <p className="text-sm text-text-secondary">
          Tidak ada insiden pada rentang ini.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden">
      {rows.map(({ key, inc }, i) => {
        const meta = SERVICE_META[key];
        const ongoing = inc.ended_at === null;
        return (
          <li key={i} className="flex items-start gap-3 px-4 py-3">
            <XCircle
              size={16}
              className={ongoing ? 'text-status-critical shrink-0 mt-0.5' : 'text-text-muted shrink-0 mt-0.5'}
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-text">{meta.label}</span>
                <Badge variant="status" status={ongoing ? 'critical' : 'neutral'} size="xs">
                  {ongoing ? 'Berlangsung' : 'Pulih'}
                </Badge>
                <span className="text-xs text-text-muted">· {durationLabel(inc.duration_min)}</span>
              </div>
              <p className="text-xs text-text-muted mt-0.5 tabular-nums">
                {formatDate(inc.started_at)} {formatTime(inc.started_at)}
                {inc.ended_at && (
                  <>
                    {' → '}
                    {formatDate(inc.ended_at)} {formatTime(inc.ended_at)}
                  </>
                )}
              </p>
              {inc.detail && (
                <p className="text-xs text-text-secondary mt-1 break-words">{inc.detail}</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
