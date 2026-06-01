'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useContext, useMemo } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

import CommandCenterTabs from '@/components/admin/funding/CommandCenterTabs';
import CashflowFlowDiagram, { type FlowData } from '@/components/admin/funding/CashflowFlowDiagram';
import CashflowDetailPanel, { type DetailCategory } from '@/components/admin/funding/CashflowDetailPanel';
import CampaignCashflowTable, { type CampaignCashflow } from '@/components/admin/funding/CampaignCashflowTable';
import Pagination from '@/components/admin/funding/Pagination';
import AdminAuthGuard from '@/components/admin/funding/AdminAuthGuard';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

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

// ── Smart Anomaly Types (Smart Cashflow Engine) ─────────
export type AnomalyLevel = 'critical' | 'at_risk' | 'warning' | 'healthy' | 'closed';

export interface AnomalyInfo {
  level: AnomalyLevel;
  label: string;
  reasons: string[];
  priority_score: number;
  action_hint: string;
}

const SORT_OPTIONS = [
  { key: 'smart_priority',   label: '⭐ Smart Priority (Default)' },
  { key: 'collected_desc',   label: 'Terkumpul Tertinggi' },
  { key: 'disbursed_desc',   label: 'Disalurkan Tertinggi' },
  { key: 'remaining_desc',   label: 'Sisa Tertinggi' },
  { key: 'low_disbursement', label: '⚠️ Rate Terendah' },
  { key: 'newest',           label: 'Terbaru' },
  { key: 'oldest',           label: 'Terlama' },
];

