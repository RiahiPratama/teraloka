'use client';

import { useContext, useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// ── Types ─────────────────────────────────────────
export interface CampaignCashflow {
  id: string;
  display_id?: string;  // ⭐ Sesi 13: BDN-CMP-2026-XXXXX
  title: string;
  slug: string;
  partner_name: string | null;
  beneficiary_name: string;
  status: string;
  is_urgent: boolean;
  category: string;
  target_amount: number;
  collected_amount: number;
  donor_count: number;
  disbursed_amount: number;
  disbursed_pending_amount?: number;  // ⭐ Sesi 13: dana perjalanan (pending verify admin)
  remaining_at_partner: number;
  disbursement_rate: number;
  report_count: number;
  approved_report_count: number;
  last_report_at: string | null;
  days_since_report: number | null;
  needs_report: boolean;
  created_at: string;
  verified_at: string | null;
  deadline: string | null;
}

// ⭐ Sprint 2.3 Phase 3b: Donation drilldown type
// ⭐ Sesi 13 Mission 2A: Extended dengan display_id + total_transfer + penggalang_fee + kode_unik
interface DrilldownDonation {
  id: string;
  display_id?: string;          // ⭐ BDN-DON-2026-XXXXX
  donor_name: string;
  donor_phone?: string;
  is_anonymous: boolean;
  amount: number;                // Hak Beneficiary
  operational_fee: number;       // Fee TeraLoka
  penggalang_fee?: number;       // ⭐ Tip Penggalang (0 = tidak opt-in)
  // NOTE: Kode Unik DERIVE dari parseInt(donation_code) — bukan kolom DB terpisah
  // Source: donations-public.ts (totalTransfer formula)
  total_transfer?: number;       // ⭐ Gross (amount + operational_fee + penggalang_fee + parseInt(donation_code))
  donation_code: string;
  verification_status: 'pending' | 'verified' | 'rejected' | 'under_audit';
  verified_at?: string;
  fee_remitted_at?: string;
  created_at: string;
  // Escalation context (auto-set saat penggalang offline extended)
  escalated_to_admin_at?: string;
  escalation_reason?: string;
}

// ── Helpers ──────────────────────────────────────
function shortRupiah(n: number): string {
  // Long format (full precision) — for financial verification context.
  return 'Rp ' + (n ?? 0).toLocaleString('id-ID');
}

function formatDateShort(iso: string | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' });
}

// ⭐ Sesi 13 Mission 2A: Accounting standard format
// Parentheses notation untuk deductible (rejected donations = pengurang)
// Standard internasional: $(106,641) = -$106,641
function accountingFormat(n: number, isDeductible: boolean = false): string {
  const formatted = shortRupiah(Math.abs(n));
  return isDeductible ? `(${formatted})` : formatted;
}

// ⭐ Sesi 13 Mission 2C: Download CSV semua donasi (termasuk rejected dgn negative notation)
function downloadCSV(donations: DrilldownDonation[], campaignTitle: string): void {
  // Header
  let csv = 'No,Donor,Phone,Nomor Donasi,Tgl Donasi,Tgl Verifikasi,Total Transfer,Hak Beneficiary,Fee TeraLoka,Kode Unik,Tip Penggalang,Status,Fee Setor,Kode Transfer\n';
  
  // Split valid + rejected (accounting standard)
  const validDonations = donations.filter(d => d.verification_status !== 'rejected');
  const rejectedDonations = donations.filter(d => d.verification_status === 'rejected');
  
  let rowNum = 1;
  
  // Valid rows first
  validDonations.forEach((d) => {
    const kodeUnik = d.donation_code ? (parseInt(d.donation_code, 10) || 0) : 0;
    const totalTransfer = Number(d.total_transfer) || ((Number(d.amount) || 0) + (Number(d.operational_fee) || 0) + (Number(d.penggalang_fee) || 0) + kodeUnik);
    csv += [
      rowNum++,
      `"${(d.is_anonymous ? 'Anonim' : d.donor_name).replace(/"/g, '""')}"`,
      d.donor_phone ?? '',
      d.display_id ?? '',
      d.created_at ? new Date(d.created_at).toLocaleDateString('id-ID') : '',
      d.verified_at ? new Date(d.verified_at).toLocaleDateString('id-ID') : '',
      totalTransfer,
      d.amount,
      d.operational_fee,
      kodeUnik,
      d.penggalang_fee ?? 0,
      d.verification_status,
      d.fee_remitted_at ? 'Sudah' : 'Belum',
      d.donation_code ?? '',
    ].join(',') + '\n';
  });
  
  // Rejected rows last (deductible — negative notation untuk Excel auto-detect)
  rejectedDonations.forEach((d) => {
    const kodeUnik = d.donation_code ? (parseInt(d.donation_code, 10) || 0) : 0;
    const totalTransfer = Number(d.total_transfer) || ((Number(d.amount) || 0) + (Number(d.operational_fee) || 0) + (Number(d.penggalang_fee) || 0) + kodeUnik);
    csv += [
      rowNum++,
      `"${(d.is_anonymous ? 'Anonim' : d.donor_name).replace(/"/g, '""')}"`,
      d.donor_phone ?? '',
      d.display_id ?? '',
      d.created_at ? new Date(d.created_at).toLocaleDateString('id-ID') : '',
      d.verified_at ? new Date(d.verified_at).toLocaleDateString('id-ID') : '',
      `-${totalTransfer}`,
      `-${d.amount}`,
      `-${d.operational_fee}`,
      `-${kodeUnik}`,
      `-${d.penggalang_fee ?? 0}`,
      'rejected',
      '—',
      d.donation_code ?? '',
    ].join(',') + '\n';
  });
  
  // Footer TOTAL (exclude rejected per accounting standard)
  const totalTransferAll = validDonations.reduce((s, d) => {
    const k = d.donation_code ? (parseInt(d.donation_code, 10) || 0) : 0;
    return s + (Number(d.total_transfer) || ((Number(d.amount) || 0) + (Number(d.operational_fee) || 0) + (Number(d.penggalang_fee) || 0) + k));
  }, 0);
  const totalBenAll = validDonations.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const totalFeeAll = validDonations.reduce((s, d) => s + (Number(d.operational_fee) || 0), 0);
  const totalKodeAll = validDonations.reduce((s, d) => {
    const k = d.donation_code ? (parseInt(d.donation_code, 10) || 0) : 0;
    return s + k;
  }, 0);
  const totalTipAll = validDonations.reduce((s, d) => s + (Number(d.penggalang_fee) || 0), 0);
  
  csv += `\n,,,,,TOTAL VALID (${validDonations.length} donasi),${totalTransferAll},${totalBenAll},${totalFeeAll},${totalKodeAll},${totalTipAll},,,\n`;
  
  if (rejectedDonations.length > 0) {
    const rejTransfer = rejectedDonations.reduce((s, d) => {
      const k = d.donation_code ? (parseInt(d.donation_code, 10) || 0) : 0;
      return s + (Number(d.total_transfer) || ((Number(d.amount) || 0) + (Number(d.operational_fee) || 0) + (Number(d.penggalang_fee) || 0) + k));
    }, 0);
    csv += `,,,,,REJECTED tak dihitung (${rejectedDonations.length} donasi),-${rejTransfer},,,,,,,\n`;
  }
  
  // Trigger download (UTF-8 BOM untuk Excel)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeTitle = (campaignTitle || 'campaign').replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 50);
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `drilldown-${safeTitle}-${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function rateColor(rate: number): string {
  if (rate >= 80) return '#10B981'; // green — well disbursed
  if (rate >= 40) return '#F59E0B'; // amber — mid
  if (rate > 0)   return '#EA580C'; // orange — low
  return '#6B7280';                  // gray — zero
}

// ═══════════════════════════════════════════════════════════════
// CAMPAIGN CASHFLOW TABLE
// ═══════════════════════════════════════════════════════════════

// ⭐ Smart anomaly types (mirror cashflow page)
export type AnomalyLevel = 'critical' | 'at_risk' | 'warning' | 'healthy' | 'closed';
export interface AnomalyInfo {
  level: AnomalyLevel;
  label: string;
  reasons: string[];
  priority_score: number;
  action_hint: string;
}

const SMART_ANOMALY_COLORS: Record<AnomalyLevel, { fg: string; bg: string; border: string }> = {
  critical: { fg: '#DC2626', bg: 'rgba(220,38,38,0.10)', border: 'rgba(220,38,38,0.35)' },
  at_risk:  { fg: '#EA580C', bg: 'rgba(234,88,12,0.10)',  border: 'rgba(234,88,12,0.35)' },
  warning:  { fg: '#D97706', bg: 'rgba(217,119,6,0.10)',  border: 'rgba(217,119,6,0.30)' },
  healthy:  { fg: '#10B981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
  closed:   { fg: '#6B7280', bg: 'rgba(107,114,128,0.08)',border: 'rgba(107,114,128,0.25)' },
};

export default function CampaignCashflowTable({
  campaigns,
  anomalyMap,
  searchQuery = '',
}: {
  campaigns: CampaignCashflow[];
  anomalyMap?: Record<string, AnomalyInfo>;
  searchQuery?: string;
}) {
  const { t } = useContext(AdminThemeContext);

  // ⭐ Sprint 2.3 Phase 3b: Drilldown state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [donationsByCampaign, setDonationsByCampaign] = useState<Record<string, DrilldownDonation[]>>({});
  const [loadingCampaign, setLoadingCampaign] = useState<string | null>(null);

  // ── AUDIT TRACKING: Highlight matched text helper ──
  const highlightMatch = useCallback((text: string | null | undefined): React.ReactNode => {
    if (!text) return null;
    if (!searchQuery.trim()) return text;
    const q = searchQuery.trim().toLowerCase();
    const lower = text.toLowerCase();
    const idx = lower.indexOf(q);
    if (idx === -1) return text;
    return (
      <>
        {text.substring(0, idx)}
        <span style={{
          background: 'rgba(236,72,153,0.25)',
          color: '#EC4899',
          fontWeight: 700,
          padding: '0 2px',
          borderRadius: 3,
        }}>
          {text.substring(idx, idx + q.length)}
        </span>
        {text.substring(idx + q.length)}
      </>
    );
  }, [searchQuery]);

  // ── AUDIT TRACKING: Check if donation matches search ──
  const donationMatchesSearch = useCallback((d: DrilldownDonation): boolean => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.trim().toLowerCase();
    return (
      d.donation_code?.toLowerCase().includes(q) ||
      d.donor_name?.toLowerCase().includes(q) ||
      d.donor_phone?.toLowerCase().includes(q) ||
      false
    );
  }, [searchQuery]);

  const fetchDonations = useCallback(async (campaignId: string) => {
    if (donationsByCampaign[campaignId]) return; // sudah ada cache
    
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    
    setLoadingCampaign(campaignId);
    try {
      const res = await fetch(
        `${API_URL}/funding/admin/donations?campaign_id=${campaignId}&limit=100&sort=newest`,
        { headers: { Authorization: `Bearer ${tk}` } }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setDonationsByCampaign(prev => ({ ...prev, [campaignId]: json.data ?? [] }));
      }
    } catch (err) {
      console.error('Fetch donations failed:', err);
    } finally {
      setLoadingCampaign(null);
    }
  }, [donationsByCampaign]);

  const toggleExpand = useCallback((campaignId: string) => {
    if (expandedId === campaignId) {
      setExpandedId(null);
    } else {
      setExpandedId(campaignId);
      fetchDonations(campaignId);
    }
  }, [expandedId, fetchDonations]);

  // ── AUDIT TRACKING: Auto-fetch donations untuk SEMUA campaign saat search aktif ──
  // Ini supaya search by kode donasi / donor name bisa cross-campaign tanpa expand manual.
  // Strategi: kalau searchQuery aktif, pre-fetch donations untuk visible campaigns.
  useEffect(() => {
    if (!searchQuery.trim() || campaigns.length === 0) return;

    // Pre-fetch donations untuk first N campaigns yang belum di-cache
    const PREFETCH_LIMIT = 10; // batasi untuk performa
    const toFetch = campaigns
      .slice(0, PREFETCH_LIMIT)
      .filter(c => !donationsByCampaign[c.id]);

    toFetch.forEach(c => {
      fetchDonations(c.id);
    });
  }, [searchQuery, campaigns, donationsByCampaign, fetchDonations]);

  // ── AUDIT TRACKING: Identify campaigns with matching donations ──
  // Untuk auto-expand: campaign yang donations-nya ada yang match search
  const campaignsWithDonationMatch = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.trim().toLowerCase();
    const matched = new Set<string>();

    Object.entries(donationsByCampaign).forEach(([campaignId, donations]) => {
      const hasMatch = donations.some(d =>
        d.donation_code?.toLowerCase().includes(q) ||
        d.donor_name?.toLowerCase().includes(q) ||
        d.donor_phone?.toLowerCase().includes(q)
      );
      if (hasMatch) matched.add(campaignId);
    });

    return matched;
  }, [searchQuery, donationsByCampaign]);

  // Auto-expand first campaign yang punya donation match (kalau expandedId belum di set)
  useEffect(() => {
    if (!searchQuery.trim() || campaignsWithDonationMatch.size === 0) return;
    if (expandedId && campaignsWithDonationMatch.has(expandedId)) return; // sudah expand yang correct

    const firstMatch = campaigns.find(c => campaignsWithDonationMatch.has(c.id));
    if (firstMatch && firstMatch.id !== expandedId) {
      setExpandedId(firstMatch.id);
    }
  }, [searchQuery, campaignsWithDonationMatch, campaigns, expandedId]);

  if (campaigns.length === 0) {
    return (
      <div style={{
        background: t.mainBg,
        border: `1px solid ${t.sidebarBorder}`,
        borderRadius: 16, padding: 60, textAlign: 'center',
      }}>
        {searchQuery.trim() ? (
          <>
            <p style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, marginBottom: 4 }}>
              🔍 Tidak ada kampanye yang cocok
            </p>
            <p style={{ fontSize: 12, color: t.textDim, marginBottom: 8 }}>
              Tidak ada hasil untuk "<strong>{searchQuery}</strong>"
            </p>
            <p style={{ fontSize: 11, color: t.textMuted }}>
              Tips: search bisa pakai kode donasi (412), nama donor, slug kampanye, atau partner.
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, marginBottom: 4 }}>
              Tidak ada kampanye dalam rentang ini
            </p>
            <p style={{ fontSize: 12, color: t.textDim }}>
              Coba ubah rentang tanggal atau filter.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{
      background: t.mainBg,
      border: `1px solid ${t.sidebarBorder}`,
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%', borderCollapse: 'collapse', fontSize: 12,
        }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${t.sidebarBorder}`, background: t.navHover + '55' }}>
              <th style={thStyle(t, 'center', 36)}></th>{/* Expand toggle column */}
              <th style={thStyle(t, 'left')}>Kampanye</th>
              <th style={thStyle(t, 'right', 110)}>Terkumpul</th>
              <th style={thStyle(t, 'right', 110)}>Disalurkan</th>
              <th style={thStyle(t, 'right', 110)}>Sisa</th>
              <th style={thStyle(t, 'center', 110)}>Rate</th>
              <th style={thStyle(t, 'center', 90)}>Laporan</th>
              <th style={thStyle(t, 'center', 90)}>Update</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c, idx) => {
              const isLast = idx === campaigns.length - 1;
              const rc = rateColor(c.disbursement_rate);
              const isExpanded = expandedId === c.id;
              const donations = donationsByCampaign[c.id];
              const isLoading = loadingCampaign === c.id;

              return (
                <Fragment key={c.id}>
                <tr
                  onClick={() => toggleExpand(c.id)}
                  style={{
                    borderBottom: (isLast && !isExpanded) ? 'none' : `1px solid ${t.sidebarBorder}`,
                    transition: 'background 120ms',
                    cursor: 'pointer',
                    background: isExpanded
                      ? t.navHover + '33'
                      : anomalyMap && anomalyMap[c.id]?.level === 'critical'
                        ? 'rgba(220,38,38,0.04)'
                        : anomalyMap && anomalyMap[c.id]?.level === 'at_risk'
                          ? 'rgba(234,88,12,0.03)'
                          : 'transparent',
                    boxShadow: anomalyMap && anomalyMap[c.id]?.level === 'critical'
                      ? 'inset 3px 0 0 #DC2626'
                      : anomalyMap && anomalyMap[c.id]?.level === 'at_risk'
                        ? 'inset 3px 0 0 #EA580C'
                        : 'none',
                  }}
                  onMouseEnter={e => {
                    if (!isExpanded) e.currentTarget.style.background = t.navHover + '22';
                  }}
                  onMouseLeave={e => {
                    if (!isExpanded) {
                      const lvl = anomalyMap?.[c.id]?.level;
                      e.currentTarget.style.background =
                        lvl === 'critical' ? 'rgba(220,38,38,0.04)' :
                        lvl === 'at_risk' ? 'rgba(234,88,12,0.03)' :
                        'transparent';
                    }
                  }}
                >
                  {/* ⭐ Expand toggle */}
                  <td style={tdStyle(t, 'center')}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 24, height: 24, borderRadius: 6,
                      color: isExpanded ? '#EC4899' : t.textDim,
                      background: isExpanded ? 'rgba(236,72,153,0.1)' : 'transparent',
                      transition: 'all 150ms',
                    }}>
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  </td>

                  {/* Campaign Info */}
                  <td style={tdStyle(t, 'left')}>
                    <div style={{ minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      {/* ⭐ AUDIT TRACKING: Display ID Prominent (Sesi 13) */}
                      {(() => {
                        // Pakai display_id (BDN-CMP-2026-XXXXX) sebagai primary identifier
                        // Tampil FULL untuk audit clarity (konsisten dengan BDN-DON-2026-XXXXX)
                        let campaignNumber: string;
                        if (c.display_id) {
                          campaignNumber = c.display_id;
                        } else {
                          // Legacy fallback
                          const slugParts = (c.slug || '').split('-');
                          const lastPart = slugParts[slugParts.length - 1];
                          const isHashSuffix = /^[a-f0-9]{4,8}$/i.test(lastPart);
                          campaignNumber = isHashSuffix
                            ? `#${lastPart.toUpperCase()}`
                            : `#${c.id.substring(0, 6).toUpperCase()}`;
                        }

                        // Anomaly tooltip info (kalau ada)
                        const anomalyTooltip = anomalyMap && anomalyMap[c.id] && anomalyMap[c.id].level !== 'healthy' && anomalyMap[c.id].level !== 'closed'
                          ? `${anomalyMap[c.id].label}: ${anomalyMap[c.id].reasons.join(' · ')}${anomalyMap[c.id].action_hint ? ` || Action: ${anomalyMap[c.id].action_hint}` : ''}`
                          : c.is_urgent ? 'Kampanye urgent humanitarian' : `Nomor kampanye: ${campaignNumber}`;

                        // Border color tergantung anomaly level (subtle indicator)
                        const anomalyLevel = anomalyMap?.[c.id]?.level;
                        const numberColor = anomalyLevel === 'critical' ? '#DC2626'
                                         : anomalyLevel === 'at_risk' ? '#EA580C'
                                         : anomalyLevel === 'warning' ? '#D97706'
                                         : c.is_urgent ? '#EF4444'
                                         : t.textMuted;
                        const numberBg = anomalyLevel === 'critical' ? 'rgba(220,38,38,0.10)'
                                       : anomalyLevel === 'at_risk' ? 'rgba(234,88,12,0.10)'
                                       : anomalyLevel === 'warning' ? 'rgba(217,119,6,0.10)'
                                       : c.is_urgent ? 'rgba(239,68,68,0.10)'
                                       : t.navHover;
                        const numberBorder = anomalyLevel === 'critical' ? 'rgba(220,38,38,0.40)'
                                          : anomalyLevel === 'at_risk' ? 'rgba(234,88,12,0.40)'
                                          : anomalyLevel === 'warning' ? 'rgba(217,119,6,0.35)'
                                          : c.is_urgent ? 'rgba(239,68,68,0.30)'
                                          : t.sidebarBorder;

                        return (
                          <span
                            title={anomalyTooltip}
                            style={{
                              fontSize: 10, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                              fontWeight: 800,
                              padding: '3px 8px', borderRadius: 6,
                              background: numberBg,
                              color: numberColor,
                              border: `1px solid ${numberBorder}`,
                              flexShrink: 0, marginTop: 1,
                              cursor: anomalyTooltip ? 'help' : 'default',
                              letterSpacing: '0.04em',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {campaignNumber}
                          </span>
                        );
                      })()}

                      <div style={{ minWidth: 0, flex: 1 }}>
                        {/* Campaign Title */}
                        <div style={{
                          fontSize: 12, fontWeight: 700, color: t.textPrimary,
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                          marginBottom: 3,
                        }}>
                          {highlightMatch(c.title)}
                        </div>

                        {/* ⭐ AUDIT TRACKING: Slug (kode kampanye human-readable) */}
                        <div style={{
                          fontSize: 9, color: t.textMuted, marginBottom: 4,
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {highlightMatch(c.slug)}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {/* ⭐ AUDIT TRACKING: Badge ✓ Ada Match Donasi */}
                          {searchQuery.trim() && campaignsWithDonationMatch.has(c.id) && (
                            <span style={{
                              fontSize: 9, fontWeight: 800,
                              padding: '2px 6px', borderRadius: 4,
                              background: 'rgba(236,72,153,0.15)',
                              color: '#EC4899',
                              textTransform: 'uppercase', letterSpacing: '0.04em',
                              border: '1px solid rgba(236,72,153,0.3)',
                            }}>
                              ✓ MATCH DONASI
                            </span>
                          )}
                          {c.partner_name && (
                            <span style={{
                              fontSize: 10, color: '#EC4899', fontWeight: 700,
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}>
                              <span style={{ fontSize: 9, opacity: 0.7 }}>🏢</span>
                              {highlightMatch(c.partner_name)}
                            </span>
                          )}
                          {c.beneficiary_name && (
                            <span style={{
                              fontSize: 10, color: t.textDim, fontWeight: 500,
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}>
                              <span style={{ fontSize: 9, opacity: 0.7 }}>👤</span>
                              {highlightMatch(c.beneficiary_name)}
                            </span>
                          )}
                          {c.needs_report && (
                            <span
                              title={`Butuh laporan (${c.days_since_report ?? 'belum ada'} hari sejak laporan terakhir)`}
                              style={{
                                fontSize: 9, fontWeight: 700,
                                padding: '2px 6px', borderRadius: 4,
                                background: 'rgba(234,88,12,0.12)',
                                color: '#EA580C',
                                textTransform: 'uppercase', letterSpacing: '0.04em',
                              }}>
                              ⚠ Butuh Laporan
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Collected */}
                  <td style={tdStyle(t, 'right')}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>
                      {shortRupiah(c.collected_amount)}
                    </div>
                    {c.donor_count > 0 && (
                      <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>
                        {c.donor_count} donatur
                      </div>
                    )}
                  </td>

                  {/* Disbursed (verified + pending visible) */}
                  <td style={tdStyle(t, 'right')}>
                    <div style={{
                      fontSize: 13, fontWeight: 700,
                      color: c.disbursed_amount > 0 ? '#10B981' : t.textMuted,
                    }}>
                      {shortRupiah(c.disbursed_amount)}
                    </div>
                    {/* ⭐ Sesi 13: Show pending disbursement (dana perjalanan) */}
                    {(c.disbursed_pending_amount ?? 0) > 0 && (
                      <div 
                        title="Sedang proses verifikasi admin (belum masuk ledger verified)"
                        style={{
                          fontSize: 10, fontWeight: 600, color: '#F59E0B',
                          marginTop: 2, opacity: 0.85,
                        }}
                      >
                        ⏳ +{shortRupiah(c.disbursed_pending_amount ?? 0)}
                        <span style={{ fontSize: 8, marginLeft: 3, opacity: 0.7 }}>pending</span>
                      </div>
                    )}
                  </td>

                  {/* Remaining at partner */}
                  <td style={tdStyle(t, 'right')}>
                    <div style={{
                      fontSize: 12, fontWeight: 600,
                      color: c.remaining_at_partner > 0 ? '#F59E0B' : t.textMuted,
                    }}>
                      {shortRupiah(c.remaining_at_partner)}
                    </div>
                  </td>

                  {/* Rate with mini progress bar */}
                  <td style={tdStyle(t, 'center')}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: rc }}>
                        {c.disbursement_rate}%
                      </span>
                      <div style={{
                        width: 70, height: 4, background: t.navHover,
                        borderRadius: 999, overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${Math.min(c.disbursement_rate, 100)}%`,
                          height: '100%', background: rc,
                          transition: 'width 300ms',
                        }} />
                      </div>
                    </div>
                  </td>

                  {/* Report count */}
                  <td style={tdStyle(t, 'center')}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 12, fontWeight: 700,
                      color: c.report_count > 0 ? t.textPrimary : t.textMuted,
                    }}>
                      <span style={{ fontSize: 10 }}>📄</span>
                      {c.report_count}
                    </div>
                    {c.approved_report_count > 0 && c.approved_report_count !== c.report_count && (
                      <div style={{ fontSize: 9, color: '#10B981', marginTop: 2 }}>
                        {c.approved_report_count} approved
                      </div>
                    )}
                  </td>

                  {/* Days since report */}
                  <td style={tdStyle(t, 'center')}>
                    {c.days_since_report !== null ? (
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: c.days_since_report > 30 ? '#EA580C'
                             : c.days_since_report > 7  ? '#F59E0B'
                             : t.textDim,
                      }}>
                        {c.days_since_report}h lalu
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: t.textMuted, fontStyle: 'italic' }}>
                        belum ada
                      </span>
                    )}
                  </td>
                </tr>

                {/* ⭐ Sprint 2.3 Phase 3b: Expanded row — donations drilldown */}
                {isExpanded && (
                  <tr key={`${c.id}-expanded`}
                    style={{
                      borderBottom: isLast ? 'none' : `1px solid ${t.sidebarBorder}`,
                      background: t.navHover + '15',
                    }}
                  >
                    <td colSpan={8} style={{ padding: '0 16px 16px 16px' }}>
                      <ExpandedDonations
                        donations={donations}
                        loading={isLoading}
                        campaignTitle={c.title}
                        t={t}
                        searchQuery={searchQuery}
                      />
                    </td>
                  </tr>
                )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ⭐ Sprint 2.3 Phase 3b: Expanded donations drilldown component
// ⭐ Sesi 13 Mission 2A: + Pagination 10/page + Footer Total + 4 kolom baru
function ExpandedDonations({
  donations,
  loading,
  campaignTitle,
  t,
  searchQuery = '',
}: {
  donations: DrilldownDonation[] | undefined;
  loading: boolean;
  campaignTitle: string;
  t: any;
  searchQuery?: string;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  // ── AUDIT TRACKING: Highlight matched text ──
  const highlightMatch = (text: string | null | undefined): React.ReactNode => {
    if (!text) return null;
    if (!searchQuery.trim()) return text;
    const q = searchQuery.trim().toLowerCase();
    const lower = text.toLowerCase();
    const idx = lower.indexOf(q);
    if (idx === -1) return text;
    return (
      <>
        {text.substring(0, idx)}
        <span style={{
          background: 'rgba(236,72,153,0.25)',
          color: '#EC4899',
          fontWeight: 700,
          padding: '0 2px',
          borderRadius: 3,
        }}>
          {text.substring(idx, idx + q.length)}
        </span>
        {text.substring(idx + q.length)}
      </>
    );
  };

  // Check if donation matches search
  const donationMatches = (d: DrilldownDonation): boolean => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.trim().toLowerCase();
    return (
      d.donation_code?.toLowerCase().includes(q) ||
      d.donor_name?.toLowerCase().includes(q) ||
      d.donor_phone?.toLowerCase().includes(q) ||
      false
    );
  };
  if (loading) {
    return (
      <div style={{
        padding: 24, textAlign: 'center',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <Loader2 size={16} style={{ color: t.textDim, animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 12, color: t.textDim }}>Memuat donasi...</span>
      </div>
    );
  }

  if (!donations || donations.length === 0) {
    return (
      <div style={{
        padding: 16, textAlign: 'center',
        background: t.mainBg, borderRadius: 8,
        border: `1px dashed ${t.sidebarBorder}`,
      }}>
        <p style={{ fontSize: 12, color: t.textDim, fontStyle: 'italic' }}>
          Belum ada donasi untuk kampanye ini
        </p>
      </div>
    );
  }

  // Compute summary
  const verified = donations.filter(d => d.verification_status === 'verified');
  const pending = donations.filter(d => d.verification_status === 'pending');
  const rejected = donations.filter(d => d.verification_status === 'rejected');
  const remitted = donations.filter(d => d.fee_remitted_at);

  const verifiedAmount = verified.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const pendingAmount = pending.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const totalFee = verified.reduce((sum, d) => sum + (Number(d.operational_fee) || 0), 0);
  const remittedFee = remitted.reduce((sum, d) => sum + (Number(d.operational_fee) || 0), 0);

  return (
    <div style={{
      background: t.mainBg,
      border: `1px solid ${t.sidebarBorder}`,
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      {/* Header summary */}
      <div style={{
        padding: '10px 14px',
        borderBottom: `1px solid ${t.sidebarBorder}`,
        background: t.navHover + '40',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
            💰 Aliran Donasi — Drilldown
          </p>
          <p style={{ fontSize: 11, color: t.textDim }}>
            {donations.length} transaksi | {verified.length} verified · {pending.length} pending · {rejected.length} rejected
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 11, alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: t.textMuted, marginRight: 6 }}>Verified:</span>
            <strong style={{ color: '#10B981' }}>{shortRupiah(verifiedAmount)}</strong>
          </div>
          {pending.length > 0 && (
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: t.textMuted, marginRight: 6 }}>Pending:</span>
              <strong style={{ color: '#F59E0B' }}>{shortRupiah(pendingAmount)}</strong>
            </div>
          )}
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: t.textMuted, marginRight: 6 }}>Fee:</span>
            <strong style={{ color: t.textPrimary }}>{shortRupiah(remittedFee)}/{shortRupiah(totalFee)}</strong>
          </div>
          {/* ⭐ Sesi 13 Mission 2C: Download CSV button */}
          <button
            onClick={() => downloadCSV(donations, campaignTitle)}
            style={{
              padding: '5px 10px', fontSize: 10, fontWeight: 700,
              background: 'rgba(16,185,129,0.12)', color: '#10B981',
              border: '1px solid rgba(16,185,129,0.35)', borderRadius: 4,
              cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'background 150ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.22)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.12)'; }}
            title="Download semua donasi sebagai CSV (termasuk rejected)"
          >
            📥 Download CSV
          </button>
        </div>
      </div>

      {/* Donations list — paginated */}
      {(() => {
        // ⭐ Sesi 13 Mission 2A: pagination 10/page + footer total
        const totalPages = Math.max(1, Math.ceil(donations.length / PAGE_SIZE));
        const safePage = Math.min(currentPage, totalPages);
        const startIdx = (safePage - 1) * PAGE_SIZE;
        const endIdx = startIdx + PAGE_SIZE;
        const paginated = donations.slice(startIdx, endIdx);

        // Aggregate totals (across ALL donations, not just current page)
        // ⭐ Sesi 13 Mission 2A: Accounting principle — exclude REJECTED dari total
        // Rejected = uang tidak pernah masuk partner, tidak ada journal entry
        // kode_unik DERIVE dari donation_code (3-digit) - bukan kolom DB terpisah
        const validDonations = donations.filter(d => d.verification_status !== 'rejected');
        const rejectedDonations = donations.filter(d => d.verification_status === 'rejected');

        const totalTransferAll = validDonations.reduce((s, d) => s + (Number(d.total_transfer) || 0), 0);
        const totalBeneficiaryAll = validDonations.reduce((s, d) => s + (Number(d.amount) || 0), 0);
        const totalFeeAll = validDonations.reduce((s, d) => s + (Number(d.operational_fee) || 0), 0);
        const totalKodeUnikAll = validDonations.reduce((s, d) => {
          const kode = d.donation_code ? parseInt(d.donation_code, 10) : 0;
          return s + (isNaN(kode) ? 0 : kode);
        }, 0);
        const totalTipAll = validDonations.reduce((s, d) => s + (Number(d.penggalang_fee) || 0), 0);

        // Rejected aggregates (untuk disclaimer footer + visual)
        const rejectedTransferAll = rejectedDonations.reduce((s, d) => s + (Number(d.total_transfer) || 0), 0);
        const rejectedBeneficiaryAll = rejectedDonations.reduce((s, d) => s + (Number(d.amount) || 0), 0);
        const rejectedFeeAll = rejectedDonations.reduce((s, d) => s + (Number(d.operational_fee) || 0), 0);
        const rejectedKodeUnikAll = rejectedDonations.reduce((s, d) => {
          const kode = d.donation_code ? parseInt(d.donation_code, 10) : 0;
          return s + (isNaN(kode) ? 0 : kode);
        }, 0);
        const rejectedTipAll = rejectedDonations.reduce((s, d) => s + (Number(d.penggalang_fee) || 0), 0);

        return (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.sidebarBorder}`, background: t.mainBg }}>
                    <th style={{ ...thStyle(t, 'left'), padding: '8px 10px', fontSize: 9 }}>Donor</th>
                    <th style={{ ...thStyle(t, 'left'), padding: '8px 10px', fontSize: 9, minWidth: 140 }}>Nomor + Tgl</th>
                    <th style={{ ...thStyle(t, 'right'), padding: '8px 10px', fontSize: 9, minWidth: 100 }}>Total Transfer</th>
                    <th style={{ ...thStyle(t, 'right'), padding: '8px 10px', fontSize: 9, minWidth: 100 }}>Hak Beneficiary</th>
                    <th style={{ ...thStyle(t, 'right'), padding: '8px 10px', fontSize: 9, minWidth: 80 }}>Fee TeraLoka</th>
                    <th style={{ ...thStyle(t, 'right'), padding: '8px 10px', fontSize: 9, minWidth: 70 }}>Kode Unik</th>
                    <th style={{ ...thStyle(t, 'right'), padding: '8px 10px', fontSize: 9, minWidth: 80 }}>Tip Penggalang</th>
                    <th style={{ ...thStyle(t, 'center', 90), padding: '8px 10px', fontSize: 9 }}>Status</th>
                    <th style={{ ...thStyle(t, 'center', 80), padding: '8px 10px', fontSize: 9 }}>Fee Setor</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((d, di) => {
                    const isLastDon = di === paginated.length - 1;
                    const statusMeta = getStatusMeta(d.verification_status);
                    const isMatch = donationMatches(d);
                    const isRejected = d.verification_status === 'rejected';  // ⭐ Accounting: deductible
                    const kodeUnikDerived = d.donation_code ? (parseInt(d.donation_code, 10) || 0) : 0;
                    const totalTransfer = Number(d.total_transfer) || ((Number(d.amount) || 0) + (Number(d.operational_fee) || 0) + (Number(d.penggalang_fee) || 0) + kodeUnikDerived);
                    
                    // ⭐ Accounting: rejected row pakai parentheses (deductible) + RED color
                    const rejectedTextColor = '#EF4444';  // red-500 = jelas visual untuk auditor
                    return (
                      <tr key={d.id}
                        style={{
                          borderBottom: isLastDon ? 'none' : `1px solid ${t.sidebarBorder}`,
                          background: isMatch ? 'rgba(236,72,153,0.06)' : 'transparent',
                          boxShadow: isMatch ? 'inset 3px 0 0 #EC4899' : 'none',
                          transition: 'all 150ms',
                        }}
                      >
                        {/* Col 1: Donor */}
                        <td style={{ padding: '8px 10px', verticalAlign: 'top' }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: t.textPrimary, marginBottom: 2 }}>
                            {d.is_anonymous ? '🎭 Anonim' : highlightMatch(d.donor_name)}
                          </div>
                          {d.donor_phone && !d.is_anonymous && (
                            <div style={{ fontSize: 9, color: t.textDim, fontFamily: 'monospace' }}>
                              {highlightMatch(d.donor_phone)}
                            </div>
                          )}
                        </td>

                        {/* Col 2: ⭐ Nomor + Tgl (compact 2-line) */}
                        <td style={{ padding: '8px 10px', verticalAlign: 'top' }}>
                          {d.display_id ? (
                            <div style={{
                              fontSize: 10, fontFamily: 'ui-monospace, monospace',
                              fontWeight: 800, color: '#EC4899', marginBottom: 2,
                              letterSpacing: '0.03em',
                            }}>
                              {d.display_id}
                            </div>
                          ) : (
                            <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 2, fontStyle: 'italic' }}>
                              (no ID)
                            </div>
                          )}
                          <div style={{ fontSize: 9, color: t.textDim }}>
                            {formatDateShort(d.created_at)}
                            {d.verified_at && (
                              <span style={{ color: '#10B981', marginLeft: 4, opacity: 0.8 }}>
                                ✓ {formatDateShort(d.verified_at)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Col 3: ⭐ Total Transfer (gross, hijau bold | rejected = parentheses muted) */}
                        <td style={{ padding: '8px 10px', textAlign: 'right', verticalAlign: 'top' }}>
                          <span style={{ 
                            fontSize: 12, fontWeight: 700, 
                            color: isRejected ? rejectedTextColor : '#10B981',
                            fontStyle: isRejected ? 'italic' : 'normal',
                          }}>
                            {accountingFormat(totalTransfer, isRejected)}
                          </span>
                        </td>

                        {/* Col 4: ⭐ Hak Beneficiary */}
                        <td style={{ padding: '8px 10px', textAlign: 'right', verticalAlign: 'top' }}>
                          <span style={{ 
                            fontSize: 11, fontWeight: 700, 
                            color: isRejected ? rejectedTextColor : t.textPrimary,
                            fontStyle: isRejected ? 'italic' : 'normal',
                          }}>
                            {accountingFormat(d.amount, isRejected)}
                          </span>
                        </td>

                        {/* Col 5: Fee TeraLoka */}
                        <td style={{ padding: '8px 10px', textAlign: 'right', verticalAlign: 'top' }}>
                          <span style={{ 
                            fontSize: 11, 
                            color: isRejected ? rejectedTextColor : '#BE185D',
                            fontStyle: isRejected ? 'italic' : 'normal',
                          }}>
                            {accountingFormat(d.operational_fee, isRejected)}
                          </span>
                        </td>

                        {/* Col 6: ⭐ Kode Unik (derive dari donation_code 3-digit) */}
                        <td style={{ padding: '8px 10px', textAlign: 'right', verticalAlign: 'top' }}>
                          {(() => {
                            // Kode unik = parseInt(donation_code) — 3-digit nominal pembulatan
                            // Architecture: donations TIDAK punya kolom kode_unik terpisah
                            // Source: donations-public.ts line 114 (totalTransfer formula)
                            const kodeUnikVal = d.donation_code ? parseInt(d.donation_code, 10) : 0;
                            return (
                              <span style={{ 
                                fontSize: 11, 
                                color: isRejected 
                                  ? rejectedTextColor 
                                  : (kodeUnikVal > 0 ? '#F59E0B' : t.textMuted),
                                fontStyle: isRejected ? 'italic' : 'normal',
                              }}>
                                {kodeUnikVal > 0 ? accountingFormat(kodeUnikVal, isRejected) : '—'}
                              </span>
                            );
                          })()}
                        </td>

                        {/* Col 7: ⭐ Tip Penggalang */}
                        <td style={{ padding: '8px 10px', textAlign: 'right', verticalAlign: 'top' }}>
                          <span style={{ 
                            fontSize: 11, 
                            color: isRejected 
                              ? rejectedTextColor 
                              : ((d.penggalang_fee ?? 0) > 0 ? '#8B5CF6' : t.textMuted),
                            fontStyle: isRejected ? 'italic' : 'normal',
                          }}>
                            {(d.penggalang_fee ?? 0) > 0 ? accountingFormat(d.penggalang_fee ?? 0, isRejected) : '—'}
                          </span>
                        </td>

                        {/* Col 8: Status (with donation_code tooltip) */}
                        <td style={{ padding: '8px 10px', textAlign: 'center', verticalAlign: 'top' }}>
                          <span 
                            title={`Kode: ${d.donation_code}`}
                            style={{
                              fontSize: 9, fontWeight: 700,
                              padding: '3px 8px', borderRadius: 999,
                              background: statusMeta.bg, color: statusMeta.color,
                              textTransform: 'uppercase', letterSpacing: '0.04em',
                              cursor: 'help',
                            }}
                          >
                            {statusMeta.label}
                          </span>
                          {isMatch && (
                            <div style={{
                              fontSize: 9, fontFamily: 'monospace', color: '#EC4899',
                              marginTop: 2, fontWeight: 700,
                            }}>
                              {highlightMatch(d.donation_code)}
                            </div>
                          )}
                        </td>

                        {/* Col 9: Fee Setor */}
                        <td style={{ padding: '8px 10px', textAlign: 'center', verticalAlign: 'top' }}>
                          {d.fee_remitted_at ? (
                            <span style={{ fontSize: 10, color: '#10B981', fontWeight: 600 }}>
                              ✓ Sudah
                            </span>
                          ) : d.verification_status === 'verified' ? (
                            <span style={{ fontSize: 10, color: '#F59E0B', fontWeight: 600 }}>
                              ⏳ Belum
                            </span>
                          ) : (
                            <span style={{ fontSize: 10, color: t.textMuted }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* ⭐ Sesi 13 Mission 2A: Footer Total row (Accounting Standard) */}
                <tfoot>
                  {/* Sub-row REJECTED (deductible, parentheses notation) */}
                  {rejectedDonations.length > 0 && (
                    <tr style={{ 
                      background: 'rgba(156,163,175,0.05)',
                      borderTop: `1px solid ${t.sidebarBorder}`,
                      fontStyle: 'italic',
                    }}>
                      <td style={{ padding: '8px 10px', fontSize: 10, color: '#EF4444', fontWeight: 600 }}>
                        ❌ REJECTED
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: 9, color: '#EF4444' }}>
                        ({rejectedDonations.length} tak dihitung)
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#EF4444' }}>
                        ({shortRupiah(rejectedTransferAll)})
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#EF4444' }}>
                        ({shortRupiah(rejectedBeneficiaryAll)})
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#EF4444' }}>
                        ({shortRupiah(rejectedFeeAll)})
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#EF4444' }}>
                        {rejectedKodeUnikAll > 0 ? `(${shortRupiah(rejectedKodeUnikAll)})` : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#EF4444' }}>
                        {rejectedTipAll > 0 ? `(${shortRupiah(rejectedTipAll)})` : '—'}
                      </td>
                      <td colSpan={2} style={{ padding: '8px 10px' }}></td>
                    </tr>
                  )}

                  {/* Main TOTAL row (exclude rejected per accounting principle) */}
                  <tr style={{ 
                    background: t.navHover, 
                    borderTop: `2px solid ${t.sidebarBorder}`,
                    fontWeight: 800,
                  }}>
                    <td style={{ padding: '10px', fontSize: 10, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      TOTAL
                    </td>
                    <td style={{ padding: '10px', fontSize: 9, color: t.textDim, fontStyle: 'italic' }}>
                      ({validDonations.length} donasi valid)
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: 11, fontWeight: 800, color: '#10B981' }}>
                      {shortRupiah(totalTransferAll)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: 11, fontWeight: 800, color: t.textPrimary }}>
                      {shortRupiah(totalBeneficiaryAll)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: 11, fontWeight: 800, color: '#BE185D' }}>
                      {shortRupiah(totalFeeAll)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: 11, fontWeight: 800, color: totalKodeUnikAll > 0 ? '#F59E0B' : t.textMuted }}>
                      {totalKodeUnikAll > 0 ? shortRupiah(totalKodeUnikAll) : '—'}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: 11, fontWeight: 800, color: totalTipAll > 0 ? '#8B5CF6' : t.textMuted }}>
                      {totalTipAll > 0 ? shortRupiah(totalTipAll) : '—'}
                    </td>
                    <td colSpan={2} style={{ padding: '10px' }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ⭐ Sesi 13 Mission 2A: Pagination Controls */}
            {donations.length > PAGE_SIZE && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderTop: `1px solid ${t.sidebarBorder}`,
                background: t.mainBg,
              }}>
                <div style={{ fontSize: 10, color: t.textDim }}>
                  Menampilkan {startIdx + 1}–{Math.min(endIdx, donations.length)} dari {donations.length} donasi
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    style={{
                      padding: '4px 10px', fontSize: 11, fontWeight: 600,
                      background: safePage === 1 ? t.navHover : t.cardBg,
                      color: safePage === 1 ? t.textMuted : t.textPrimary,
                      border: `1px solid ${t.sidebarBorder}`, borderRadius: 4,
                      cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ◀ Prev
                  </button>
                  <span style={{ fontSize: 11, color: t.textPrimary, fontWeight: 700 }}>
                    Halaman {safePage} dari {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    style={{
                      padding: '4px 10px', fontSize: 11, fontWeight: 600,
                      background: safePage === totalPages ? t.navHover : t.cardBg,
                      color: safePage === totalPages ? t.textMuted : t.textPrimary,
                      border: `1px solid ${t.sidebarBorder}`, borderRadius: 4,
                      cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Next ▶
                  </button>
                </div>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

const STATUS_META: Record<string, { bg: string; color: string; label: string }> = {
  pending:     { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B', label: 'Pending' },
  verified:    { bg: 'rgba(16,185,129,0.15)', color: '#10B981', label: 'Verified' },
  rejected:    { bg: 'rgba(239,68,68,0.15)',  color: '#EF4444', label: 'Rejected' },
  // Auto-escalated: penggalang offline extended → admin manual review needed
  // Pattern: offline_mode flow (Sprint A — Anti-Fraud Layer 5)
  under_audit: { bg: 'rgba(234,88,12,0.15)',  color: '#EA580C', label: 'Audit' },
};

// Safe fallback untuk verification_status yang tidak dikenali (defensive)
// Bisa terjadi kalau DB punya status baru (mis: 'flagged', 'escalated')
// yang belum di-handle di UI.
const STATUS_FALLBACK = { bg: 'rgba(107,114,128,0.15)', color: '#6B7280', label: 'Unknown' };

function getStatusMeta(status: string | null | undefined) {
  if (!status) return STATUS_FALLBACK;
  const meta = STATUS_META[status];
  if (!meta) {
    // Pattern 205: log unknown status biar visible (jangan silent swallow)
    console.warn('[CampaignCashflowTable] Unknown verification_status:', status);
    return { ...STATUS_FALLBACK, label: status };
  }
  return meta;
}

// ── Style helpers ────────────────────────────────

function thStyle(t: any, align: 'left' | 'right' | 'center', width?: number): React.CSSProperties {
  return {
    textAlign: align,
    padding: '10px 12px',
    fontSize: 10, fontWeight: 700, color: t.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    whiteSpace: 'nowrap',
    width: width ? `${width}px` : 'auto',
  };
}

function tdStyle(t: any, align: 'left' | 'right' | 'center'): React.CSSProperties {
  return {
    textAlign: align,
    padding: '12px',
    verticalAlign: 'top',
    color: t.textPrimary,
  };
}
