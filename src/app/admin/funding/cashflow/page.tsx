'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useContext, useMemo } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

import AdminFundingSubNav from '@/components/admin/funding/AdminFundingSubNav';
import CashflowFlowDiagram, { type FlowData } from '@/components/admin/funding/CashflowFlowDiagram';
import CampaignCashflowTable, { type CampaignCashflow } from '@/components/admin/funding/CampaignCashflowTable';
import Pagination from '@/components/admin/funding/Pagination';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ── Types ─────────────────────────────────────────
interface PartnerCashflow {
  partner_name: string;
  campaign_count: number;
  total_collected: number;
  total_disbursed: number;
  total_remaining: number;
  total_report_count: number;
  total_donor_count: number;
  disbursement_rate: number;
}

type DateRangePreset = 'all' | '30d' | 'month' | 'year' | 'custom';
type TabKey = 'campaigns' | 'partners';

const SORT_OPTIONS = [
  { key: 'collected_desc',   label: 'Terkumpul Tertinggi' },
  { key: 'disbursed_desc',   label: 'Disalurkan Tertinggi' },
  { key: 'remaining_desc',   label: 'Sisa Tertinggi' },
  { key: 'low_disbursement', label: '⚠️ Rate Terendah' },
  { key: 'newest',           label: 'Terbaru' },
  { key: 'oldest',           label: 'Terlama' },
];

