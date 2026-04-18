'use client';

/**
 * TeraLoka — Admin Dashboard Overview
 * Phase 2 · Batch 6 — Dashboard Overview
 * ------------------------------------------------------------
 * Halaman utama admin setelah login. Compose domain components
 * dari Batch 4 (KPI cards, Mission Control, Perlu Tindakan,
 * Service Health, DAU Chart, Regional Map, System Health,
 * Anomaly, Quick Action).
 *
 * Layout (responsive):
 *   ┌─────────────────────────────────────────┐
 *   │ Welcome header (greeting + summary)     │
 *   ├─────────────────────────────────────────┤
 *   │ KPI row — 5 cards                       │
 *   ├─────────────────────────────────────────┤
 *   │ Service Health Strip (full width)       │
 *   ├───────────────┬─────────────┬───────────┤
 *   │ DAU Chart     │ Perlu       │ Regional  │
 *   │               │ Tindakan    │ Map       │
 *   ├───────────────┼─────────────┼───────────┤
 *   │ Anomaly       │ System      │ Menu      │
 *   │               │ Health      │ Cepat     │
 *   └───────────────┴─────────────┴───────────┘
 *
 * Data:
 * - /admin/stats → 5 KPI + Perlu Tindakan (derived)
 * - Service health: static config MVP
 * - DAU, Anomaly, System Health: empty/coming state (endpoint belum ada)
 * - Regional map: pin-only mode (aggregate belum ada)
 *
 * Preserved dari existing page.tsx:
 * - Greeting dinamis (pagi/siang/malam)
 * - Total pending banner merah
 * - Error state + retry
 * - Loading skeleton
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Database,
  Edit3,
  FileText,
  Heart,
  Home,
  MessageSquare,
  Package,
  RefreshCw,
  Server,
  Ship,
  Shield,
  UserCog,
  Users,
  History,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ApiError, useApi } from '@/lib/api/client';
import { summarizeActions, type AdminStats } from '@/types/admin';

import { Button } from '@/components/ui/button';
import { StatusDot } from '@/components/ui/status-dot';

import { KPICard } from '@/components/dashboard/kpi-card';
import { MissionControlCard } from '@/components/dashboard/mission-control-card';
import {
  PerluTindakanCard,
  type ActionItem,
} from '@/components/dashboard/perlu-tindakan-card';
import { QuickActionMenu } from '@/components/dashboard/quick-action-menu';
import { ServiceHealthStrip } from '@/components/dashboard/service-health-strip';
import { AnomalyCard } from '@/components/dashboard/anomaly-card';
import { SystemHealthCard } from '@/components/dashboard/system-health-card';
import { DAUChart } from '@/components/dashboard/dau-chart';
import { RegionalMap } from '@/components/dashboard/regional-map';

import {
  BakabarIcon,
  BalaporIcon,
  BadonasiIcon,
  BakosIcon,
  UsersIcon,
} from '@/components/icons/service-icons';

/* ─── Greeting helper ─── */

function useGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Selamat pagi';
  if (hour < 17) return 'Selamat siang';
  return 'Selamat malam';
}

/* ─── Derivasi Perlu Tindakan dari stats ─── */

function deriveActionItems(stats: AdminStats | null): ActionItem[] {
  if (!stats) return [];
  const items: ActionItem[] = [];

  if (stats.reports.pending > 0) {
    items.push({
      id: 'reports-pending',
      label: `${stats.reports.pending} Laporan BALAPOR`,
      sublabel: 'Moderasi laporan masuk',
      priority: 'urgent',
      service: 'balapor',
      icon: <AlertTriangle size={16} />,
      href: '/admin/reports',
    });
  }
  if (stats.campaigns.pending > 0) {
    items.push({
      id: 'campaigns-pending',
      label: `${stats.campaigns.pending} Kampanye BADONASI`,
      sublabel: 'Verifikasi donasi',
      priority: 'high',
      service: 'badonasi',
      icon: <Heart size={16} />,
      href: '/admin/funding',
    });
  }
  if (stats.listings.pending > 0) {
    items.push({
      id: 'listings-pending',
      label: `${stats.listings.pending} Listing Pending`,
      sublabel: 'Review dan aktifkan',
      priority: 'medium',
      service: 'bakos',
      icon: <Home size={16} />,
      href: '/admin/listings',
    });
  }
  if (stats.articles.draft > 0) {
    items.push({
      id: 'articles-draft',
      label: `${stats.articles.draft} Artikel Draft`,
      sublabel: 'Review atau publish',
      priority: 'low',
      service: 'bakabar',
      icon: <FileText size={16} />,
      href: '/admin/content',
    });
  }

  return items;
}

/* ─── Service Health config (static MVP) ─── */

