'use client';

/**
 * TeraLoka — PerluTindakanCard
 * Phase 2 · Batch 4a — Domain Components
 * Batch 6b Update: Added jasa to SERVICE maps (21 services)
 * ------------------------------------------------------------
 * Card yang nampilin list tindakan yang butuh admin attention,
 * di-sort by priority. Tiap item clickable ke page relevan.
 *
 * Priority levels:
 * - urgent   → merah, ping animation, tampil paling atas
 * - high     → oranye
 * - medium   → biru
 * - low      → abu
 *
 * Derivasi dari stats:
 * - Reports priority='urgent' → urgent item
 * - Reports pending            → high item
 * - Campaigns pending          → high item
 * - Articles draft             → medium item
 * - Listings pending           → low item
 *
 * Contoh:
 *   <PerluTindakanCard
 *     items={[
 *       { id: '1', label: '2 Laporan urgent', sublabel: 'Gempa Halmahera',
 *         priority: 'urgent', service: 'balapor', href: '/admin/reports?priority=urgent' },
 *       { id: '2', label: '7 Artikel draft', sublabel: 'Menunggu publish',
 *         priority: 'medium', service: 'bakabar', href: '/admin/articles?status=draft' },
 *     ]}
 *   />
 *
 * Empty state:
 *   <PerluTindakanCard items={[]} />
 *   → Tampilin "Tidak ada tindakan. Semua beres!"
 */

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Badge, type ServiceKey } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { CheckCircle2 } from 'lucide-react';

export type ActionPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface ActionItem {
  id: string;
  label: string;
  sublabel?: string;
  priority: ActionPriority;
  service?: ServiceKey;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
}

export interface PerluTindakanCardProps {
  items: ActionItem[];
  title?: string;
  /** Batas jumlah item yg ditampilkan. Sisanya "+N lainnya". */
  maxVisible?: number;
  /** Href untuk "Lihat semua" link di footer */
  viewAllHref?: string;
  loading?: boolean;
  className?: string;
}

const PRIORITY_ORDER: Record<ActionPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PRIORITY_DOT: Record<ActionPriority, string> = {
  urgent: 'bg-status-critical',
  high: 'bg-status-warning',
  medium: 'bg-status-info',
  low: 'bg-text-subtle',
};

const PRIORITY_LABEL: Record<ActionPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const PRIORITY_BADGE_TONE: Record<
  ActionPriority,
  'critical' | 'warning' | 'info' | 'neutral'
> = {
  urgent: 'critical',
  high: 'warning',
  medium: 'info',
  low: 'neutral',
};

/* ─── Service color for item dot/accent ─── */

const SERVICE_ACCENT: Record<ServiceKey, string> = {
  bakabar: 'bg-bakabar-muted',
  balapor: 'bg-balapor-muted',
  badonasi: 'bg-badonasi-muted',
  bakos: 'bg-bakos-muted',
  properti: 'bg-properti-muted',
  kendaraan: 'bg-kendaraan-muted',
  baantar: 'bg-baantar-muted',
  bapasiar: 'bg-bapasiar-muted',
  baronda: 'bg-baronda-muted',
  jasa: 'bg-jasa-muted',
  ppob: 'bg-ppob-muted',
  event: 'bg-event-muted',
  finansial: 'bg-finansial-muted',
  ads: 'bg-ads-muted',
  ticker: 'bg-ticker-muted',
  notifwa: 'bg-notifwa-muted',
  analytics: 'bg-analytics-muted',
  syshealth: 'bg-syshealth-muted',
  trustsafety: 'bg-trustsafety-muted',
  users: 'bg-users-muted',
  roles: 'bg-roles-muted',
};

const SERVICE_ICON_COLOR: Record<ServiceKey, string> = {
  bakabar: 'text-bakabar',
  balapor: 'text-balapor',
  badonasi: 'text-badonasi',
  bakos: 'text-bakos',
  properti: 'text-properti',
  kendaraan: 'text-kendaraan',
  baantar: 'text-baantar',
  bapasiar: 'text-bapasiar',
  baronda: 'text-baronda',
  jasa: 'text-jasa',
  ppob: 'text-ppob',
  event: 'text-event',
  finansial: 'text-finansial',
  ads: 'text-ads',
  ticker: 'text-ticker',
  notifwa: 'text-notifwa',
  analytics: 'text-analytics',
  syshealth: 'text-syshealth',
  trustsafety: 'text-trustsafety',
  users: 'text-users',
  roles: 'text-roles',
};

