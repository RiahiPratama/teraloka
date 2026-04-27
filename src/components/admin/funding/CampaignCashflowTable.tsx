'use client';

import { useContext, useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ── Types ─────────────────────────────────────────
export interface CampaignCashflow {
  id: string;
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
interface DrilldownDonation {
  id: string;
  donor_name: string;
  donor_phone?: string;
  is_anonymous: boolean;
  amount: number;
  operational_fee: number;
  donation_code: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  verified_at?: string;
  fee_remitted_at?: string;
  created_at: string;
}

// ── Helpers ──────────────────────────────────────
function shortRupiah(n: number): string {
  if (n >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + n.toLocaleString('id-ID');
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

export default function CampaignCashflowTable({
  campaigns,
}: {
  campaigns: CampaignCashflow[];
}) {
  const { t } = useContext(AdminThemeContext);

  // ⭐ Sprint 2.3 Phase 3b: Drilldown state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [donationsByCampaign, setDonationsByCampaign] = useState<Record<string, DrilldownDonation[]>>({});
  const [loadingCampaign, setLoadingCampaign] = useState<string | null>(null);

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

  if (campaigns.length === 0) {
    return (
      <div style={{
        background: t.mainBg,
        border: `1px solid ${t.sidebarBorder}`,
        borderRadius: 16, padding: 60, textAlign: 'center',
      }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, marginBottom: 4 }}>
          Tidak ada kampanye dalam rentang ini
        </p>
        <p style={{ fontSize: 12, color: t.textDim }}>
          Coba ubah rentang tanggal atau filter.
        </p>
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
                <>
                <tr
                  key={c.id}
                  onClick={() => toggleExpand(c.id)}
                  style={{
                    borderBottom: (isLast && !isExpanded) ? 'none' : `1px solid ${t.sidebarBorder}`,
                    transition: 'background 120ms',
                    cursor: 'pointer',
                    background: isExpanded ? t.navHover + '33' : 'transparent',
                  }}
                  onMouseEnter={e => {
                    if (!isExpanded) e.currentTarget.style.background = t.navHover + '22';
                  }}
                  onMouseLeave={e => {
                    if (!isExpanded) e.currentTarget.style.background = 'transparent';
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
                    <div style={{ minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      {c.is_urgent && (
                        <span style={{
                          fontSize: 8, padding: '2px 6px', borderRadius: 4,
                          background: 'rgba(239,68,68,0.15)', color: '#EF4444',
                          fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                          flexShrink: 0, marginTop: 2,
                        }}>
                          Urgent
                        </span>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: 12, fontWeight: 700, color: t.textPrimary,
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                          marginBottom: 3,
                        }}>
                          {c.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {c.partner_name && (
                            <span style={{ fontSize: 10, color: '#EC4899', fontWeight: 600 }}>
                              {c.partner_name}
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

                  {/* Disbursed */}
                  <td style={tdStyle(t, 'right')}>
                    <div style={{
                      fontSize: 13, fontWeight: 700,
                      color: c.disbursed_amount > 0 ? '#10B981' : t.textMuted,
                    }}>
                      {shortRupiah(c.disbursed_amount)}
                    </div>
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
                      />
                    </td>
                  </tr>
                )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ⭐ Sprint 2.3 Phase 3b: Expanded donations drilldown component
function ExpandedDonations({
  donations,
  loading,
  campaignTitle,
  t,
}: {
  donations: DrilldownDonation[] | undefined;
  loading: boolean;
  campaignTitle: string;
  t: any;
}) {
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
        <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
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
        </div>
      </div>

      {/* Donations list */}
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${t.sidebarBorder}`, background: t.mainBg }}>
              <th style={{ ...thStyle(t, 'left'), padding: '8px 12px', fontSize: 9 }}>Donor</th>
              <th style={{ ...thStyle(t, 'right', 100), padding: '8px 12px', fontSize: 9 }}>Nominal</th>
              <th style={{ ...thStyle(t, 'right', 80), padding: '8px 12px', fontSize: 9 }}>Fee</th>
              <th style={{ ...thStyle(t, 'center', 80), padding: '8px 12px', fontSize: 9 }}>Kode</th>
              <th style={{ ...thStyle(t, 'center', 90), padding: '8px 12px', fontSize: 9 }}>Status</th>
              <th style={{ ...thStyle(t, 'center', 80), padding: '8px 12px', fontSize: 9 }}>Fee Setor</th>
            </tr>
          </thead>
          <tbody>
            {donations.map((d, di) => {
              const isLastDon = di === donations.length - 1;
              const statusMeta = STATUS_META[d.verification_status];
              return (
                <tr key={d.id}
                  style={{ borderBottom: isLastDon ? 'none' : `1px solid ${t.sidebarBorder}` }}
                >
                  <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: t.textPrimary, marginBottom: 2 }}>
                      {d.is_anonymous ? '🎭 Anonim' : d.donor_name}
                    </div>
                    {d.donor_phone && !d.is_anonymous && (
                      <div style={{ fontSize: 9, color: t.textDim, fontFamily: 'monospace' }}>
                        {d.donor_phone}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary }}>
                      {shortRupiah(d.amount)}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    <span style={{ fontSize: 11, color: t.textDim }}>
                      {shortRupiah(d.operational_fee)}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: 10, fontFamily: 'monospace', fontWeight: 700,
                      padding: '2px 6px', borderRadius: 4,
                      background: t.navHover, color: t.textDim,
                    }}>
                      {d.donation_code}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700,
                      padding: '3px 8px', borderRadius: 999,
                      background: statusMeta.bg, color: statusMeta.color,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {statusMeta.label}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
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
        </table>
      </div>
    </div>
  );
}

const STATUS_META: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B', label: 'Pending' },
  verified: { bg: 'rgba(16,185,129,0.15)', color: '#10B981', label: 'Verified' },
  rejected: { bg: 'rgba(239,68,68,0.15)',  color: '#EF4444', label: 'Rejected' },
};

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
