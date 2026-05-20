'use client';

/**
 * TeraLoka — AdsFinancialPanel
 * SESI 5F (19 Mei 2026) — BATCH 5 (Tab Financial ADS)
 * SESI 5G BATCH 1 (20 Mei 2026) — Phase 1 + 2 Polish
 * SESI 5G BATCH 2.B (20 Mei 2026) — Phase 3 Audit Resolve Action UI
 * ────────────────────────────────────────────────────────────────
 * Tab ke-5 di /admin/ads: revenue analytics ADS-domain.
 *
 * Filosofi:
 *   - Source data: Money Domain (financial_events) sebagai source of truth
 *   - Client-side aggregation dari event metadata (puluhan event = OK)
 *
 * Endpoints (REUSE existing Money endpoints, no NEW backend):
 *   - GET /money/revenue/by-entity?period=30d (revenue total ads)
 *   - GET /money/admin/events?event_type=ad.payment_recorded&limit=100
 *
 * 6 Section (SESI 5G Phase 1+2):
 *   1. Stats Cards (4): Total Revenue, Paid Ads Count, Avg per Ad, Audit Pending
 *      → Audit Pending card CLICKABLE (drill-down scroll)
 *   2. Bar Chart: Revenue by Bank Account
 *      → Bar CLICKABLE (drill-down filter)
 *   3. NEW — Horizontal BarChart: Revenue by Pricing Tier (Top 5)
 *   4. NEW — Compact Table: Top Advertiser (Top 5 + REPEAT/FIRST-TIME badge)
 *      → Row CLICKABLE (drill-down filter)
 *   5. Audit Pending Alert: list ads yang belum upload bukti
 *   6. Recent Activity: 10 event terakhir
 *      → ActiveFilterPill prominent kalau drill-down active
 *
 * Pattern:
 *   - Tailwind v4 utility (no AdminThemeContext) — Pattern AAP
 *   - Recharts BarChart untuk visualisasi
 *   - Lucide icons + cn() helper
 *   - useAuth() for token
 *   - Pattern CCC Aggregation Source Consistency (events first)
 *   - Pattern AAD Recharts Drill-Down Modal (extended to filter pill)
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  TrendingUp, Wallet, AlertTriangle, Activity, Building2,
  Loader2, RefreshCw, Calendar, DollarSign, FileText,
  ArrowUpRight, Clock, CheckCircle2, Package, Users, X, Filter,
  ShieldCheck, CheckCircle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import AuditPendingResolveModal, {
  type AuditPendingEventForModal,
} from './AuditPendingResolveModal';

const API =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ─── Types ───────────────────────────────────────────────────────

type Period = '7d' | '30d' | '90d' | 'ytd';

interface ByEntityResponse {
  success: boolean;
  data?: {
    period:         { from: string; to: string };
    combined_total: number;
    pt_digital:     { total: number; sources: { ads: number; bakos: number; commission: number } };
    yayasan:        { total: number; sources: Record<string, number> };
    meta:           { event_count: number };
  };
  error?: { code: string; message: string };
}

interface FinancialEvent {
  id:               string;
  event_type:       string;
  source_domain:    string;
  source_entity_id: string;
  amount:           number;
  fee_amount:       number;
  metadata: {
    ad_display_id?:         string;
    advertiser_account_id?: string;
    advertiser_name?:       string;
    pricing_tier_id?:       string;
    tier_code?:             string;
    tier_category?:         string;
    tier_name?:             string;
    bank_account_id?:       string;
    bank_account_alias?:    string;
    bank_account_bank?:     string;
    audit_pending?:         boolean | string;
    payment_method?:        string;
    revenue_source_tag?:    string;
    [key: string]: any;
  };
  recorded_at:      string;
}

interface EventsResponse {
  success: boolean;
  data?:   FinancialEvent[];
  error?:  { code: string; message: string };
}

// Drill-down filter state
type ActivityFilterType = 'bank' | 'advertiser' | null;

interface ActivityFilter {
  type:  ActivityFilterType;
  value: string | null;   // bank: alias, advertiser: account_id
  label: string | null;   // display label
}

// ─── Helpers ─────────────────────────────────────────────────────

const formatRp = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
const formatRpShort = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(0)}rb`;
  return String(n);
};
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
const formatTime = (d: string) =>
  new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

// Bank color palette untuk chart
const BANK_COLORS = [
  '#1B6B4A', // TeraLoka green
  '#0891B2', // wave teal
  '#E8963A', // sun orange
  '#7C3AED', // purple
  '#DC2626', // red
];

// Tier category color mapping (PRD spec)
const TIER_CATEGORY_COLOR: Record<string, { hex: string; bg: string; text: string; label: string }> = {
  premium:    { hex: '#1B6B4A', bg: 'bg-status-healthy/12', text: 'text-status-healthy', label: 'Premium' },
  standard:   { hex: '#0891B2', bg: 'bg-status-info/12',    text: 'text-status-info',    label: 'Standard' },
  basic:      { hex: '#E8963A', bg: 'bg-ads/12',            text: 'text-ads',            label: 'Basic' },
  compliance: { hex: '#7C3AED', bg: 'bg-balapor/12',        text: 'text-balapor',        label: 'Compliance' },
};
const TIER_FALLBACK_COLOR = { hex: '#6B7280', bg: 'bg-surface-muted', text: 'text-text-muted', label: 'Other' };

const getTierColor = (category?: string) =>
  TIER_CATEGORY_COLOR[(category ?? '').toLowerCase()] ?? TIER_FALLBACK_COLOR;

// ─── Component ───────────────────────────────────────────────────

export default function AdsFinancialPanel() {
  const { token, isLoading: authLoading } = useAuth();

  const [period, setPeriod]               = useState<Period>('30d');
  const [byEntity, setByEntity]           = useState<ByEntityResponse['data'] | null>(null);
  const [events, setEvents]               = useState<FinancialEvent[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);

  // SESI 5G — drill-down filter state
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>({
    type: null, value: null, label: null,
  });

  // SESI 5G — ref untuk scroll ke Audit Pending section
  const auditPendingRef = useRef<HTMLDivElement>(null);

  // SESI 5G Phase 3 — Resolved events (separate fetch utk cross-reference)
  const [resolvedEvents, setResolvedEvents] = useState<FinancialEvent[]>([]);

  // SESI 5G Phase 3 — Modal state untuk resolve audit pending
  const [resolveModalEvent, setResolveModalEvent] =
    useState<AuditPendingEventForModal | null>(null);

  // SESI 5G Phase 3 — Inline success/info message
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ─── Fetch ───────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    const h = { Authorization: `Bearer ${token}` };

    try {
      // SESI 5G Phase 3 — fetch 3 paralel:
      // 1. revenue by-entity (period-filtered)
      // 2. ad.payment_recorded events (untuk semua section)
      // 3. ad.audit_resolved events (untuk cross-reference Audit Pending list)
      const [beRes, evRes, resolvedRes] = await Promise.all([
        fetch(`${API}/money/revenue/by-entity?period=${period}`, { headers: h })
          .then(r => r.json()) as Promise<ByEntityResponse>,
        fetch(`${API}/money/admin/events?event_type=ad.payment_recorded&limit=100`, { headers: h })
          .then(r => r.json()) as Promise<EventsResponse>,
        fetch(`${API}/money/admin/events?event_type=ad.audit_resolved&limit=100`, { headers: h })
          .then(r => r.json()) as Promise<EventsResponse>,
      ]);

      if (beRes?.success && beRes.data) setByEntity(beRes.data);
      if (evRes?.success && evRes.data) setEvents(evRes.data);
      if (resolvedRes?.success && resolvedRes.data) setResolvedEvents(resolvedRes.data);

      if (!beRes?.success && !evRes?.success) {
        setError('Gagal memuat data analytics — cek koneksi atau permission');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Network error');
    } finally {
      setLoading(false);
    }
  }, [token, period]);

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading, fetchData]);

  // SESI 5G — reset filter saat period berubah (data baru, filter mungkin gak valid)
  useEffect(() => {
    setActivityFilter({ type: null, value: null, label: null });
  }, [period]);

  // ─── Computed (Client-side Aggregation) ──────────────────────

  // SESI 5G Phase 3 — Set of ad_ids yang udah ada audit_resolved event
  // Cross-reference dengan ini untuk exclude dari Audit Pending list/count.
  const resolvedAdIds = useMemo(() => {
    return new Set(resolvedEvents.map(e => e.source_entity_id));
  }, [resolvedEvents]);

  const stats = useMemo(() => {
    const adsRevenueFromEvents = events.reduce(
      (sum, e) => sum + (Number(e.amount) || 0),
      0
    );

    const adsRevenue = adsRevenueFromEvents > 0
      ? adsRevenueFromEvents
      : (byEntity?.pt_digital?.sources?.ads ?? 0);

    const uniqueAdIds = new Set(events.map(e => e.source_entity_id));
    const paidAdsCount = uniqueAdIds.size;

    const avgPerAd = paidAdsCount > 0 ? Math.round(adsRevenue / paidAdsCount) : 0;

    // SESI 5G Phase 3 — exclude ads yang udah audit_resolved
    const auditPendingCount = events.filter(e => {
      const v = e.metadata?.audit_pending;
      const isPending = v === true || v === 'true';
      if (!isPending) return false;
      if (resolvedAdIds.has(e.source_entity_id)) return false;
      return true;
    }).length;

    return { adsRevenue, paidAdsCount, avgPerAd, auditPendingCount };
  }, [byEntity, events, resolvedAdIds]);

  // Revenue by Bank Account (group by bank_account_alias)
  const revenueByBank = useMemo(() => {
    const groups = new Map<string, { alias: string; bank: string; total: number; count: number }>();

    for (const ev of events) {
      const alias = ev.metadata?.bank_account_alias ?? '(tanpa rekening)';
      const bank  = ev.metadata?.bank_account_bank ?? '—';
      const key   = `${bank}|${alias}`;

      if (!groups.has(key)) {
        groups.set(key, { alias, bank, total: 0, count: 0 });
      }
      const g = groups.get(key)!;
      g.total += ev.amount || 0;
      g.count += 1;
    }

    return Array.from(groups.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [events]);

  // SESI 5G — Revenue by Pricing Tier (Top 5)
  const revenueByTier = useMemo(() => {
    const groups = new Map<string, {
      tier_id:       string;
      tier_code:     string;
      tier_category: string;
      tier_name:     string;
      total:         number;
      count:         number;
    }>();

    for (const ev of events) {
      const tierId = ev.metadata?.pricing_tier_id;
      if (!tierId) continue;

      if (!groups.has(tierId)) {
        groups.set(tierId, {
          tier_id:       tierId,
          tier_code:     ev.metadata?.tier_code ?? '—',
          tier_category: (ev.metadata?.tier_category ?? 'other').toLowerCase(),
          tier_name:     ev.metadata?.tier_name ?? ev.metadata?.tier_code ?? '—',
          total:         0,
          count:         0,
        });
      }
      const g = groups.get(tierId)!;
      g.total += ev.amount || 0;
      g.count += 1;
    }

    return Array.from(groups.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [events]);

  // SESI 5G — Top Advertiser (Top 5)
  const topAdvertisers = useMemo(() => {
    const groups = new Map<string, {
      advertiser_id:   string;
      advertiser_name: string;
      total:           number;
      count:           number;
    }>();

    for (const ev of events) {
      const advId = ev.metadata?.advertiser_account_id;
      const advName = ev.metadata?.advertiser_name;
      if (!advId || !advName) continue;

      if (!groups.has(advId)) {
        groups.set(advId, {
          advertiser_id:   advId,
          advertiser_name: advName,
          total:           0,
          count:           0,
        });
      }
      const g = groups.get(advId)!;
      g.total += ev.amount || 0;
      g.count += 1;
    }

    return Array.from(groups.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((adv) => ({
        ...adv,
        is_repeat: adv.count >= 2,
      }));
  }, [events]);

  // Audit Pending List — SESI 5G Phase 3 cross-reference resolved
  const auditPendingList = useMemo(() => {
    return events
      .filter(e => {
        const v = e.metadata?.audit_pending;
        const isPending = v === true || v === 'true';
        if (!isPending) return false;
        if (resolvedAdIds.has(e.source_entity_id)) return false;
        return true;
      })
      .slice(0, 10);
  }, [events, resolvedAdIds]);

  // SESI 5G — Filtered events (per activityFilter)
  // CRITICAL: filter SEBELUM slice(0,10) supaya hit advertiser/bank di luar top 10
  const filteredEvents = useMemo(() => {
    if (!activityFilter.type || !activityFilter.value) return events;

    if (activityFilter.type === 'bank') {
      return events.filter(ev =>
        ev.metadata?.bank_account_alias === activityFilter.value
      );
    }
    if (activityFilter.type === 'advertiser') {
      return events.filter(ev =>
        ev.metadata?.advertiser_account_id === activityFilter.value
      );
    }
    return events;
  }, [events, activityFilter]);

  // Recent activity (10 latest, post-filter)
  const recentActivity = useMemo(() => {
    return [...filteredEvents]
      .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
      .slice(0, 10);
  }, [filteredEvents]);

  // Chart data for Recharts (Bank)
  const chartData = useMemo(() => {
    return revenueByBank.map((b, i) => ({
      name:  b.alias,
      bank:  b.bank,
      total: b.total,
      count: b.count,
      color: BANK_COLORS[i % BANK_COLORS.length],
    }));
  }, [revenueByBank]);

  // SESI 5G — Chart data for Recharts (Tier horizontal)
  const tierChartData = useMemo(() => {
    return revenueByTier.map((t) => {
      const colorMeta = getTierColor(t.tier_category);
      return {
        name:          t.tier_code,
        tier_id:       t.tier_id,
        tier_category: t.tier_category,
        tier_name:     t.tier_name,
        total:         t.total,
        count:         t.count,
        color:         colorMeta.hex,
      };
    });
  }, [revenueByTier]);

  // ─── Drill-Down Handlers ─────────────────────────────────────

  const handleAuditPendingCardClick = useCallback(() => {
    if (stats.auditPendingCount > 0 && auditPendingRef.current) {
      auditPendingRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [stats.auditPendingCount]);

  const handleBankBarClick = useCallback((data: any) => {
    const payload = data?.payload ?? data;
    const alias = payload?.name;
    const bank = payload?.bank;
    if (!alias) return;
    setActivityFilter({
      type:  'bank',
      value: alias,
      label: `${alias}${bank && bank !== '—' ? ' · ' + bank : ''}`,
    });
  }, []);

  const handleAdvertiserRowClick = useCallback((adv: typeof topAdvertisers[number]) => {
    setActivityFilter({
      type:  'advertiser',
      value: adv.advertiser_id,
      label: adv.advertiser_name,
    });
  }, []);

  const handleClearFilter = useCallback(() => {
    setActivityFilter({ type: null, value: null, label: null });
  }, []);

  // SESI 5G Phase 3 — Audit resolve handlers
  const handleOpenResolveModal = useCallback((ev: FinancialEvent) => {
    setResolveModalEvent({
      id:               ev.id,
      source_entity_id: ev.source_entity_id,
      amount:           ev.amount,
      recorded_at:      ev.recorded_at,
      metadata:         ev.metadata,
    });
  }, []);

  const handleResolveSuccess = useCallback((msg: string) => {
    setSuccessMessage(msg);
    setError(null);
    // Auto-clear setelah 6 detik
    setTimeout(() => setSuccessMessage(null), 6000);
    // Refresh data — audit pending list akan auto-update karena
    // resolved event sekarang ada di resolvedEvents → exclude logic kick in
    fetchData();
  }, [fetchData]);

  const handleResolveError = useCallback((msg: string) => {
    setError(msg);
    setSuccessMessage(null);
    setTimeout(() => setError(null), 6000);
  }, []);

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">

      {/* ─── Header + Period Selector ─── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[16px] font-extrabold text-text">Financial ADS</h2>
          <p className="text-[11px] text-text-muted mt-0.5">
            Revenue analytics khusus domain ADS (source: Money Domain)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period buttons */}
          <div className="inline-flex items-center gap-1 p-1 bg-surface-muted border border-border rounded-lg">
            {(['7d', '30d', '90d', 'ytd'] as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all',
                  period === p
                    ? 'bg-ads text-white'
                    : 'text-text-muted hover:text-text'
                )}
              >
                {p === 'ytd' ? 'YTD' : p.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide bg-surface-muted text-text-muted hover:text-text transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ─── Error ─── */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-status-critical/8 border border-status-critical/20">
          <AlertTriangle size={14} className="text-status-critical shrink-0 mt-0.5" />
          <p className="text-[11px] text-status-critical">{error}</p>
        </div>
      )}

      {/* ─── SESI 5G Phase 3 — Success message ─── */}
      {successMessage && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-status-healthy/8 border border-status-healthy/30 animate-in fade-in slide-in-from-top-1">
          <CheckCircle size={14} className="text-status-healthy shrink-0 mt-0.5" />
          <p className="text-[11px] text-status-healthy font-semibold leading-relaxed">{successMessage}</p>
        </div>
      )}

      {/* ─── Loading ─── */}
      {loading && !byEntity && (
        <div className="flex items-center justify-center gap-2 py-16 bg-surface border border-border rounded-xl">
          <Loader2 size={16} className="animate-spin text-text-muted" />
          <span className="text-[12px] text-text-muted">Memuat analytics...</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
            SECTION 1 — STATS CARDS (4 cards)
            SESI 5G: Card 4 Audit Pending CLICKABLE
          ═══════════════════════════════════════════════════════ */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Total Revenue */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-ads/12 text-ads">
                <TrendingUp size={16} />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted">
                {period === 'ytd' ? 'YTD' : period}
              </span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
              Total Revenue ADS
            </p>
            <p className="text-[20px] font-extrabold text-text tabular-nums mt-1">
              {formatRp(stats.adsRevenue)}
            </p>
          </div>

          {/* Card 2: Paid Ads Count */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-status-info/12 text-status-info">
                <FileText size={16} />
              </div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
              Iklan Dibayar
            </p>
            <p className="text-[20px] font-extrabold text-text tabular-nums mt-1">
              {stats.paidAdsCount}
              <span className="text-[12px] font-semibold text-text-muted ml-1">unik</span>
            </p>
          </div>

          {/* Card 3: Avg per Ad */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-baronda/12 text-baronda">
                <DollarSign size={16} />
              </div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
              Rata-rata / Iklan
            </p>
            <p className="text-[20px] font-extrabold text-text tabular-nums mt-1">
              {formatRp(stats.avgPerAd)}
            </p>
          </div>

          {/* Card 4: Audit Pending — SESI 5G CLICKABLE */}
          <button
            type="button"
            onClick={handleAuditPendingCardClick}
            disabled={stats.auditPendingCount === 0}
            className={cn(
              'border rounded-xl p-4 text-left transition-all',
              stats.auditPendingCount > 0
                ? 'bg-status-warning/8 border-status-warning/30 hover:bg-status-warning/12 hover:border-status-warning/50 cursor-pointer'
                : 'bg-surface border-border cursor-default'
            )}
            title={stats.auditPendingCount > 0 ? 'Click untuk scroll ke daftar Audit Pending' : 'Semua audit clean'}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={cn(
                'flex items-center justify-center w-9 h-9 rounded-lg',
                stats.auditPendingCount > 0
                  ? 'bg-status-warning/20 text-status-warning'
                  : 'bg-status-healthy/12 text-status-healthy'
              )}>
                {stats.auditPendingCount > 0 ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
              </div>
              {stats.auditPendingCount > 0 && (
                <ArrowUpRight size={12} className="text-status-warning" />
              )}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
              Audit Pending
            </p>
            <p className={cn(
              'text-[20px] font-extrabold tabular-nums mt-1',
              stats.auditPendingCount > 0 ? 'text-status-warning' : 'text-status-healthy'
            )}>
              {stats.auditPendingCount}
              <span className="text-[12px] font-semibold text-text-muted ml-1">
                {stats.auditPendingCount > 0 ? 'tertunda' : 'clean'}
              </span>
            </p>
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
            SECTION 2 — REVENUE BY BANK ACCOUNT
            SESI 5G: Bar CLICKABLE untuk drill-down filter
          ═══════════════════════════════════════════════════════ */}
      {!loading && events.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-status-info/12 text-status-info">
                <Building2 size={14} />
              </div>
              <div>
                <h3 className="text-[12px] font-bold text-text uppercase tracking-wider">
                  Revenue by Bank Account
                </h3>
                <p className="text-[10px] text-text-muted">
                  Alokasi pembayaran per rekening — click bar untuk filter Aktivitas
                </p>
              </div>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Building2 className="text-text-subtle mb-2" size={32} />
              <p className="text-[12px] text-text-muted">
                Belum ada data pembayaran via bank
              </p>
            </div>
          ) : (
            <div className="p-4">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    angle={-15}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    tickFormatter={formatRpShort}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(27,107,74,0.08)' }}
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: '1px solid #1F2937',
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    formatter={(value: any, _name: any, item: any) => [
                      formatRp(Number(value)),
                      `${item?.payload?.bank ?? ''} · ${item?.payload?.count ?? 0}x bayar`,
                    ]}
                    labelStyle={{ color: '#F9FAFB', fontWeight: 700 }}
                  />
                  <Bar
                    dataKey="total"
                    radius={[6, 6, 0, 0]}
                    onClick={handleBankBarClick}
                    cursor="pointer"
                  >
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Mini table legend below chart */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {chartData.map((b, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleBankBarClick({ payload: b })}
                    className="flex items-center justify-between gap-2 px-3 py-2 bg-surface-muted hover:bg-surface-muted/70 rounded-lg transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded shrink-0"
                        style={{ backgroundColor: b.color }}
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-text truncate">{b.name}</p>
                        <p className="text-[9px] text-text-muted">{b.bank} · {b.count}x</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-text tabular-nums shrink-0">
                      {formatRpShort(b.total)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
            SECTION 3 — REVENUE BY PRICING TIER (NEW SESI 5G)
            Horizontal BarChart, Top 5, color by tier_category
          ═══════════════════════════════════════════════════════ */}
      {!loading && events.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-ads/12 text-ads">
                <Package size={14} />
              </div>
              <div>
                <h3 className="text-[12px] font-bold text-text uppercase tracking-wider">
                  Revenue by Pricing Tier
                </h3>
                <p className="text-[10px] text-text-muted">
                  Top 5 tier paling laku — insight tier mana yang menggerakkan revenue
                </p>
              </div>
            </div>
          </div>

          {tierChartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Package className="text-text-subtle mb-2" size={32} />
              <p className="text-[12px] text-text-muted">
                Belum ada data tier untuk period ini
              </p>
              <p className="text-[10px] text-text-subtle mt-1">
                Tier akan muncul setelah ada pembayaran dengan pricing tier ter-set
              </p>
            </div>
          ) : (
            <div className="p-4">
              <ResponsiveContainer width="100%" height={Math.max(180, tierChartData.length * 44)}>
                <BarChart
                  data={tierChartData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    tickFormatter={formatRpShort}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 600 }}
                    width={130}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(232,150,58,0.08)' }}
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: '1px solid #1F2937',
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    formatter={(value: any, _name: any, item: any) => {
                      const p = item?.payload;
                      const colorMeta = getTierColor(p?.tier_category);
                      return [
                        formatRp(Number(value)),
                        `${colorMeta.label} · ${p?.count ?? 0}x bayar`,
                      ];
                    }}
                    labelStyle={{ color: '#F9FAFB', fontWeight: 700 }}
                  />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                    {tierChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Legend tier category */}
              <div className="mt-4 flex flex-wrap items-center gap-3 px-2 py-2 border-t border-border">
                <span className="text-[10px] font-bold uppercase text-text-muted">Legend:</span>
                {Object.entries(TIER_CATEGORY_COLOR).map(([key, meta]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded shrink-0"
                      style={{ backgroundColor: meta.hex }}
                    />
                    <span className={cn('text-[10px] font-semibold', meta.text)}>
                      {meta.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
            SECTION 4 — TOP ADVERTISER (NEW SESI 5G)
            Compact table, Top 5, REPEAT/FIRST-TIME badge
            Row CLICKABLE untuk drill-down filter
          ═══════════════════════════════════════════════════════ */}
      {!loading && events.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-status-healthy/12 text-status-healthy">
                <Users size={14} />
              </div>
              <div>
                <h3 className="text-[12px] font-bold text-text uppercase tracking-wider">
                  Top Advertiser ({period === 'ytd' ? 'YTD' : period.toUpperCase()})
                </h3>
                <p className="text-[10px] text-text-muted">
                  Klien teratas berdasarkan revenue — click row untuk filter Aktivitas
                </p>
              </div>
            </div>
          </div>

          {topAdvertisers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Users className="text-text-subtle mb-2" size={32} />
              <p className="text-[12px] text-text-muted">
                Belum ada advertiser yang membayar di period ini
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-surface-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-wider w-12">
                      #
                    </th>
                    <th className="px-3 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-wider">
                      Advertiser
                    </th>
                    <th className="px-3 py-2 text-right text-[9px] font-bold text-text-muted uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold text-text-muted uppercase tracking-wider w-16">
                      Iklan
                    </th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold text-text-muted uppercase tracking-wider w-24">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topAdvertisers.map((adv, i) => {
                    const isActive =
                      activityFilter.type === 'advertiser' &&
                      activityFilter.value === adv.advertiser_id;
                    return (
                      <tr
                        key={adv.advertiser_id}
                        onClick={() => handleAdvertiserRowClick(adv)}
                        className={cn(
                          'border-t border-border cursor-pointer transition-colors',
                          isActive
                            ? 'bg-ads/8 hover:bg-ads/12'
                            : 'hover:bg-surface-muted/30'
                        )}
                        title={`Click untuk filter Aktivitas ke ${adv.advertiser_name}`}
                      >
                        <td className="px-3 py-2.5">
                          <span className={cn(
                            'inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold',
                            i === 0 ? 'bg-ads/15 text-ads' :
                            i === 1 ? 'bg-status-info/12 text-status-info' :
                            i === 2 ? 'bg-baronda/12 text-baronda' :
                            'bg-surface-muted text-text-muted'
                          )}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[12px] font-semibold text-text">
                          {adv.advertiser_name}
                        </td>
                        <td className="px-3 py-2.5 text-right text-[12px] font-bold text-text tabular-nums">
                          {formatRp(adv.total)}
                        </td>
                        <td className="px-3 py-2.5 text-center text-[11px] font-semibold text-text-muted tabular-nums">
                          {adv.count}x
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {adv.is_repeat ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide bg-status-healthy/12 text-status-healthy">
                              <ArrowUpRight size={9} />
                              Repeat
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-surface-muted text-text-muted">
                              First-time
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
            SECTION 5 — AUDIT PENDING ALERT
            SESI 5G: ref untuk scroll target
          ═══════════════════════════════════════════════════════ */}
      {!loading && stats.auditPendingCount > 0 && (
        <div
          ref={auditPendingRef}
          className="bg-surface border border-status-warning/30 rounded-xl overflow-hidden scroll-mt-4"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-status-warning/8 border-b border-status-warning/20">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-status-warning/20 text-status-warning">
                <AlertTriangle size={14} />
              </div>
              <div>
                <h3 className="text-[12px] font-bold text-status-warning uppercase tracking-wider">
                  Audit Pending — Wajib Upload Bukti
                </h3>
                <p className="text-[10px] text-text-muted">
                  {stats.auditPendingCount} pembayaran ditandai pending (upload bukti dalam 7 hari)
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-surface-muted/40">
                <tr>
                  <th className="px-3 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-wider">Ad</th>
                  <th className="px-3 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-wider">Advertiser</th>
                  <th className="px-3 py-2 text-right text-[9px] font-bold text-text-muted uppercase tracking-wider">Amount</th>
                  <th className="px-3 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-wider">Bank</th>
                  <th className="px-3 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-wider">Tercatat</th>
                  <th className="px-3 py-2 text-right text-[9px] font-bold text-text-muted uppercase tracking-wider w-32">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {auditPendingList.map((ev) => (
                  <tr key={ev.id} className="border-t border-border hover:bg-surface-muted/30 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-[10px] font-bold text-status-warning tabular-nums">
                      {ev.metadata.ad_display_id ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-text">
                      {ev.metadata.advertiser_name ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[11px] font-bold text-text tabular-nums">
                      {formatRp(ev.amount)}
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-text-muted">
                      {ev.metadata.bank_account_alias ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-text-muted whitespace-nowrap">
                      <Clock size={9} className="inline mr-1" />
                      {formatDate(ev.recorded_at)} {formatTime(ev.recorded_at)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenResolveModal(ev)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-status-healthy/12 text-status-healthy hover:bg-status-healthy hover:text-white transition-all whitespace-nowrap"
                        title="Upload bukti pembayaran untuk resolve audit"
                      >
                        <ShieldCheck size={11} />
                        Upload Bukti
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
            SECTION 6 — RECENT ACTIVITY
            SESI 5G: ActiveFilterPill di header kalau drill-down active
          ═══════════════════════════════════════════════════════ */}
      {!loading && events.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border flex-wrap">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-status-healthy/12 text-status-healthy">
                <Activity size={14} />
              </div>
              <div>
                <h3 className="text-[12px] font-bold text-text uppercase tracking-wider">
                  Aktivitas Pembayaran Terbaru
                </h3>
                <p className="text-[10px] text-text-muted">
                  10 event terakhir di Money Domain
                  {activityFilter.type && (
                    <span className="text-ads font-semibold"> · filtered</span>
                  )}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-text-muted">
              Total: {filteredEvents.length}
              {activityFilter.type && filteredEvents.length !== events.length && (
                <span className="text-text-subtle"> / {events.length}</span>
              )}
            </span>
          </div>

          {/* SESI 5G — ActiveFilterPill */}
          {activityFilter.type && activityFilter.label && (
            <div className="flex items-center gap-2 px-4 py-2 bg-ads/4 border-b border-ads/20">
              <Filter size={12} className="text-ads shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                Filter:
              </span>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-ads/12 border border-ads/30 max-w-full">
                <span className="text-[9px] font-bold uppercase tracking-wide text-ads">
                  {activityFilter.type === 'bank' ? 'Bank' : 'Klien'}
                </span>
                <span className="text-[11px] font-bold text-ads truncate">
                  {activityFilter.label}
                </span>
                <button
                  type="button"
                  onClick={handleClearFilter}
                  className="inline-flex items-center justify-center w-4 h-4 rounded-sm hover:bg-ads/20 text-ads transition-colors shrink-0"
                  title="Clear filter"
                >
                  <X size={10} />
                </button>
              </div>
            </div>
          )}

          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Activity className="text-text-subtle mb-2" size={32} />
              <p className="text-[12px] text-text-muted">
                Tidak ada aktivitas untuk filter ini
              </p>
              {activityFilter.type && (
                <button
                  type="button"
                  onClick={handleClearFilter}
                  className="mt-2 text-[10px] font-bold uppercase tracking-wide text-ads hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-surface-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-wider">Waktu</th>
                    <th className="px-3 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-wider">Ad</th>
                    <th className="px-3 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-wider">Advertiser</th>
                    <th className="px-3 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-wider">Method · Bank</th>
                    <th className="px-3 py-2 text-right text-[9px] font-bold text-text-muted uppercase tracking-wider">Amount</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold text-text-muted uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((ev) => {
                    const isPending = ev.metadata?.audit_pending === true || ev.metadata?.audit_pending === 'true';
                    return (
                      <tr key={ev.id} className="border-t border-border hover:bg-surface-muted/30 transition-colors">
                        <td className="px-3 py-2.5 text-[10px] text-text-muted whitespace-nowrap">
                          {formatDate(ev.recorded_at)} {formatTime(ev.recorded_at)}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[10px] font-bold text-ads tabular-nums">
                          {ev.metadata.ad_display_id ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-text max-w-[140px] truncate">
                          {ev.metadata.advertiser_name ?? '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-text-muted">
                              {ev.metadata.payment_method ?? '—'}
                            </span>
                            {ev.metadata.bank_account_alias && (
                              <span className="text-[9px] text-text-subtle">
                                {ev.metadata.bank_account_alias} ({ev.metadata.bank_account_bank})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right text-[11px] font-bold text-text tabular-nums">
                          {formatRp(ev.amount)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {isPending ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-status-warning/12 text-status-warning">
                              Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-status-healthy/12 text-status-healthy">
                              <ArrowUpRight size={9} />
                              OK
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Empty state ─── */}
      {!loading && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-surface border border-border rounded-xl">
          <Wallet className="text-text-subtle mb-3" size={36} />
          <p className="text-[13px] font-semibold text-text">
            Belum ada pembayaran iklan
          </p>
          <p className="text-[11px] text-text-muted mt-1">
            Pembayaran akan muncul di sini setelah admin "Catat Bayar" di tab Iklan.
          </p>
        </div>
      )}

      {/* ─── Footer info ─── */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-status-info/4 border border-status-info/20">
        <Calendar size={12} className="text-status-info shrink-0 mt-0.5" />
        <p className="text-[10px] text-status-info leading-relaxed">
          <strong>Source data:</strong> Money Domain (financial_events).
          Period filter ke <code>by-entity</code>, event list 100 terbaru.
          Aggregation client-side untuk fleksibilitas filter.
          <span className="block mt-1">
            <strong>Drill-down:</strong> click card "Audit Pending", bar Bank, atau row Top Advertiser
            untuk filter Aktivitas.
          </span>
        </p>
      </div>

      {/* ─── SESI 5G Phase 3 — Resolve Audit Pending Modal ─── */}
      <AuditPendingResolveModal
        event={resolveModalEvent}
        token={token ?? null}
        onSuccess={handleResolveSuccess}
        onError={handleResolveError}
        onClose={() => setResolveModalEvent(null)}
      />
    </div>
  );
}