// ── Helpers ──────────────────────────────────────
function formatRupiah(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function shortRupiah(n: number): string {
  if (n >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + n.toLocaleString('id-ID');
}

function isoAtDayStart(d: Date): string {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString();
}

function datePreset(preset: DateRangePreset): { from: string | null; to: string | null } {
  const now = new Date();
  switch (preset) {
    case '30d': {
      const from = new Date();
      from.setDate(from.getDate() - 30);
      return { from: isoAtDayStart(from), to: null };
    }
    case 'month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: isoAtDayStart(from), to: null };
    }
    case 'year': {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from: isoAtDayStart(from), to: null };
    }
    default:
      return { from: null, to: null };
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function AdminCashflowPage() {
  const { t } = useContext(AdminThemeContext);

  // ── State ──
  const [summary, setSummary] = useState<FlowData | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignCashflow[]>([]);
  const [campaignsTotal, setCampaignsTotal] = useState(0);
  const [partners, setPartners] = useState<PartnerCashflow[]>([]);

  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<TabKey>('campaigns');
  const [activePreset, setActivePreset] = useState<DateRangePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [sort, setSort] = useState<string>('collected_desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // ── Derived date range ──
  const dateRange = useMemo(() => {
    if (activePreset === 'custom') {
      return {
        from: customFrom ? new Date(customFrom).toISOString() : null,
        to: customTo ? new Date(customTo + 'T23:59:59').toISOString() : null,
      };
    }
    return datePreset(activePreset);
  }, [activePreset, customFrom, customTo]);

  // ── Fetch ──
  const buildDateQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (dateRange.from) params.set('from', dateRange.from);
    if (dateRange.to) params.set('to', dateRange.to);
    return params;
  }, [dateRange]);

  const fetchSummary = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    try {
      const qs = buildDateQuery().toString();
      const res = await fetch(`${API_URL}/funding/admin/cashflow/summary${qs ? '?' + qs : ''}`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      if (res.ok && json.success) setSummary(json.data);
    } catch {}
  }, [buildDateQuery]);

  const fetchCampaigns = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    try {
      const qs = buildDateQuery();
      qs.set('sort', sort);
      qs.set('page', String(page));
      qs.set('limit', String(limit));

      const res = await fetch(`${API_URL}/funding/admin/cashflow/by-campaign?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setCampaigns(json.data ?? []);
        setCampaignsTotal(json.meta?.total ?? 0);
      }
    } catch {}
  }, [buildDateQuery, sort, page, limit]);

  const fetchPartners = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    try {
      const qs = buildDateQuery().toString();
      const res = await fetch(`${API_URL}/funding/admin/cashflow/by-partner${qs ? '?' + qs : ''}`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      if (res.ok && json.success) setPartners(json.data ?? []);
    } catch {}
  }, [buildDateQuery]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchSummary(), fetchCampaigns(), fetchPartners()]);
    setLoading(false);
  }, [fetchSummary, fetchCampaigns, fetchPartners]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  useEffect(() => { fetchCampaigns(); }, [sort, page, limit, fetchCampaigns]);

  // ── Handlers ──
  function switchPreset(preset: DateRangePreset) {
    setActivePreset(preset);
    setPage(1);
  }

  // ── Render ──
  const dateLabel = (() => {
    switch (activePreset) {
      case 'all': return 'Semua Waktu';
      case '30d': return '30 Hari Terakhir';
      case 'month': return 'Bulan Ini';
      case 'year': return 'Tahun Ini';
      case 'custom':
        return customFrom || customTo
          ? `${customFrom || '...'} s/d ${customTo || 'sekarang'}`
          : 'Pilih Tanggal';
    }
  })();

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, color: t.textPrimary }}>

      {/* Breadcrumb */}
      <div style={{ marginBottom: 8 }}>
        <Link href="/admin/funding" style={{ fontSize: 12, color: t.textDim, textDecoration: 'none' }}>Dashboard</Link>
        <span style={{ fontSize: 12, color: t.textMuted, margin: '0 6px' }}>/</span>
        <span style={{ fontSize: 12, color: t.textDim, fontWeight: 600 }}>Aliran Uang</span>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800, color: t.textPrimary, marginBottom: 4 }}>
        💰 Aliran Uang
      </h1>
      <p style={{ fontSize: 14, color: t.textDim, marginBottom: 24 }}>
        Transparansi aliran dana dari donor, ke partner, sampai disalurkan ke beneficiary.
      </p>

      <AdminFundingSubNav />

      {/* Date Range Presets */}
      <div style={{
        background: t.mainBg,
        border: `1px solid ${t.sidebarBorder}`,
        borderRadius: 14, padding: 14, marginBottom: 16,
      }}>
        <p style={{
          fontSize: 11, fontWeight: 700, color: t.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
        }}>
          Rentang Waktu — <span style={{ color: '#EC4899' }}>{dateLabel}</span>
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {([
            { key: 'all',    label: 'Semua Waktu' },
            { key: '30d',    label: '30 Hari' },
            { key: 'month',  label: 'Bulan Ini' },
            { key: 'year',   label: 'Tahun Ini' },
            { key: 'custom', label: 'Custom' },
          ] as const).map(p => {
            const active = activePreset === p.key;
            return (
              <button
                key={p.key}
                onClick={() => switchPreset(p.key)}
                style={{
                  padding: '7px 13px', borderRadius: 999,
                  border: `1px solid ${active ? '#EC4899' : t.sidebarBorder}`,
                  background: active ? '#EC4899' : t.mainBg,
                  color: active ? '#fff' : t.textPrimary,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {p.label}
              </button>
            );
          })}

          {activePreset === 'custom' && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto' }}>
              <input
                type="date"
                value={customFrom}
                onChange={e => { setCustomFrom(e.target.value); setPage(1); }}
                style={dateInputStyle(t)}
              />
              <span style={{ fontSize: 11, color: t.textDim }}>s/d</span>
              <input
                type="date"
                value={customTo}
                onChange={e => { setCustomTo(e.target.value); setPage(1); }}
                style={dateInputStyle(t)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Flow Diagram */}
      <div style={{ marginBottom: 16 }}>
        {summary && <CashflowFlowDiagram data={summary} />}
      </div>

      {/* Stats Grid */}
      {summary && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12, marginBottom: 24,
        }}>
          <StatCard
            label="Total Masuk"
            value={formatRupiah(summary.total_in)}
            subtext={`${summary.donation_count} donasi · ${summary.donor_count} donatur`}
            color="#6366F1" t={t}
          />
          <StatCard
            label="Disalurkan"
            value={formatRupiah(summary.total_disbursed)}
            subtext={`${summary.report_count} laporan (${summary.approved_report_count} approved)`}
            color="#10B981" t={t}
          />
          <StatCard
            label="Sisa di Partner"
            value={formatRupiah(summary.remaining_at_partner)}
            subtext={summary.total_in > 0
              ? `${summary.disbursement_rate}% sudah disalurkan`
              : 'Belum ada dana masuk'}
            color="#F59E0B" t={t}
            alert={summary.remaining_at_partner > 0 && summary.disbursement_rate < 20}
          />
          <StatCard
            label="Fee TeraLoka"
            value={formatRupiah(summary.total_fee_remitted)}
            subtext={`dari expected ${formatRupiah(summary.total_fee_expected)}`}
            color="#BE185D" t={t}
          />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
        {([
          { key: 'campaigns', label: '📋 Per Kampanye', count: campaignsTotal },
          { key: 'partners',  label: '🏢 Per Partner',  count: partners.length },
        ] as const).map(tab => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', borderRadius: 10,
                fontSize: 13, fontWeight: 600,
                color: active ? '#fff' : t.textPrimary,
                background: active ? '#1F2937' : t.mainBg,
                border: `1px solid ${active ? '#1F2937' : t.sidebarBorder}`,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
              {tab.label}
              <span style={{
                background: active ? 'rgba(255,255,255,0.2)' : t.navHover,
                color: active ? '#fff' : t.textDim,
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div style={{
          background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
          borderRadius: 16, padding: 60, textAlign: 'center',
          color: t.textDim, fontSize: 14,
        }}>
          Memuat data aliran uang...
        </div>
      ) : activeTab === 'campaigns' ? (
        <>
          {/* Sort */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, justifyContent: 'flex-end' }}>
            <select
              value={sort}
              onChange={e => { setSort(e.target.value); setPage(1); }}
              style={{
                padding: '8px 12px', borderRadius: 10,
                border: `1px solid ${t.sidebarBorder}`,
                background: t.mainBg, color: t.textPrimary,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none',
              }}>
              {SORT_OPTIONS.map(opt => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </div>

          <CampaignCashflowTable campaigns={campaigns} />

          {campaignsTotal > 0 && (
            <Pagination
              page={page}
              limit={limit}
              total={campaignsTotal}
              onPageChange={setPage}
              onLimitChange={l => { setLimit(l); setPage(1); }}
            />
          )}
        </>
      ) : (
        <PartnerCashflowSection partners={partners} t={t} />
      )}
    </div>
  );
}

// ── Stat Card ────────────────────────────────────

function StatCard({
  label, value, subtext, color, t, alert,
}: {
  label: string; value: string; subtext?: string; color: string;
  t: any; alert?: boolean;
}) {
  return (
    <div style={{
      background: alert ? color + '10' : t.mainBg,
      border: `1px solid ${alert ? color + '40' : t.sidebarBorder}`,
      borderRadius: 12, padding: 14,
    }}>
      <p style={{
        fontSize: 11, fontWeight: 700,
        color: alert ? color : t.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
      }}>
        {label}
      </p>
      {/* PRIMARY — angka rupiah ditonjolkan */}
      <p style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 4, lineHeight: 1.2 }}>
        {value}
      </p>
      {/* SECONDARY — subtext lebih kecil & dimmer */}
      {subtext && (
        <p style={{ fontSize: 10, color: t.textMuted, opacity: 0.75, fontWeight: 500 }}>
          {subtext}
        </p>
      )}
    </div>
  );
}

// ── Partner Section ──────────────────────────────

function PartnerCashflowSection({
  partners, t,
}: {
  partners: PartnerCashflow[]; t: any;
}) {
  if (partners.length === 0) {
    return (
      <div style={{
        background: t.mainBg,
        border: `1px solid ${t.sidebarBorder}`,
        borderRadius: 16, padding: 60, textAlign: 'center',
      }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, marginBottom: 4 }}>
          Belum ada partner dalam rentang ini
        </p>
        <p style={{ fontSize: 12, color: t.textDim }}>
          Partner muncul setelah ada kampanye aktif dengan donasi verified.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: t.mainBg,
      border: `1px solid ${t.sidebarBorder}`,
      borderRadius: 16, overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${t.sidebarBorder}`, background: t.navHover + '55' }}>
              <th style={pthStyle(t, 'left')}>Partner</th>
              <th style={pthStyle(t, 'center', 90)}>Kampanye</th>
              <th style={pthStyle(t, 'center', 90)}>Donatur</th>
              <th style={pthStyle(t, 'right', 120)}>Terkumpul</th>
              <th style={pthStyle(t, 'right', 120)}>Disalurkan</th>
              <th style={pthStyle(t, 'right', 120)}>Sisa</th>
              <th style={pthStyle(t, 'center', 100)}>Rate</th>
              <th style={pthStyle(t, 'center', 80)}>Laporan</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((p, idx) => {
              const isLast = idx === partners.length - 1;
              const rc = p.disbursement_rate >= 80 ? '#10B981'
                       : p.disbursement_rate >= 40 ? '#F59E0B'
                       : p.disbursement_rate > 0   ? '#EA580C'
                       : '#6B7280';
              return (
                <tr key={p.partner_name} style={{
                  borderBottom: isLast ? 'none' : `1px solid ${t.sidebarBorder}`,
                }}>
                  <td style={ptdStyle(t, 'left')}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#EC4899' }}>
                      {p.partner_name}
                    </div>
                  </td>
                  <td style={ptdStyle(t, 'center')}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>
                      {p.campaign_count}
                    </span>
                  </td>
                  <td style={ptdStyle(t, 'center')}>
                    <span style={{ fontSize: 12, color: t.textDim }}>
                      {p.total_donor_count}
                    </span>
                  </td>
                  <td style={ptdStyle(t, 'right')}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>
                      {shortRupiah(p.total_collected)}
                    </span>
                  </td>
                  <td style={ptdStyle(t, 'right')}>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: p.total_disbursed > 0 ? '#10B981' : t.textMuted,
                    }}>
                      {shortRupiah(p.total_disbursed)}
                    </span>
                  </td>
                  <td style={ptdStyle(t, 'right')}>
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: p.total_remaining > 0 ? '#F59E0B' : t.textMuted,
                    }}>
                      {shortRupiah(p.total_remaining)}
                    </span>
                  </td>
                  <td style={ptdStyle(t, 'center')}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: rc }}>
                        {p.disbursement_rate}%
                      </span>
                      <div style={{
                        width: 60, height: 4, background: t.navHover,
                        borderRadius: 999, overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${Math.min(p.disbursement_rate, 100)}%`,
                          height: '100%', background: rc,
                        }} />
                      </div>
                    </div>
                  </td>
                  <td style={ptdStyle(t, 'center')}>
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      color: p.total_report_count > 0 ? t.textPrimary : t.textMuted,
                    }}>
                      📄 {p.total_report_count}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function pthStyle(t: any, align: 'left' | 'right' | 'center', width?: number): React.CSSProperties {
  return {
    textAlign: align,
    padding: '10px 12px',
    fontSize: 10, fontWeight: 700, color: t.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    whiteSpace: 'nowrap',
    width: width ? `${width}px` : 'auto',
  };
}

function ptdStyle(t: any, align: 'left' | 'right' | 'center'): React.CSSProperties {
  return {
    textAlign: align,
    padding: '12px',
    verticalAlign: 'middle',
    color: t.textPrimary,
  };
}

function dateInputStyle(t: any): React.CSSProperties {
  return {
    padding: '6px 10px',
    borderRadius: 8,
    border: `1px solid ${t.sidebarBorder}`,
    background: t.mainBg,
    color: t.textPrimary,
    fontSize: 12,
    outline: 'none',
    fontFamily: 'inherit',
  };
}