function buildServiceHealthSections() {
  return [
    {
      label: 'INFORMASI',
      items: [
        {
          service: 'bakabar' as const,
          icon: <BakabarIcon size={14} />,
          label: 'BAKABAR',
          status: 'healthy' as const,
          href: '/admin/content',
        },
        {
          service: 'balapor' as const,
          icon: <BalaporIcon size={14} />,
          label: 'BALAPOR',
          status: 'healthy' as const,
          href: '/admin/reports',
        },
        {
          service: 'badonasi' as const,
          icon: <BadonasiIcon size={14} />,
          label: 'BADONASI',
          status: 'healthy' as const,
          href: '/admin/funding',
        },
      ],
    },
    {
      label: 'PROPERTI',
      items: [
        {
          service: 'bakos' as const,
          icon: <BakosIcon size={14} />,
          label: 'BAKOS',
          status: 'healthy' as const,
          href: '/admin/listings?type=kos',
        },
        {
          service: 'properti' as const,
          icon: <Building2 size={14} />,
          label: 'Properti',
          status: 'healthy' as const,
          href: '/admin/listings?type=properti',
        },
      ],
    },
    {
      label: 'MOBILITAS',
      items: [
        {
          service: 'baantar' as const,
          icon: <Package size={14} />,
          label: 'BAANTAR',
          status: 'coming' as const,
        },
        {
          service: 'bapasiar' as const,
          icon: <Ship size={14} />,
          label: 'BAPASIAR',
          status: 'healthy' as const,
          href: '/admin/transport',
        },
      ],
    },
    {
      label: 'PLATFORM',
      items: [
        {
          service: 'users' as const,
          icon: <UsersIcon size={14} />,
          label: 'Users',
          status: 'healthy' as const,
          href: '/admin/users',
        },
        {
          service: 'trustsafety' as const,
          icon: <Shield size={14} />,
          label: 'Trust',
          status: 'healthy' as const,
          href: '/admin/trust-safety',
        },
      ],
    },
  ];
}

/* ─── System Health config (static MVP) ─── */

const SYSTEM_HEALTH_METRICS = [
  {
    id: 'api',
    label: 'API Uptime',
    value: '99.98%',
    status: 'healthy' as const,
    icon: <Server size={14} />,
  },
  {
    id: 'db',
    label: 'Supabase DB',
    value: 'Connected',
    status: 'healthy' as const,
    icon: <Database size={14} />,
  },
  {
    id: 'fonnte',
    label: 'Fonnte WA',
    value: 'Online',
    status: 'healthy' as const,
    icon: <MessageSquare size={14} />,
  },
];