/* ─── Component ─── */

function ActionRow({ item }: { item: ActionItem }) {
  const content = (
    <div
      className={cn(
        'group flex items-center gap-3 px-3 py-2.5 rounded-lg',
        'transition-colors hover:bg-surface-muted',
        item.priority === 'urgent' &&
          'bg-status-critical/5 hover:bg-status-critical/10'
      )}
    >
      {/* Service icon bubble OR priority dot */}
      {item.service && item.icon ? (
        <div
          className={cn(
            'flex items-center justify-center h-9 w-9 rounded-lg shrink-0',
            SERVICE_ACCENT[item.service],
            SERVICE_ICON_COLOR[item.service]
          )}
        >
          {item.icon}
        </div>
      ) : (
        <div className="flex items-center justify-center h-9 w-9 shrink-0">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              PRIORITY_DOT[item.priority],
              item.priority === 'urgent' && 'animate-pulse'
            )}
          />
        </div>
      )}

      {/* Label + sublabel */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-text leading-tight">
          {item.label}
        </div>
        {item.sublabel && (
          <div className="text-xs text-text-muted mt-0.5 leading-tight truncate">
            {item.sublabel}
          </div>
        )}
      </div>

      {/* Priority badge (urgent only, biar gak cluttered) */}
      {item.priority === 'urgent' && (
        <Badge
          variant="status"
          status={PRIORITY_BADGE_TONE[item.priority]}
          size="xs"
          className="shrink-0"
        >
          {PRIORITY_LABEL[item.priority]}
        </Badge>
      )}

      <ChevronRight
        size={14}
        className="text-text-subtle shrink-0 group-hover:text-text-muted transition-colors"
      />
    </div>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="block no-underline">
        {content}
      </Link>
    );
  }

  if (item.onClick) {
    return (
      <button
        type="button"
        onClick={item.onClick}
        className="w-full text-left"
      >
        {content}
      </button>
    );
  }

  return content;
}

export function PerluTindakanCard({
  items,
  title = 'Perlu Tindakan',
  maxVisible = 5,
  viewAllHref,
  loading = false,
  className,
}: PerluTindakanCardProps) {
  // Sort by priority (urgent first)
  const sorted = [...items].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );
  const visible = sorted.slice(0, maxVisible);
  const overflow = sorted.length - visible.length;
  const totalCount = items.length;

  return (
    <Card className={cn('flex flex-col', className)} padded={false}>
      <CardHeader className="flex-row items-center justify-between gap-2 px-5 pt-5 pb-3 mb-0">
        <div className="flex items-center gap-2 min-w-0">
          <CardTitle className="text-base">{title}</CardTitle>
          {totalCount > 0 && (
            <Badge
              variant="count"
              tone={sorted[0]?.priority === 'urgent' ? 'critical' : 'default'}
              size="sm"
            >
              {totalCount}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-2 pb-3">
        {loading ? (
          <div className="space-y-1.5 px-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <div className="h-9 w-9 rounded-lg bg-surface-muted animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-40 rounded bg-surface-muted animate-pulse" />
                  <div className="h-2.5 w-28 rounded bg-surface-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : totalCount === 0 ? (
          <div className="px-3 pb-3">
            <EmptyState
              icon={<CheckCircle2 size={28} />}
              title="Tidak ada tindakan"
              description="Semua beres. Enjoy the peace."
              variant="muted"
              tone="healthy"
              size="sm"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {visible.map((item) => (
              <ActionRow key={item.id} item={item} />
            ))}
            {overflow > 0 && (
              <div className="px-3 pt-2 text-xs text-text-muted text-center">
                +{overflow} item lainnya
              </div>
            )}
          </div>
        )}
      </CardContent>

      {viewAllHref && totalCount > 0 && (
        <div className="border-t border-border px-5 py-3">
          <Link
            href={viewAllHref}
            className="text-xs font-semibold text-brand-teal hover:text-brand-teal-light no-underline inline-flex items-center gap-1"
          >
            Lihat semua <ChevronRight size={12} />
          </Link>
        </div>
      )}
    </Card>
  );
}
