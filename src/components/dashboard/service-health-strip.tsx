'use client';

/**
 * TeraLoka — ServiceHealthStrip
 * Phase 2 · Batch 4b — Domain Components
 * ------------------------------------------------------------
 * Grid overview semua service + status kondisi masing-masing.
 * Di-group by category sesuai PRD sidebar structure:
 * - INFORMASI (bakabar, balapor, badonasi)
 * - PROPERTI & SEWA (bakos, properti, kendaraan)
 * - MOBILITAS (baantar, bapasiar, baronda)
 * - DAILY (ppob, event)
 * - dll
 *
 * Dipakai di dashboard body sebagai "pulse" visual platform.
 *
 * Visual:
 * - Grouped sections dengan eyebrow label
 * - Legend counter di header (Sehat / Peringatan / Kritis)
 * - Auto-count status dari items
 *
 * Contoh:
 *   <ServiceHealthStrip
 *     sections={[
 *       {
 *         label: 'INFORMASI',
 *         items: [
 *           { service: 'bakabar', icon: <FileText />, label: 'BAKABAR', status: 'healthy' },
 *           { service: 'balapor', icon: <AlertTriangle />, label: 'BALAPOR', status: 'warning', metric: '4 pending' },
 *           { service: 'badonasi', icon: <Heart />, label: 'BADONASI', status: 'healthy' },
 *         ],
 *       },
 *       {
 *         label: 'MOBILITAS',
 *         items: [
 *           { service: 'baantar', icon: <Package />, label: 'BAANTAR', status: 'coming' },
 *           { service: 'bapasiar', icon: <Ship />, label: 'BAPASIAR', status: 'healthy' },
 *         ],
 *       },
 *     ]}
 *   />
 */

import { cn } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { StatusDot } from '@/components/ui/status-dot';
import {
  ServiceHealthItem,
  type ServiceHealthItemProps,
  type ServiceHealthStatus,
} from './service-health-item';

export interface ServiceHealthSection {
  label: string;
  items: ServiceHealthItemProps[];
}

export interface ServiceHealthStripProps {
  sections: ServiceHealthSection[];
  title?: string;
  /** Responsif: default 2 di mobile, 4 di desktop. Bisa override. */
  columns?: 2 | 3 | 4 | 6;
  /** Tampilkan legend counter di header */
  showLegend?: boolean;
  className?: string;
}

const COLUMNS_CLASS: Record<2 | 3 | 4 | 6, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
  6: 'grid-cols-2 md:grid-cols-4 xl:grid-cols-6',
};

/* ─── Count status across all sections ─── */

function countStatuses(sections: ServiceHealthSection[]) {
  const counts: Record<ServiceHealthStatus, number> = {
    healthy: 0,
    warning: 0,
    critical: 0,
    offline: 0,
    coming: 0,
  };
  for (const section of sections) {
    for (const item of section.items) {
      counts[item.status]++;
    }
  }
  return counts;
}

export function ServiceHealthStrip({
  sections,
  title = 'Service Health',
  columns = 4,
  showLegend = true,
  className,
}: ServiceHealthStripProps) {
  const counts = countStatuses(sections);
  const totalActive =
    counts.healthy + counts.warning + counts.critical + counts.offline;

  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between gap-3 mb-4">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-text-muted">
          {title}
        </CardTitle>

        {showLegend && (
          <div className="flex items-center gap-3 text-xs">
            {counts.healthy > 0 && (
              <StatusDot
                status="healthy"
                size="xs"
                label={`${counts.healthy} sehat`}
              />
            )}
            {counts.warning > 0 && (
              <StatusDot
                status="warning"
                size="xs"
                label={`${counts.warning} warning`}
                animated="pulse"
              />
            )}
            {counts.critical > 0 && (
              <StatusDot
                status="critical"
                size="xs"
                label={`${counts.critical} kritis`}
                animated="ping"
              />
            )}
            {counts.coming > 0 && (
              <span className="text-text-subtle tabular-nums">
                +{counts.coming} coming
              </span>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0 flex flex-col gap-4">
        {sections.length === 0 ? (
          <div className="text-xs text-text-muted text-center py-6">
            Belum ada service aktif
          </div>
        ) : (
          sections.map((section) => (
            <div key={section.label}>
              {/* Section eyebrow */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold tracking-wider uppercase text-text-subtle">
                  {section.label}
                </span>
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-semibold text-text-subtle tabular-nums">
                  {section.items.length}
                </span>
              </div>

              {/* Items grid */}
              <div className={cn('grid gap-2', COLUMNS_CLASS[columns])}>
                {section.items.map((item) => (
                  <ServiceHealthItem
                    key={`${section.label}-${item.service}`}
                    {...item}
                  />
                ))}
              </div>
            </div>
          ))
        )}

        {totalActive === 0 && counts.coming > 0 && (
          <div className="text-[11px] text-text-muted text-center pt-2 border-t border-border">
            Semua service "Coming soon" — akan aktif setelah launch
          </div>
        )}
      </CardContent>
    </Card>
  );
}