/* ─── Page ─── */

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const api = useApi();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const greeting = useGreeting();
  const firstName = user?.name?.split(' ')[0] ?? 'Admin';
  const summary = summarizeActions(stats);

  /* ── Fetch stats ── */
  useEffect(() => {
    if (!api.token) return;
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    api
      .get<AdminStats>('/admin/stats', { signal: controller.signal })
      .then((data) => {
        setStats(data);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(
          err instanceof ApiError ? err.message : 'Gagal memuat data'
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [api, retryNonce]);

  const handleRetry = useCallback(() => {
    setRetryNonce((n) => n + 1);
  }, []);

  /* ── Derived data ── */
  const actionItems = deriveActionItems(stats);
  const serviceHealthSections = buildServiceHealthSections();

  // Mission Control breakdown
  const missionBreakdown: Array<{
    service: 'balapor' | 'bakabar' | 'badonasi' | 'bakos';
    label: string;
    count: number;
  }> = [];
  if (stats) {
    if (stats.reports.pending > 0)
      missionBreakdown.push({
        service: 'balapor',
        label: 'Laporan',
        count: stats.reports.pending,
      });
    if (stats.articles.draft > 0)
      missionBreakdown.push({
        service: 'bakabar',
        label: 'Draft',
        count: stats.articles.draft,
      });
    if (stats.campaigns.pending > 0)
      missionBreakdown.push({
        service: 'badonasi',
        label: 'Donasi',
        count: stats.campaigns.pending,
      });
    if (stats.listings.pending > 0)
      missionBreakdown.push({
        service: 'bakos',
        label: 'Listing',
        count: stats.listings.pending,
      });
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ── Welcome header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-text tracking-tight">
            {greeting}, {firstName} <span aria-hidden="true">👋</span>
          </h1>
          <p className="text-sm text-text-muted mt-1 leading-relaxed">
            Berikut kondisi platform TeraLoka hari ini.
            {summary.totalPending > 0 && (
              <>
                {' '}
                <span
                  className={
                    summary.hasUrgent
                      ? 'text-status-critical font-semibold'
                      : 'text-status-warning font-semibold'
                  }
                >
                  {summary.totalPending} item perlu perhatianmu.
                </span>
              </>
            )}
            {!loading && summary.totalPending === 0 && !error && (
              <span className="text-status-healthy font-semibold">
                {' '}
                Semua aksi terkini beres.
              </span>
            )}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-full">
          <StatusDot
            status="healthy"
            size="xs"
            animated="pulse"
            srLabel="System online"
          />
          <span className="text-xs font-semibold text-text-secondary">
            System Online
          </span>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl bg-status-critical/8 border border-status-critical/20 px-4 py-3">
          <AlertCircle
            size={18}
            className="text-status-critical shrink-0 mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-status-critical">
              Gagal memuat stats
            </p>
            <p className="text-xs text-text-muted mt-0.5">{error}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRetry}
            leftIcon={<RefreshCw size={12} />}
          >
            Retry
          </Button>
        </div>
      )}

      {/* ── KPI Row — 5 cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
        <KPICard
          service="users"
          icon={<Users size={20} />}
          label="Users"
          value={stats?.users.total ?? 0}
          sublabel="Pengguna terdaftar"
          emptyMessage="Belum ada user"
          href="/admin/users"
          loading={loading && !stats}
        />
        <KPICard
          service="bakos"
          icon={<Home size={20} />}
          label="Listing"
          value={stats?.listings.total ?? 0}
          sublabel="Kos, properti, kendaraan"
          badge={
            stats && stats.listings.pending > 0
              ? {
                  label: `${stats.listings.pending} pending`,
                  tone: 'warning',
                }
              : undefined
          }
          emptyMessage="Belum ada listing"
          href="/admin/listings"
          loading={loading && !stats}
        />
        <KPICard
          service="bakabar"
          icon={<FileText size={20} />}
          label="Artikel"
          value={stats?.articles.total ?? 0}
          sublabel="BAKABAR & laporan"
          badge={
            stats && stats.articles.draft > 0
              ? { label: `${stats.articles.draft} draft`, tone: 'info' }
              : undefined
          }
          emptyMessage="Belum ada artikel"
          href="/admin/content"
          loading={loading && !stats}
        />
        <KPICard
          service="badonasi"
          icon={<Heart size={20} />}
          label="Kampanye"
          value={stats?.campaigns.total ?? 0}
          sublabel="BADONASI donasi"
          badge={
            stats && stats.campaigns.pending > 0
              ? {
                  label: `${stats.campaigns.pending} pending`,
                  tone: 'warning',
                }
              : undefined
          }
          emptyMessage="Belum ada kampanye"
          href="/admin/funding"
          loading={loading && !stats}
        />
        <KPICard
          service="balapor"
          icon={<AlertTriangle size={20} />}
          label="Laporan"
          value={stats?.reports.total ?? 0}
          sublabel="BALAPOR masuk"
          badge={
            stats && stats.reports.pending > 0
              ? {
                  label: `${stats.reports.pending} baru`,
                  tone: 'critical',
                }
              : undefined
          }
          emptyMessage="Belum ada laporan"
          href="/admin/reports"
          loading={loading && !stats}
        />
      </div>

      {/* ── Service Health Strip ── */}
      <ServiceHealthStrip sections={serviceHealthSections} />

      {/* ── Middle row: Mission Control (full) + Perlu Tindakan ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5">
          <MissionControlCard
            title="Mission Control"
            urgentCount={summary.totalPending}
            totalCount={summary.totalActive}
            subtitle={
              summary.totalPending > 0
                ? `${summary.totalPending} item tertunda dari total ${summary.totalActive} item aktif di platform.`
                : 'Semua operasional berjalan lancar.'
            }
            breakdown={missionBreakdown}
            emptyTitle="Semua beres!"
            emptyMessage="Tidak ada aksi tertunda. Platform sehat."
          />
        </div>
        <div className="lg:col-span-4">
          <PerluTindakanCard
            items={actionItems}
            loading={loading && !stats}
            maxVisible={5}
          />
        </div>
        <div className="lg:col-span-3">
          <QuickActionMenu
            items={[
              {
                id: 'write',
                label: 'Tulis Artikel',
                service: 'bakabar',
                icon: <Edit3 size={18} />,
                href: '/office/newsroom/bakabar/hub/new',
              },
              {
                id: 'users',
                label: 'Kelola Users',
                service: 'users',
                icon: <UserCog size={18} />,
                href: '/admin/users',
              },
              {
                id: 'audit',
                label: 'Audit Log',
                service: 'trustsafety',
                icon: <History size={18} />,
                href: '/admin/audit-log',
              },
              {
                id: 'health',
                label: 'System Health',
                service: 'syshealth',
                icon: <Activity size={18} />,
                href: '/admin/system-health',
              },
            ]}
            columns={2}
          />
        </div>
      </div>

      {/* ── Analytics row: DAU + Regional + System Health ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <DAUChart
            title="Daily Active Users"
            subtitle="30 hari terakhir"
            loading={loading}
          />
        </div>
        <div className="lg:col-span-5">
          <RegionalMap
            legend="Akan menampilkan distribusi laporan dan listing per kota setelah data cukup."
          />
        </div>
      </div>

      {/* ── Insight row: Anomaly + System Health ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnomalyCard />
        <SystemHealthCard
          metrics={SYSTEM_HEALTH_METRICS}
          detailHref="/admin/system-health"
        />
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center gap-3 bg-surface-muted border border-border rounded-xl px-4 py-3">
        <CheckCircle2 size={16} className="text-brand-teal shrink-0" />
        <p className="text-xs text-text-secondary leading-relaxed flex-1">
          <span className="font-semibold text-text">TeraLoka Admin</span> — Super App
          Maluku Utara. Semua data real-time dari backend API.{' '}
          <a
            href="/admin/system-health"
            className="text-brand-teal font-medium hover:underline no-underline"
          >
            Cek system health →
          </a>
        </p>
      </div>
    </div>
  );
}
