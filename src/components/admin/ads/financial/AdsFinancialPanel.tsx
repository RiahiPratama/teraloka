'use client';

/**
 * TeraLoka — AdsFinancialPanel
 * SESI 5F (19 Mei 2026) — BATCH 5 (Tab Financial ADS)
 * ────────────────────────────────────────────────────────────────
 * Tab ke-5 di /admin/ads: revenue analytics ADS-domain.
 *
 * Filosofi:
 *   - Source data: Money Domain (financial_events) sebagai source of truth
 *   - 4 section MVP: Revenue Period, By Bank, Audit Pending, Recent Activity
 *   - Client-side aggregation dari event metadata (puluhan event = OK)
 *
 * Endpoints (REUSE existing Money endpoints, no NEW backend):
 *   - GET /money/revenue/by-entity?period=30d (revenue total ads)
 *   - GET /money/admin/events?event_type=ad.payment_recorded&limit=100
 *     (detailed events untuk aggregation client-side)
 *
 * 4 Section MVP:
 *   1. Stats Cards (4): Total Revenue, Paid Ads Count, Avg per Ad, Audit Pending
 *   2. Bar Chart: Revenue by Bank Account (allocation visualization)
 *   3. Audit Pending Alert: list ads yang belum upload bukti
 *   4. Recent Activity: 10 event terakhir
 *
 * Pattern:
 *   - Tailwind v4 utility (no AdminThemeContext)
 *   - Recharts BarChart untuk visualisasi
 *   - Lucide icons + cn() helper
 *   - useAuth() for token
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp, Wallet, AlertTriangle, Activity, Building2,
  Loader2, RefreshCw, Calendar, DollarSign, FileText,
  ArrowUpRight, Clock, CheckCircle2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

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
    advertiser_name?:       string;
    pricing_tier_id?:       string;
    tier_code?:             string;
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

// ─── Component ───────────────────────────────────────────────────

export default function AdsFinancialPanel() {
  const { token, isLoading: authLoading } = useAuth();

  const [period, setPeriod]               = useState<Period>('30d');
  const [byEntity, setByEntity]           = useState<ByEntityResponse['data'] | null>(null);
  const [events, setEvents]               = useState<FinancialEvent[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);

  // ─── Fetch ───────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    const h = { Authorization: `Bearer ${token}` };

    try {
      const [beRes, evRes] = await Promise.all([
        fetch(`${API}/money/revenue/by-entity?period=${period}`, { headers: h }).then(r => r.json()) as Promise<ByEntityResponse>,
        fetch(`${API}/money/admin/events?event_type=ad.payment_recorded&limit=100`, { headers: h }).then(r => r.json()) as Promise<EventsResponse>,
      ]);

      if (beRes?.success && beRes.data) setByEntity(beRes.data);
      if (evRes?.success && evRes.data) setEvents(evRes.data);

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

  // ─── Computed (Client-side Aggregation) ──────────────────────

  const stats = useMemo(() => {
    // Total revenue ADS dari events langsung (lebih akurat dari byEntity aggregation)
    // byEntity.pt_digital.sources.ads kadang null/0 tergantung server logic,
    // sum events.amount lebih reliable + match chart total.
    const adsRevenueFromEvents = events.reduce(
      (sum, e) => sum + (Number(e.amount) || 0),
      0
    );

    // Fallback ke byEntity kalau events kosong (period filter beda dengan events limit)
    const adsRevenue = adsRevenueFromEvents > 0
      ? adsRevenueFromEvents
      : (byEntity?.pt_digital?.sources?.ads ?? 0);

    // Paid ads count = unique source_entity_id di events
    const uniqueAdIds = new Set(events.map(e => e.source_entity_id));
    const paidAdsCount = uniqueAdIds.size;

    // Average per ad
    const avgPerAd = paidAdsCount > 0 ? Math.round(adsRevenue / paidAdsCount) : 0;

    // Audit pending count
    // metadata.audit_pending bisa boolean true/false ATAU string "true"/"false"
    const auditPendingCount = events.filter(e => {
      const v = e.metadata?.audit_pending;
      return v === true || v === 'true';
    }).length;

    return { adsRevenue, paidAdsCount, avgPerAd, auditPendingCount };
  }, [byEntity, events]);

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

  // Audit Pending List
  const auditPendingList = useMemo(() => {
    return events
      .filter(e => {
        const v = e.metadata?.audit_pending;
        return v === true || v === 'true';
      })
      .slice(0, 10);
  }, [events]);

  // Recent activity (10 latest)
  const recentActivity = useMemo(() => {
    return [...events]
      .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
      .slice(0, 10);
  }, [events]);

  // Chart data for Recharts
  const chartData = useMemo(() => {
    return revenueByBank.map((b, i) => ({
      name:  b.alias,
      bank:  b.bank,
      total: b.total,
      count: b.count,
      color: BANK_COLORS[i % BANK_COLORS.length],
    }));
  }, [revenueByBank]);

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

      {/* ─── Loading ─── */}
      {loading && !byEntity && (
        <div className="flex items-center justify-center gap-2 py-16 bg-surface border border-border rounded-xl">
          <Loader2 size={16} className="animate-spin text-text-muted" />
          <span className="text-[12px] text-text-muted">Memuat analytics...</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
            SECTION 1 — STATS CARDS (4 cards)
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

          {/* Card 4: Audit Pending */}
          <div className={cn(
            'border rounded-xl p-4',
            stats.auditPendingCount > 0
              ? 'bg-status-warning/8 border-status-warning/30'
              : 'bg-surface border-border'
          )}>
            <div className="flex items-center justify-between mb-2">
              <div className={cn(
                'flex items-center justify-center w-9 h-9 rounded-lg',
                stats.auditPendingCount > 0
                  ? 'bg-status-warning/20 text-status-warning'
                  : 'bg-status-healthy/12 text-status-healthy'
              )}>
                {stats.auditPendingCount > 0 ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
              </div>
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
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
            SECTION 2 — REVENUE BY BANK ACCOUNT
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
                  Alokasi pembayaran per rekening — monitoring concentration risk
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
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Mini table legend below chart */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {chartData.map((b, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 bg-surface-muted rounded-lg">
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
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
            SECTION 3 — AUDIT PENDING ALERT
          ═══════════════════════════════════════════════════════ */}
      {!loading && stats.auditPendingCount > 0 && (
        <div className="bg-surface border border-status-warning/30 rounded-xl overflow-hidden">
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
                    <td className="px-3 py-2.5 text-[10px] text-text-muted">
                      <Clock size={9} className="inline mr-1" />
                      {formatDate(ev.recorded_at)} {formatTime(ev.recorded_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
            SECTION 4 — RECENT ACTIVITY
          ═══════════════════════════════════════════════════════ */}
      {!loading && events.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
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
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-text-muted">
              Total: {events.length}
            </span>
          </div>

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
        </p>
      </div>
    </div>
  );
}
