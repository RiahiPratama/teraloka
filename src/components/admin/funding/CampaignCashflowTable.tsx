'use client';

import { useContext, useState, useEffect, useCallback, useMemo, Fragment } from 'react';
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
                      {/* ⭐ AUDIT TRACKING: Nomor Kampanye Prominent */}
                      {(() => {
                        // Extract unique identifier dari slug
                        // Format slug umum: "seed-2-3-pak-hasan-f47a62" → suffix = "f47a62"
                        // Atau pakai 8 chars terakhir UUID kalau slug gak ada suffix hash
                        const slugParts = (c.slug || '').split('-');
                        const lastPart = slugParts[slugParts.length - 1];
                        // Cek apakah suffix is hex-like (5-8 chars alphanumeric lowercase)
                        const isHashSuffix = /^[a-f0-9]{4,8}$/i.test(lastPart);
                        const campaignNumber = isHashSuffix
                          ? `#${lastPart.toUpperCase()}`
                          : `#${c.id.substring(0, 6).toUpperCase()}`;

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
              const statusMeta = getStatusMeta(d.verification_status);
              const isMatch = donationMatches(d);
              return (
                <tr key={d.id}
                  style={{
                    borderBottom: isLastDon ? 'none' : `1px solid ${t.sidebarBorder}`,
                    background: isMatch ? 'rgba(236,72,153,0.06)' : 'transparent',
                    boxShadow: isMatch ? 'inset 3px 0 0 #EC4899' : 'none',
                    transition: 'all 150ms',
                  }}
                >
                  <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: t.textPrimary, marginBottom: 2 }}>
                      {d.is_anonymous ? '🎭 Anonim' : highlightMatch(d.donor_name)}
                    </div>
                    {d.donor_phone && !d.is_anonymous && (
                      <div style={{ fontSize: 9, color: t.textDim, fontFamily: 'monospace' }}>
                        {highlightMatch(d.donor_phone)}
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
                      background: isMatch ? 'rgba(236,72,153,0.2)' : t.navHover,
                      color: isMatch ? '#EC4899' : t.textDim,
                      border: isMatch ? '1px solid rgba(236,72,153,0.4)' : 'none',
                    }}>
                      {highlightMatch(d.donation_code)}
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