// ── Smart Engine: Compute Anomaly per Campaign ──────────
function computeAnomaly(c: CampaignCashflow): AnomalyInfo {
  const reasons: string[] = [];
  let priority = 0;
  let action_hint = '';

  const verifiedDate = c.verified_at ? new Date(c.verified_at) : null;
  const daysSinceVerified = verifiedDate
    ? Math.floor((Date.now() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const deadlineDate = c.deadline ? new Date(c.deadline) : null;
  const daysToDeadline = deadlineDate
    ? Math.floor((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const collectionRate = c.target_amount > 0
    ? (c.collected_amount / c.target_amount) * 100
    : 0;

  // CLOSED → skip checks
  if (c.status === 'closed' || c.status === 'completed') {
    return { level: 'closed', label: 'CLOSED', reasons: [], priority_score: 0, action_hint: '' };
  }

  // CRITICAL: disbursement stuck > 30 hari
  if (daysSinceVerified > 30 && c.disbursement_rate < 50 && c.collected_amount > 0) {
    reasons.push(`Disbursement stuck ${daysSinceVerified}h · rate ${c.disbursement_rate}%`);
    priority += 80;
    action_hint = 'Cek progress disbursement partner, follow up';
  }

  // CRITICAL: deadline lewat tapi belum 100%
  if (daysToDeadline !== null && daysToDeadline < 0 && collectionRate < 100) {
    reasons.push(`Deadline lewat ${Math.abs(daysToDeadline)}h · ${collectionRate.toFixed(0)}% terkumpul`);
    priority += 90;
    action_hint = 'Decision: extend deadline atau close kampanye';
  }

  // AT_RISK: aktif >14h tapi <50% collection
  if (daysSinceVerified > 14 && collectionRate > 0 && collectionRate < 50) {
    reasons.push(`${daysSinceVerified}h aktif · baru ${collectionRate.toFixed(0)}% terkumpul`);
    priority += 50;
    if (!action_hint) action_hint = 'Boost marketing/share ulang kampanye';
  }

  // AT_RISK: deadline mendekati <7h
  if (daysToDeadline !== null && daysToDeadline >= 0 && daysToDeadline < 7 && collectionRate < 100) {
    reasons.push(`${daysToDeadline}h sebelum deadline · ${collectionRate.toFixed(0)}% terkumpul`);
    priority += 60;
    if (!action_hint) action_hint = 'Push 2-3 hari terakhir, perlu marketing intensif';
  }

  // WARNING: report missing >7 hari
  if (c.needs_report || (c.days_since_report !== null && c.days_since_report > 7)) {
    const days = c.days_since_report ?? 0;
    reasons.push(days > 0 ? `Laporan belum update ${days}h` : 'Belum ada laporan penggunaan');
    priority += 30;
    if (!action_hint) action_hint = 'Minta partner upload laporan penggunaan';
  }

  // WARNING: no donor yet > 3 hari
  if (daysSinceVerified > 3 && c.donor_count === 0) {
    reasons.push(`${daysSinceVerified}h aktif, belum ada donatur`);
    priority += 40;
    if (!action_hint) action_hint = 'Aktivasi kampanye via WA/social media';
  }

  // Level determination
  let level: AnomalyLevel;
  if (priority >= 80) level = 'critical';
  else if (priority >= 50) level = 'at_risk';
  else if (priority >= 30) level = 'warning';
  else level = 'healthy';

  if (level === 'healthy' && reasons.length === 0) {
    if (collectionRate >= 100 && c.disbursement_rate >= 80) {
      return { level: 'healthy', label: 'COMPLETE', reasons: ['Target tercapai · disbursement on track'], priority_score: 0, action_hint: '' };
    }
    if (collectionRate >= 90) {
      return { level: 'healthy', label: 'NEAR DONE', reasons: [`${collectionRate.toFixed(0)}% terkumpul · momentum bagus`], priority_score: 5, action_hint: 'Push 1-2 hari untuk close' };
    }
    return { level: 'healthy', label: 'OK', reasons: ['Berjalan normal'], priority_score: 0, action_hint: '' };
  }

  const labelMap: Record<AnomalyLevel, string> = {
    critical: 'STUCK',       // operasional stuck, butuh action segera
    at_risk: 'LAMBAT',       // progress lambat, push aja
    warning: 'PERHATIAN',    // perlu di-monitor
    healthy: 'OK',
    closed: 'CLOSED',
  };

  return { level, label: labelMap[level], reasons, priority_score: priority, action_hint };
}

// ── Anomaly Color Config ──
const ANOMALY_COLORS: Record<AnomalyLevel, { fg: string; bg: string; border: string }> = {
  critical: { fg: '#DC2626', bg: 'rgba(220,38,38,0.10)', border: 'rgba(220,38,38,0.35)' },
  at_risk:  { fg: '#EA580C', bg: 'rgba(234,88,12,0.10)',  border: 'rgba(234,88,12,0.35)' },
  warning:  { fg: '#D97706', bg: 'rgba(217,119,6,0.10)',  border: 'rgba(217,119,6,0.30)' },
  healthy:  { fg: '#10B981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
  closed:   { fg: '#6B7280', bg: 'rgba(107,114,128,0.08)',border: 'rgba(107,114,128,0.25)' },
};

// ── Helpers ──────────────────────────────────────
function formatRupiah(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function shortRupiah(n: number): string {
  return 'Rp ' + (n ?? 0).toLocaleString('id-ID');
}

function isoAtDayStart(d: Date): string {
  // ⭐ Kolom transaction_date = tipe DATE ('2026-05-01'), BUKAN timestamp.
  // Boundary harus DATE polos 'YYYY-MM-DD' (tanpa jam/timezone) — kalau
  // pakai timestamp berjam, DATE 30 April ke-tarik ke filter "Mei".
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
  const _now = new Date();
  const [selMonth, setSelMonth] = useState<number>(_now.getMonth() + 1); // 1-12, 0 = semua bulan
  const [selYear,  setSelYear]  = useState<number>(_now.getFullYear());

  // Pilih Bulan/Tahun → reuse jalur custom (customFrom/customTo + preset 'custom')
  function applyMonthYear(month: number, year: number) {
    const from = month === 0 ? `${year}-01-01` : `${year}-${String(month).padStart(2,'0')}-01`;
    const lastDay = month === 0 ? 31 : new Date(year, month, 0).getDate();
    const to = month === 0 ? `${year}-12-31` : `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
    setCustomFrom(from); setCustomTo(to); setActivePreset('custom'); setPage(1);
  }

  const [sort, setSort] = useState<string>('smart_priority');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // ── Smart Engine: Compute anomaly per campaign ──
  const anomalyMap = useMemo(() => {
    const m: Record<string, AnomalyInfo> = {};
    campaigns.forEach(c => { m[c.id] = computeAnomaly(c); });
    return m;
  }, [campaigns]);

  // ── Smart Insights: aggregate counts for banner ──
  const insights = useMemo(() => {
    const critical: CampaignCashflow[] = [];
    const atRisk: CampaignCashflow[] = [];
    const warning: CampaignCashflow[] = [];
    let stuckAmount = 0;

    campaigns.forEach(c => {
      const a = anomalyMap[c.id];
      if (!a) return;
      if (a.level === 'critical') {
        critical.push(c);
        stuckAmount += c.remaining_at_partner || 0;
      } else if (a.level === 'at_risk') {
        atRisk.push(c);
      } else if (a.level === 'warning') {
        warning.push(c);
      }
    });

    return { critical, atRisk, warning, stuckAmount };
  }, [campaigns, anomalyMap]);

  // ── Sisa Breakdown (group remaining_at_partner by anomaly level) ──
  const sisaBreakdown = useMemo(() => {
    const groups: Record<AnomalyLevel, { count: number; amount: number; campaigns: CampaignCashflow[] }> = {
      critical: { count: 0, amount: 0, campaigns: [] },
      at_risk:  { count: 0, amount: 0, campaigns: [] },
      warning:  { count: 0, amount: 0, campaigns: [] },
      healthy:  { count: 0, amount: 0, campaigns: [] },
      closed:   { count: 0, amount: 0, campaigns: [] },
    };

    campaigns.forEach(c => {
      const a = anomalyMap[c.id];
      if (!a) return;
      const remaining = c.remaining_at_partner || 0;
      if (remaining <= 0) return; // only count campaigns yang masih ada sisa
      groups[a.level].count += 1;
      groups[a.level].amount += remaining;
      groups[a.level].campaigns.push(c);
    });

    const total = Object.values(groups).reduce((sum, g) => sum + g.amount, 0);
    return { groups, total };
  }, [campaigns, anomalyMap]);

  // ── Compute Unaccounted Campaigns EXPLICIT ──
  // Kampanye yang ada di backend summary tapi tidak ke-cover di breakdown frontend.
  // Karena ini frontend compute, kita identify kampanye yang BISA di-track.
  const unaccountedInfo = useMemo(() => {
    if (!summary) return { campaigns: [], totalFromBackend: 0, totalFromFrontend: 0, diff: 0, closedWithRemaining: [], suspiciousZero: [] };

    const totalFromBackend = summary.remaining_at_partner;
    const totalFromFrontend = sisaBreakdown.total;
    const diff = totalFromBackend - totalFromFrontend;

    // Kategori 1: Closed campaigns yang masih punya sisa (anomali, harus disetor)
    const closedWithRemaining = campaigns.filter(c => {
      const isClosed = c.status === 'closed' || c.status === 'completed';
      const hasRemaining = (c.remaining_at_partner || 0) > 0;
      return isClosed && hasRemaining;
    });

    // Kategori 2: Campaigns yang remaining_at_partner = 0 tapi mungkin ada inconsistency
    // (collected > disbursed di backend, tapi frontend show 0)
    const suspiciousZero = campaigns.filter(c => {
      const remaining = c.remaining_at_partner || 0;
      const collectedMinusDisbursed = (c.collected_amount || 0) - (c.disbursed_amount || 0);
      // Suspicious: frontend show remaining=0 tapi collected-disbursed > 0
      return remaining === 0 && collectedMinusDisbursed > 0;
    });

    return {
      campaigns: [...closedWithRemaining, ...suspiciousZero],
      totalFromBackend,
      totalFromFrontend,
      diff,
      closedWithRemaining,
      suspiciousZero,
    };
  }, [summary, campaigns, sisaBreakdown.total]);

  // ── UI state for breakdown panel ──
  const [showSisaBreakdown, setShowSisaBreakdown] = useState(false);
  
  // ⭐ Sesi 12 Phase Final: Inline expansion panel (replace modal)
  const [expansionPanel, setExpansionPanel] = useState<DetailCategory | null>(null);

  // ── AUDIT TRACKING: Universal Search State ──
  const [searchQuery, setSearchQuery] = useState('');
  // Donation drilldown cache (untuk search by kode donasi / donor name)
  // Note: donation_code & donor_name hanya tersedia setelah expand drilldown.
  // Untuk Layer 1, kita match di campaign level (title/slug/partner/beneficiary).
  // Kode donasi & donor search akan di-handle di drilldown table (Patch 3).

  // ── Smart Priority Sort: apply if active ──
  const sortedCampaigns = useMemo(() => {
    if (sort !== 'smart_priority') return campaigns;
    return [...campaigns].sort((a, b) => {
      const pa = anomalyMap[a.id]?.priority_score ?? 0;
      const pb = anomalyMap[b.id]?.priority_score ?? 0;
      return pb - pa; // descending priority
    });
  }, [campaigns, sort, anomalyMap]);

  // ── AUDIT TRACKING: Filter sorted campaigns by search query ──
  // Match fields: title, slug, partner_name, beneficiary_name, category
  // Search case-insensitive, partial match (substring)
  const filteredCampaigns = useMemo(() => {
    if (!searchQuery.trim()) return sortedCampaigns;
    const q = searchQuery.trim().toLowerCase();

    return sortedCampaigns.filter(c => {
      const haystack = [
        c.title,
        c.slug,
        c.partner_name ?? '',
        c.beneficiary_name ?? '',
        c.category ?? '',
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [sortedCampaigns, searchQuery]);

  // ── AUDIT TRACKING: Search match metadata for user feedback ──
  const searchMatchInfo = useMemo(() => {
    if (!searchQuery.trim()) return { totalMatched: 0, byField: [] as string[] };
    const q = searchQuery.trim().toLowerCase();

    let matchTitle = 0, matchSlug = 0, matchPartner = 0, matchBeneficiary = 0;
    sortedCampaigns.forEach(c => {
      if (c.title?.toLowerCase().includes(q)) matchTitle++;
      if (c.slug?.toLowerCase().includes(q)) matchSlug++;
      if ((c.partner_name ?? '').toLowerCase().includes(q)) matchPartner++;
      if ((c.beneficiary_name ?? '').toLowerCase().includes(q)) matchBeneficiary++;
    });

    const byField: string[] = [];
    if (matchTitle > 0) byField.push(`${matchTitle} title`);
    if (matchSlug > 0) byField.push(`${matchSlug} slug`);
    if (matchPartner > 0) byField.push(`${matchPartner} partner`);
    if (matchBeneficiary > 0) byField.push(`${matchBeneficiary} beneficiary`);

    return {
      totalMatched: filteredCampaigns.length,
      byField,
    };
  }, [sortedCampaigns, filteredCampaigns, searchQuery]);

  // ── Derived date range ──
  const dateRange = useMemo(() => {
    if (activePreset === 'custom') {
      return {
        // Kolom transaction_date = DATE → kirim YYYY-MM-DD polos (no timezone).
        // customFrom/customTo dari input date sudah format 'YYYY-MM-DD'.
        from: customFrom || null,
        to: customTo || null,
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
    <AdminAuthGuard>
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

      <CommandCenterTabs active="cashflow" />

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

          {/* Dropdown Bulan + Tahun — pilih langsung */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 8 }}>
            <select
              value={selMonth}
              onChange={e => { const m = Number(e.target.value); setSelMonth(m); applyMonthYear(m, selYear); }}
              style={dateInputStyle(t)}
              title="Pilih bulan"
            >
              <option value={0}>Semua Bulan</option>
              {['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'].map((nm, i) => (
                <option key={i} value={i + 1}>{nm}</option>
              ))}
            </select>
            <select
              value={selYear}
              onChange={e => { const y = Number(e.target.value); setSelYear(y); applyMonthYear(selMonth, y); }}
              style={dateInputStyle(t)}
              title="Pilih tahun"
            >
              {Array.from({ length: 6 }, (_, i) => _now.getFullYear() - i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

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
        {summary && (
          <CashflowFlowDiagram 
            data={summary} 
            onCardClick={(category) => setExpansionPanel(prev => prev === category ? null : category)}
          />
        )}
      </div>

      {/* Stats Grid */}
      {summary && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12, marginBottom: 24,
        }}>
          <StatCard
            label="Total Masuk (GROSS)"
            value={formatRupiah(summary.total_in)}
            subtext={`${summary.donation_count} donasi · ${summary.donor_count} donatur`}
            color="#6366F1" t={t}
          />
          <StatCard
            label="Dana Beneficiary"
            value={formatRupiah((summary as any).total_beneficiary ?? 0)}
            subtext="Klik untuk detail + CSV"
            color="#0891B2" t={t}
            onClick={() => setExpansionPanel(prev => prev === 'beneficiary' ? null : 'beneficiary')}
          />
          <StatCard
            label="Disalurkan"
            value={formatRupiah(summary.total_disbursed)}
            subtext={`${summary.report_count} laporan (${summary.approved_report_count} approved)`}
            color="#10B981" t={t}
          />
          <StatCard
            label="Hak Beneficiary"
            value={formatRupiah(Math.max(0, ((summary as any).total_beneficiary_verified ?? (summary as any).total_beneficiary ?? 0) - summary.total_disbursed))}
            subtext="Utang ke penerima · Klik untuk breakdown"
            color="#F59E0B" t={t}
            alert={
              ((summary as any).total_beneficiary_verified ?? 0) > 0 && 
              ((((summary as any).total_beneficiary_verified ?? 0) - summary.total_disbursed) / ((summary as any).total_beneficiary_verified ?? 1)) > 0.5
            }
            onClick={() => setExpansionPanel(prev => prev === 'hak_beneficiary' ? null : 'hak_beneficiary')}
          />
          {(summary as any).total_beneficiary_under_audit > 0 && (
            <StatCard
              label="Hak Beneficiary Proses Audit"
              value={formatRupiah((summary as any).total_beneficiary_under_audit ?? 0)}
              subtext="Dana tertahan · menunggu resolusi audit"
              color="#8B5CF6" t={t}
              alert
              onClick={() => setExpansionPanel(prev => prev === 'under_audit' ? null : 'under_audit')}
            />
          )}
          <StatCard
            label="Fee TeraLoka"
            value={formatRupiah(summary.total_fee_remitted)}
            subtext={`dari expected ${formatRupiah(summary.total_fee_expected)}`}
            color="#BE185D" t={t}
            onClick={() => setExpansionPanel(prev => prev === 'fee_teraloka' ? null : 'fee_teraloka')}
          />
          <StatCard
            label="Tip Penggalang"
            value={formatRupiah((summary as any).total_penggalang_fee ?? 0)}
            subtext="Pendapatan Partner (opt-in)"
            color="#8B5CF6" t={t}
            onClick={() => setExpansionPanel(prev => prev === 'tip' ? null : 'tip')}
          />
        </div>
      )}

      {/* ⭐ Sesi 12 Phase Final: Inline expansion panel (replace modal) */}
      {expansionPanel && summary && (
        <CashflowDetailPanel
          category={expansionPanel}
          onClose={() => setExpansionPanel(null)}
          dateFrom={dateRange.from}
          dateTo={dateRange.to}
          periodLabel={dateLabel}
        />
      )}

      {/* ⭐ Sisa di Partner Breakdown Panel — Smart Drilldown */}
      {showSisaBreakdown && summary && !loading && (
        <div style={{
          background: t.mainBg,
          border: `1px solid ${t.sidebarBorder}`,
          borderLeft: '3px solid #F59E0B',
          borderRadius: 12, padding: 16, marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
                Breakdown Sisa di Partner
              </p>
              <p style={{ fontSize: 13, color: t.textDim }}>
                Total <strong style={{ color: t.textPrimary }}>{formatRupiah(summary.remaining_at_partner)}</strong> tersebar di {Object.values(sisaBreakdown.groups).reduce((s, g) => s + g.count, 0)} kampanye aktif
              </p>
            </div>
            <button
              onClick={() => setShowSisaBreakdown(false)}
              style={{
                padding: '4px 10px', borderRadius: 6,
                background: t.navHover, color: t.textDim,
                border: 'none', fontSize: 11, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Tutup ▲
            </button>
          </div>

          {/* Breakdown rows — render ALL levels termasuk closed kalau ada sisa */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(['critical', 'at_risk', 'warning', 'healthy', 'closed'] as AnomalyLevel[]).map(level => {
              const group = sisaBreakdown.groups[level];
              // Skip kalau benar-benar 0 sisa DAN 0 kampanye (gak relevan untuk show)
              if (group.count === 0 && group.amount === 0) return null;
              const pct = sisaBreakdown.total > 0 ? (group.amount / sisaBreakdown.total) * 100 : 0;
              const colors = ANOMALY_COLORS[level];
              const labels: Record<AnomalyLevel, { icon: string; name: string }> = {
                critical: { icon: '🔴', name: 'Critical' },
                at_risk:  { icon: '🟡', name: 'At Risk' },
                warning:  { icon: '🟠', name: 'Perhatian' },
                healthy:  { icon: '🟢', name: 'Healthy' },
                closed:   { icon: '⚫', name: 'Closed (ada sisa)' },
              };

              return (
                <div key={level} style={{
                  display: 'grid', gridTemplateColumns: '180px 1fr 140px 60px',
                  alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 8,
                  background: colors.bg, border: `1px solid ${colors.border}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{labels[level].icon}</span>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: colors.fg }}>
                        {labels[level].name}
                      </p>
                      <p style={{ fontSize: 10, color: t.textDim }}>
                        {group.count} kampanye
                      </p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{
                    height: 8, background: t.navHover, borderRadius: 4, overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${pct}%`, height: '100%',
                      background: colors.fg, transition: 'width 200ms',
                    }} />
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: colors.fg, textAlign: 'right' }}>
                    {formatRupiah(group.amount)}
                  </p>
                  <p style={{ fontSize: 11, color: t.textDim, textAlign: 'right' }}>
                    {pct.toFixed(0)}%
                  </p>
                </div>
              );
            })}
          </div>

          {/* Reconciliation footer with explicit Unaccounted handling */}
          {(() => {
            const cardTotal = summary.remaining_at_partner;
            const breakdownTotal = sisaBreakdown.total;
            const unaccounted = cardTotal - breakdownTotal;
            const hasUnaccounted = Math.abs(unaccounted) > 0;

            return (
              <>
                {/* Unaccounted row — explicit row kalau ada selisih */}
                {hasUnaccounted && (
                  <div style={{
                    display: 'grid', gridTemplateColumns: '180px 1fr 140px 60px',
                    alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px dashed rgba(99, 102, 241, 0.35)',
                    marginTop: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14 }}>❓</span>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#6366F1' }}>
                          Belum Ter-kategorikan
                        </p>
                        <p style={{ fontSize: 10, color: t.textDim }}>
                          {Math.max(0, campaigns.length - Object.values(sisaBreakdown.groups).reduce((s, g) => s + g.count, 0))} kampanye
                        </p>
                      </div>
                    </div>
                    <div style={{
                      height: 8, background: t.navHover, borderRadius: 4, overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${(Math.abs(unaccounted) / cardTotal) * 100}%`, height: '100%',
                        background: '#6366F1',
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.15) 4px, rgba(255,255,255,0.15) 8px)',
                      }} />
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#6366F1', textAlign: 'right' }}>
                      {formatRupiah(Math.abs(unaccounted))}
                    </p>
                    <p style={{ fontSize: 11, color: t.textDim, textAlign: 'right' }}>
                      {((Math.abs(unaccounted) / cardTotal) * 100).toFixed(0)}%
                    </p>
                  </div>
                )}
              </>
            );
          })()}

          {/* Reconciliation footer */}
          {(() => {
            const cardTotal = summary.remaining_at_partner;
            const breakdownTotal = sisaBreakdown.total;
            const unaccounted = cardTotal - breakdownTotal;
            const hasUnaccounted = Math.abs(unaccounted) > 0;
            const grandTotal = breakdownTotal + (hasUnaccounted ? Math.abs(unaccounted) : 0);

            return (
              <>
                <div style={{
                  marginTop: 12, padding: '10px 12px',
                  background: t.navHover + '55', borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: t.textDim }}>
                    ✓ Total semua kategori (termasuk belum ter-kategorikan)
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 800, color: grandTotal === cardTotal ? '#10B981' : '#DC2626' }}>
                    {formatRupiah(grandTotal)}
                    {grandTotal === cardTotal
                      ? <span style={{ fontSize: 10, color: '#10B981', marginLeft: 6, fontWeight: 600 }}>✓ MATCH</span>
                      : <span style={{ fontSize: 10, color: '#DC2626', marginLeft: 6, fontWeight: 600 }}>⚠️ MISMATCH</span>
                    }
                  </p>
                </div>

                {/* Helper hint — context-aware ACTIVE list */}
                {hasUnaccounted ? (
                  <div style={{
                    marginTop: 10, padding: 14,
                    background: 'rgba(99,102,241,0.06)',
                    border: '1px solid rgba(99,102,241,0.25)',
                    borderRadius: 10,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 14 }}>ℹ️</span>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#6366F1' }}>
                        Kampanye yang terdeteksi belum ter-kategorikan ({unaccountedInfo.campaigns.length})
                      </p>
                    </div>

                    {/* Active list — kampanye yang terdeteksi anomaly */}
                    {unaccountedInfo.closedWithRemaining.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          ⚫ Closed dengan saldo &gt; 0 ({unaccountedInfo.closedWithRemaining.length})
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {unaccountedInfo.closedWithRemaining.map(c => (
                            <div key={c.id} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '6px 10px', borderRadius: 6,
                              background: 'rgba(107,114,128,0.08)',
                              fontSize: 11,
                            }}>
                              <span style={{ color: t.textPrimary, fontWeight: 600, maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.title}
                              </span>
                              <span style={{ color: '#6366F1', fontWeight: 700 }}>
                                {formatRupiah(c.remaining_at_partner || 0)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {unaccountedInfo.suspiciousZero.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          ⚠️ Data inconsistent (frontend=0, backend≠0) ({unaccountedInfo.suspiciousZero.length})
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {unaccountedInfo.suspiciousZero.map(c => {
                            const expected = (c.collected_amount || 0) - (c.disbursed_amount || 0);
                            return (
                              <div key={c.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '6px 10px', borderRadius: 6,
                                background: 'rgba(220,38,38,0.06)',
                                fontSize: 11,
                              }}>
                                <span style={{ color: t.textPrimary, fontWeight: 600, maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {c.title}
                                </span>
                                <span style={{ color: '#DC2626', fontSize: 10 }}>
                                  collected−disbursed = {formatRupiah(expected)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* If we found exact matches */}
                    {(() => {
                      const identifiedTotal = unaccountedInfo.closedWithRemaining.reduce((s, c) => s + (c.remaining_at_partner || 0), 0)
                        + unaccountedInfo.suspiciousZero.reduce((s, c) => s + ((c.collected_amount || 0) - (c.disbursed_amount || 0)), 0);
                      const stillUnknown = Math.abs(unaccounted) - identifiedTotal;

                      if (stillUnknown > 0) {
                        return (
                          <div style={{
                            marginTop: 8, padding: '8px 10px',
                            background: 'rgba(220,38,38,0.05)',
                            border: '1px dashed rgba(220,38,38,0.3)',
                            borderRadius: 6,
                          }}>
                            <p style={{ fontSize: 11, color: '#DC2626', fontWeight: 600, marginBottom: 2 }}>
                              ⚠️ Sisa {formatRupiah(stillUnknown)} belum dapat di-identify dari data ini
                            </p>
                            <p style={{ fontSize: 10, color: t.textDim, fontStyle: 'italic' }}>
                              Backend audit diperlukan (defer ke sesi berikutnya). Kemungkinan: campaign di luar pagination/filter, atau ada inconsistency di `cashflow-analytics.ts`.
                            </p>
                          </div>
                        );
                      }
                      if (unaccountedInfo.campaigns.length > 0) {
                        return (
                          <p style={{ fontSize: 11, color: '#10B981', marginTop: 6, fontWeight: 600 }}>
                            ✓ Semua selisih sudah ter-identify
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                ) : (
                  <p style={{ fontSize: 11, color: t.textDim, marginTop: 10, fontStyle: 'italic' }}>
                    💡 Critical = kampanye yang perlu keputusan founder · scroll ke tabel untuk lihat detail kampanye per kategori
                  </p>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ⭐ AUDIT TRACKING — Universal Search Box */}
      <div style={{
        background: t.mainBg,
        border: `1px solid ${t.sidebarBorder}`,
        borderRadius: 12, padding: 14, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 14 }}>🔍</span>
          <p style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Audit Tracking — Cari Kode/Donor/Kampanye/Partner
          </p>
        </div>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Contoh: 412 (kode donasi) · Bu Yati (donor) · gempa-tidore (slug) · Riahi Pratama (partner)"
            style={{
              width: '100%', padding: '10px 36px 10px 12px',
              border: `1px solid ${searchQuery ? '#EC4899' : t.sidebarBorder}`,
              borderRadius: 10,
              background: t.mainBg, color: t.textPrimary,
              fontSize: 13, fontWeight: 500, outline: 'none',
              transition: 'border 150ms',
              fontFamily: 'inherit',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                width: 22, height: 22, borderRadius: 6,
                background: t.navHover, color: t.textDim, border: 'none',
                fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>
        {searchQuery && (
          <div style={{
            marginTop: 10, padding: '8px 10px',
            background: 'rgba(236,72,153,0.06)',
            border: '1px solid rgba(236,72,153,0.2)',
            borderRadius: 8,
            fontSize: 11, color: t.textDim,
          }}>
            {searchMatchInfo.totalMatched === 0 ? (
              <span style={{ color: '#DC2626' }}>
                ⚠️ Tidak ada kampanye/donasi yang cocok dengan "<strong>{searchQuery}</strong>"
              </span>
            ) : (
              <>
                <span style={{ color: '#EC4899', fontWeight: 600 }}>
                  ✓ {searchMatchInfo.totalMatched} hasil ditemukan
                </span>
                {searchMatchInfo.byField.length > 0 && (
                  <span style={{ marginLeft: 8 }}>
                    ({searchMatchInfo.byField.join(' · ')})
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>

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

          <CampaignCashflowTable
            campaigns={filteredCampaigns}
            anomalyMap={anomalyMap}
            searchQuery={searchQuery}
          />

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
    </AdminAuthGuard>
  );
}

// ── Stat Card ────────────────────────────────────

function StatCard({
  label, value, subtext, color, t, alert, onClick,
}: {
  label: string; value: string; subtext?: string; color: string;
  t: any; alert?: boolean;
  onClick?: () => void;
}) {
  const isClickable = !!onClick;
  return (
    <div
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      style={{
        background: alert ? color + '10' : t.mainBg,
        border: `1px solid ${alert ? color + '40' : t.sidebarBorder}`,
        borderRadius: 12, padding: 14,
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'all 200ms',
        position: 'relative',
      }}
      className={isClickable ? 'cf-statcard-clickable' : ''}
    >
      <p style={{
        fontSize: 11, fontWeight: 700,
        color: alert ? color : t.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
      }}>
        {label}
      </p>
      <p style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 4, lineHeight: 1.2 }}>
        {value}
      </p>
      {subtext && (
        <p style={{ fontSize: 10, color: isClickable ? color : t.textMuted, opacity: isClickable ? 0.9 : 0.75, fontWeight: 500 }}>
          {subtext}
        </p>
      )}
      <style jsx>{`
        :global(.cf-statcard-clickable):hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
          border-color: ${color}50 !important;
        }
      `}</style>
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
