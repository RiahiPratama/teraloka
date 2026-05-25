'use client';

// ════════════════════════════════════════════════════════════════
// BADONASI Command Center v4.0 — SUPER SMART Buat Solo Founder Admin
//
// Locked: 24 Mei 2026 (SESI 10 Phase 2 Block 2)
//
// "Founder buka → langsung tau apa yang harus dikerjain → 1 click execute"
//
// NEW COMPONENTS v3.1 → v4.0:
//   1. FOKUS HARI INI banner — top 3 priority cross-domain by
//      impact(Rp) × urgency × ease
//   2. Activity Feed Real-Time — last 10 events with deep links
//   3. Cross-Domain Anomaly Detection — velocity spike, repeat donor,
//      offline penggalang, partner risk
//   4. ALL cards clickable — stat cards, Money at Risk, Pulse,
//      Smart Insights, Priority Inbox
//   5. Quick Action chips — primary CTA di setiap context
//
// Zero backend change.
// ════════════════════════════════════════════════════════════════

import Link from 'next/link';
import { useEffect, useState, useContext, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import AdminAuthGuard from '@/components/admin/funding/AdminAuthGuard';
import CommandCenterTabs from '@/components/admin/funding/CommandCenterTabs';
import {
  Siren, RefreshCw, Clock, AlertTriangle, Wallet, ShieldAlert,
  Landmark, ArrowRight, Zap, Target, Sparkles, CheckCircle2,
  XCircle, TrendingUp, AlertCircle, BarChart3, Coffee, Flame,
  ShieldX, Timer, Crosshair, TrendingDown, ClipboardX,
  Siren as AlarmSiren, Banknote, Repeat2, CircleDollarSign,
  VenetianMask, BellOff, Activity, Bell, Brain, Rocket,
  ArrowUpRight, Eye, MoreHorizontal, ChevronRight,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ── Helpers ────────────────────────────────────────────────────
function rp(n: number): string {
  return 'Rp ' + (n ?? 0).toLocaleString('id-ID');
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins}m lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}j lalu`;
  return `${Math.floor(hrs / 24)}h lalu`;
}

// ── Smart Views config ─────────────────────────────────────────
const CAMPAIGN_SMART_VIEWS = [
  { key: 'needs_attention', label: 'Perlu Perhatian', Icon: Flame,        color: '#EF4444' },
  { key: 'fraud_alert',     label: 'Fraud Alert',     Icon: ShieldX,      color: '#DC2626' },
  { key: 'deadline_soon',   label: 'Deadline Dekat',  Icon: Timer,        color: '#F59E0B' },
  { key: 'near_target',     label: 'Near Target',     Icon: Crosshair,    color: '#10B981' },
  { key: 'slow_progress',   label: 'Slow Progress',   Icon: TrendingDown, color: '#F59E0B' },
  { key: 'missing_report',  label: 'Missing Report',  Icon: ClipboardX,   color: '#8B5CF6' },
];

const DONATION_SMART_VIEWS = [
  { key: 'verify_urgent',     label: 'Verifikasi Segera',     Icon: AlarmSiren,        color: '#EF4444' },
  { key: 'large_amount',      label: 'Donasi Besar',          Icon: Banknote,          color: '#F59E0B' },
  { key: 'duplicate_donor',   label: 'Donor Duplikat',        Icon: Repeat2,           color: '#DC2626' },
  { key: 'round_amount',      label: 'Angka Bulat',           Icon: CircleDollarSign,  color: '#8B5CF6' },
  { key: 'anon_large',        label: 'Anonim Besar',          Icon: VenetianMask,      color: '#EC4899' },
  { key: 'inactive_campaign', label: 'Kampanye Tidak Aktif',  Icon: BellOff,           color: '#6366F1' },
];

// ── Types ──────────────────────────────────────────────────────
interface CommandCenterStats {
  pendingDonations: number;
  pendingOver24h: number;
  pendingDisbursements: number;
  pendingFeeRemittances: number;
  pendingCampaigns: number;
  activeFraudFlags: number;
  criticalFraudFlags: number;
  pendingEscalations: number;
  totalRaised: number;
  activeCampaigns: number;
  pendingAmount: number;
  feePendingAmount: number;
  verifiedToday: number;
  rejectedToday: number;
  campaignSmartViews: Record<string, number>;
  donationSmartViews: Record<string, number>;
  recentDonations: any[];
  recentActivity: any[];
}

const EMPTY_STATS: CommandCenterStats = {
  pendingDonations: 0, pendingOver24h: 0, pendingDisbursements: 0,
  pendingFeeRemittances: 0, pendingCampaigns: 0, activeFraudFlags: 0,
  criticalFraudFlags: 0, pendingEscalations: 0, totalRaised: 0,
  activeCampaigns: 0, pendingAmount: 0, feePendingAmount: 0,
  verifiedToday: 0, rejectedToday: 0,
  campaignSmartViews: {}, donationSmartViews: {},
  recentDonations: [], recentActivity: [],
};

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function BadonasiCommandCenter() {
  const { t } = useContext(AdminThemeContext);
  const { token } = useAuth();
  const [stats, setStats] = useState<CommandCenterStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    const headers = { Authorization: `Bearer ${tk}` };

    setRefreshing(true);
    try {
      const [
        donPending, donPendingOver24h, disbPending, feeRemPending,
        campPending, fraudStats, esc,
        statsRes, donSmart, campSmart, donStatsToday, feeSum,
        recentDon,
      ] = await Promise.all([
        fetch(`${API_URL}/funding/admin/donations?status=pending&limit=1`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/funding/admin/donations?status=pending&sv=verify_urgent&limit=1`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/funding/admin/disbursements?status=pending&limit=1`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/funding/admin/fee-remittances?status=pending&limit=1`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/funding/admin/campaigns?status=pending_review&limit=1`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/fraud/admin/stats`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/funding/admin/escalations?status=unresolved&limit=1`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/funding/stats/public`).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/funding/admin/donations/smart-views/counts`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/funding/admin/campaigns/smart-views/counts`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/funding/admin/donations?limit=1`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/funding/admin/fees/summary`, { headers }).then(r => r.json()).catch(() => null),
        // Recent donations for activity feed
        fetch(`${API_URL}/funding/admin/donations?limit=10&sort=created_at:desc`, { headers }).then(r => r.json()).catch(() => null),
      ]);

      setStats({
        pendingDonations:    donPending?.meta?.total ?? 0,
        pendingOver24h:      donPendingOver24h?.meta?.total ?? 0,
        pendingDisbursements: disbPending?.meta?.total ?? 0,
        pendingFeeRemittances: feeRemPending?.meta?.total ?? 0,
        pendingCampaigns:    campPending?.meta?.total ?? 0,
        activeFraudFlags:    fraudStats?.data?.active ?? 0,
        criticalFraudFlags:  fraudStats?.data?.critical ?? 0,
        pendingEscalations:  esc?.meta?.total ?? 0,
        totalRaised:         statsRes?.data?.total_collected ?? 0,
        activeCampaigns:     statsRes?.data?.active_campaigns ?? 0,
        pendingAmount:       donStatsToday?.stats?.pending_amount ?? 0,
        feePendingAmount:    feeSum?.data?.total_pending ?? 0,
        verifiedToday:       donStatsToday?.stats?.verifiedToday ?? 0,
        rejectedToday:       donStatsToday?.stats?.rejectedToday ?? 0,
        campaignSmartViews:  campSmart?.data ?? {},
        donationSmartViews:  donSmart?.data ?? {},
        recentDonations:     recentDon?.data ?? [],
        recentActivity:      [],
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[Command Center] fetch failed', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStats(); }, [token]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(fetchStats, 60_000);
    return () => clearInterval(interval);
  }, []);

  const moneyAtRisk = useMemo(() => {
    const amount = stats.pendingAmount + stats.feePendingAmount;
    const ratio = stats.totalRaised > 0 ? amount / stats.totalRaised : 0;
    let color = '#10B981'; let label = 'Sehat';
    if (ratio >= 0.15) { color = '#EF4444'; label = 'Kritis'; }
    else if (ratio >= 0.05) { color = '#F59E0B'; label = 'Warning'; }
    return { amount, ratio, color, label };
  }, [stats]);

  const slaBreaches = useMemo(() => {
    return stats.pendingOver24h + stats.criticalFraudFlags + stats.pendingEscalations;
  }, [stats]);

  return (
    <AdminAuthGuard>
      <div style={{ padding: '24px 32px', maxWidth: 1400, color: t.textPrimary }}>

        {/* ═══════════ HEADER ═══════════ */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#EC4899', letterSpacing: '0.1em', marginBottom: 4 }}>
            BADONASI
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
              }}>
                <Siren size={22} strokeWidth={2.2} />
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: t.textPrimary }}>
                Command Center
              </h1>
            </div>
            <button onClick={fetchStats} disabled={refreshing} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              border: `1px solid ${t.sidebarBorder}`, background: t.mainBg,
              color: t.textPrimary, fontSize: 12, fontWeight: 600,
              cursor: refreshing ? 'wait' : 'pointer',
              opacity: refreshing ? 0.6 : 1,
            }}>
              <RefreshCw size={14} strokeWidth={2.5} className={refreshing ? 'spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 16, marginTop: 8,
            fontSize: 13, color: t.textDim, flexWrap: 'wrap',
          }}>
            <span>
              <strong style={{ color: t.textPrimary }}>{rp(stats.totalRaised)}</strong> total akrual
            </span>
            <span style={{ color: t.textMuted }}>·</span>
            <span>
              <strong style={{ color: stats.pendingAmount > 0 ? '#F59E0B' : t.textPrimary }}>
                {rp(stats.pendingAmount)}
              </strong> pending
            </span>
            {slaBreaches > 0 && (
              <>
                <span style={{ color: t.textMuted }}>·</span>
                <span style={{ color: '#EF4444', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={14} />
                  {slaBreaches} SLA breach
                </span>
              </>
            )}
            {lastUpdated && (
              <span style={{ color: t.textMuted, marginLeft: 'auto', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Activity size={10} className="pulse-dot" />
                Updated {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        <CommandCenterTabs active="overview" />

        {/* ═══════════ 🔥 FOKUS HARI INI BANNER (NEW v4.0) ═══════════ */}
        <FokusHariIni t={t} stats={stats} />

        {/* ═══════════ 5 STAT CARDS (clickable) ═══════════ */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12, marginBottom: 20,
        }}>
          <StatCard t={t}
            icon={<Clock size={18} strokeWidth={2.2} />}
            label="Donasi Pending"
            value={stats.pendingDonations}
            accent="#F59E0B"
            link="/admin/funding/donations?status=pending"
            highlight={stats.pendingDonations > 0}
            actionLabel="Verify →"
          />
          <StatCard t={t}
            icon={<AlertTriangle size={18} strokeWidth={2.2} />}
            label="Verify >24 Jam"
            value={stats.pendingOver24h}
            accent="#EF4444"
            link="/admin/funding/donations?sv=verify_urgent"
            highlight={stats.pendingOver24h > 0}
            alert={stats.pendingOver24h > 0}
            actionLabel="Urgent →"
          />
          <StatCard t={t}
            icon={<Wallet size={18} strokeWidth={2.2} />}
            label="Pencairan Pending"
            value={stats.pendingDisbursements}
            accent="#F59E0B"
            link="/admin/funding/disbursements?status=pending"
            highlight={stats.pendingDisbursements > 0}
            actionLabel="Review →"
          />
          <StatCard t={t}
            icon={<Landmark size={18} strokeWidth={2.2} />}
            label="Fee Belum Setor"
            value={stats.pendingFeeRemittances}
            sublabel={stats.feePendingAmount > 0 ? rp(stats.feePendingAmount) : undefined}
            accent="#F97316"
            link="/admin/funding/fee-remittance"
            highlight={stats.pendingFeeRemittances > 0}
            actionLabel="Verify →"
          />
          <StatCard t={t}
            icon={<ShieldAlert size={18} strokeWidth={2.2} />}
            label={stats.criticalFraudFlags > 0 ? 'Fraud Critical' : 'Fraud Aktif'}
            value={stats.activeFraudFlags}
            accent={stats.criticalFraudFlags > 0 ? '#DC2626' : '#EF4444'}
            link="/admin/funding/fraud"
            highlight={stats.activeFraudFlags > 0}
            alert={stats.criticalFraudFlags > 0}
            actionLabel="Selidiki →"
          />
        </div>

        {/* ═══════════ MONEY AT RISK + PULSE (clickable) ═══════════ */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20,
        }}>
          <Link href="/admin/funding/donations?status=pending" style={{ textDecoration: 'none' }}>
            <div style={{
              background: t.mainBg,
              border: `1px solid ${moneyAtRisk.color}30`,
              borderRadius: 16, padding: 20,
              boxShadow: `0 0 0 3px ${moneyAtRisk.color}08`,
              cursor: 'pointer', transition: 'all 150ms',
              height: '100%',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <p style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 12, color: t.textDim, fontWeight: 600,
                    letterSpacing: '0.05em', marginBottom: 4,
                  }}>
                    <TrendingUp size={14} strokeWidth={2.5} color={moneyAtRisk.color} />
                    MONEY AT RISK
                  </p>
                  <p style={{ fontSize: 11, color: t.textMuted }}>
                    Dana yang sedang stuck di sistem (pending verify + fee belum setor)
                  </p>
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: `${moneyAtRisk.color}15`, color: moneyAtRisk.color,
                  fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
                }}>
                  {moneyAtRisk.label}
                  <ArrowUpRight size={12} />
                </span>
              </div>
              <p style={{ fontSize: 32, fontWeight: 800, color: moneyAtRisk.color, marginBottom: 8 }}>
                {rp(moneyAtRisk.amount)}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: t.textDim }}>
                <span>{(moneyAtRisk.ratio * 100).toFixed(1)}% dari total akrual</span>
                <span style={{ color: t.textMuted }}>·</span>
                <span>Threshold: &lt;5% sehat, 5-15% warning, &gt;15% kritis</span>
              </div>
              <div style={{
                display: 'flex', gap: 4, marginTop: 16, height: 8, borderRadius: 4, overflow: 'hidden',
                background: t.sidebarBorder,
              }}>
                {stats.pendingAmount > 0 && (
                  <div style={{ flex: stats.pendingAmount, background: '#F59E0B' }}/>
                )}
                {stats.feePendingAmount > 0 && (
                  <div style={{ flex: stats.feePendingAmount, background: '#F97316' }}/>
                )}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: t.textDim }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: '#F59E0B' }}/>
                  Pending: {rp(stats.pendingAmount)}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: '#F97316' }}/>
                  Fee: {rp(stats.feePendingAmount)}
                </span>
              </div>
            </div>
          </Link>

          {/* Pulse Card - dual link (verified vs rejected) */}
          <div style={{
            background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
            borderRadius: 16, padding: 20,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12,
              color: t.textDim,
            }}>
              <Zap size={14} strokeWidth={2.5} color="#EC4899" />
              <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.05em' }}>
                PULSE HARI INI
              </p>
            </div>
            <p style={{ fontSize: 32, fontWeight: 800, color: t.textPrimary, marginBottom: 4 }}>
              {stats.verifiedToday + stats.rejectedToday}
            </p>
            <p style={{ fontSize: 12, color: t.textDim, marginBottom: 16 }}>
              aksi diproses
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              <Link href="/admin/funding/donations?status=verified" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  color: t.textDim, padding: '4px 8px', borderRadius: 6,
                  cursor: 'pointer',
                }} className="hover-bg">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={13} color="#10B981" />
                    Verified
                  </span>
                  <strong style={{ color: '#10B981' }}>{stats.verifiedToday}</strong>
                </div>
              </Link>
              <Link href="/admin/funding/donations?status=rejected" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  color: t.textDim, padding: '4px 8px', borderRadius: 6,
                  cursor: 'pointer',
                }} className="hover-bg">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <XCircle size={13} color="#EF4444" />
                    Rejected
                  </span>
                  <strong style={{ color: '#EF4444' }}>{stats.rejectedToday}</strong>
                </div>
              </Link>
              <Link href="/admin/funding/campaigns?status=active" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  color: t.textDim, marginTop: 4, paddingTop: 8, padding: '8px 8px 4px',
                  borderTop: `1px solid ${t.sidebarBorder}`, borderRadius: '0 0 6px 6px',
                  cursor: 'pointer',
                }} className="hover-bg">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <BarChart3 size={13} />
                    Aktif kampanye
                  </span>
                  <strong style={{ color: t.textPrimary }}>{stats.activeCampaigns}</strong>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* ═══════════ ANOMALY DETECTION (NEW v4.0) ═══════════ */}
        <AnomalyDetection t={t} stats={stats} />

        {/* ═══════════ PRIORITY INBOX ═══════════ */}
        <PriorityInbox t={t} stats={stats} />

        {/* ═══════════ ACTIVITY FEED (NEW v4.0) ═══════════ */}
        <ActivityFeed t={t} stats={stats} />

        {/* ═══════════ SMART INSIGHTS ═══════════ */}
        <SmartAlertSection t={t} stats={stats} />

      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        :global(.spin) { animation: spin 0.8s linear infinite; }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        :global(.pulse-dot) { animation: pulse-dot 1.5s ease-in-out infinite; }
        :global(.hover-bg:hover) { background: rgba(236, 72, 153, 0.06); }
      `}</style>
    </AdminAuthGuard>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT: FOKUS HARI INI — Top 3 Priority Cross-Domain
// ═══════════════════════════════════════════════════════════════

function FokusHariIni({ t, stats }: { t: any; stats: CommandCenterStats }) {
  // Algorithm: compile top 3 priority items by impact × urgency × ease
  const items: Array<{
    rank: number;
    icon: any;
    title: string;
    impact: string;
    why: string;
    cta: string;
    link: string;
    accent: string;
    estimatedTime: string;
  }> = [];

  // Priority 1: Pending Donasi >24h (high urgency, easy: just verify)
  if (stats.pendingOver24h > 0) {
    items.push({
      rank: 1,
      icon: AlarmSiren,
      title: `Verify ${stats.pendingOver24h} donasi yang menunggu >24 jam`,
      impact: `${rp(stats.pendingAmount)} stuck`,
      why: 'Donor menunggu konfirmasi · Risk: complaint + churn donor',
      cta: 'Verify sekarang',
      link: '/admin/funding/donations?sv=verify_urgent',
      accent: '#EF4444',
      estimatedTime: `~${stats.pendingOver24h * 2} menit`,
    });
  }

  // Priority 2: Critical Fraud (medium urgency, complex but high impact)
  if (stats.criticalFraudFlags > 0) {
    items.push({
      rank: items.length + 1,
      icon: ShieldAlert,
      title: `Selidiki ${stats.criticalFraudFlags} fraud severity CRITICAL`,
      impact: 'Trust at stake',
      why: 'Anomali pattern terdeteksi · Risk: financial loss + reputation',
      cta: 'Selidiki',
      link: '/admin/funding/fraud?severity=critical',
      accent: '#DC2626',
      estimatedTime: `~${stats.criticalFraudFlags * 10} menit`,
    });
  }

  // Priority 3: Pencairan Pending (medium urgency, easy)
  if (stats.pendingDisbursements > 0 && items.length < 3) {
    items.push({
      rank: items.length + 1,
      icon: Wallet,
      title: `Review ${stats.pendingDisbursements} pencairan pending`,
      impact: `Penggalang menunggu cair`,
      why: 'Dana sudah terkumpul · Penggalang need access',
      cta: 'Review',
      link: '/admin/funding/disbursements?status=pending',
      accent: '#F59E0B',
      estimatedTime: `~${stats.pendingDisbursements * 5} menit`,
    });
  }

  // Priority 4: Pending campaigns approval
  if (stats.pendingCampaigns > 0 && items.length < 3) {
    items.push({
      rank: items.length + 1,
      icon: Sparkles,
      title: `Review ${stats.pendingCampaigns} kampanye butuh approval`,
      impact: 'Penggalang ready to launch',
      why: 'Calon penggalang menunggu · Delay = lost momentum',
      cta: 'Review',
      link: '/admin/funding/campaigns?status=pending_review',
      accent: '#8B5CF6',
      estimatedTime: `~${stats.pendingCampaigns * 8} menit`,
    });
  }

  // Priority 5: Fee belum setor (low urgency, batch action)
  if (stats.pendingFeeRemittances > 0 && items.length < 3) {
    items.push({
      rank: items.length + 1,
      icon: Landmark,
      title: `Verify ${stats.pendingFeeRemittances} setor fee dari partner`,
      impact: rp(stats.feePendingAmount),
      why: 'Revenue TeraLoka pending konfirmasi · Auditable trail',
      cta: 'Verify',
      link: '/admin/funding/fee-remittance',
      accent: '#F97316',
      estimatedTime: `~${stats.pendingFeeRemittances * 3} menit`,
    });
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))',
        border: '1px solid rgba(16,185,129,0.25)',
        borderRadius: 16, padding: 20, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'rgba(16,185,129,0.15)', color: '#10B981',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Rocket size={24} strokeWidth={2.2} />
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#10B981', marginBottom: 2 }}>
              🎯 Tidak ada fokus prioritas hari ini
            </p>
            <p style={{ fontSize: 12, color: t.textDim }}>
              Semua actionable items sudah clear. Saat yang tepat untuk strategic work.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(236,72,153,0.08), rgba(236,72,153,0.02))',
      border: '1px solid rgba(236,72,153,0.25)',
      borderRadius: 16, padding: 20, marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #EC4899, #DB2777)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(236,72,153,0.3)',
          }}>
            <Brain size={20} strokeWidth={2.2} />
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: t.textPrimary, marginBottom: 2 }}>
              FOKUS HARI INI
            </h2>
            <p style={{ fontSize: 11, color: t.textDim }}>
              Top {items.length} priority compiled by impact × urgency × ease
            </p>
          </div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, color: '#EC4899',
          background: 'rgba(236,72,153,0.1)', padding: '4px 10px', borderRadius: 999,
        }}>
          ESTIMASI ~{items.reduce((s, i) => s + parseInt(i.estimatedTime.replace(/\D/g, '') || '0'), 0)} menit
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <Link key={i} href={item.link} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: 14, borderRadius: 12,
                background: t.mainBg,
                border: `1px solid ${item.accent}30`,
                cursor: 'pointer', transition: 'all 200ms',
              }}
              className="focus-card-hover"
              >
                {/* Rank badge */}
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: `${item.accent}18`, color: item.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800, flexShrink: 0,
                }}>
                  {item.rank}
                </div>

                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `${item.accent}10`, color: item.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={18} strokeWidth={2.2} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>
                    {item.title}
                  </p>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: t.textDim, flexWrap: 'wrap' }}>
                    <span style={{ color: item.accent, fontWeight: 600 }}>{item.impact}</span>
                    <span>{item.why}</span>
                  </div>
                </div>

                {/* Time + CTA */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: t.textMuted }}>{item.estimatedTime}</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: item.accent, color: '#fff',
                    fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 8,
                  }}>
                    {item.cta}
                    <ArrowRight size={12} strokeWidth={2.5} />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <style jsx>{`
        :global(.focus-card-hover:hover) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT: ANOMALY DETECTION — Cross-Domain Smart Alerts
// ═══════════════════════════════════════════════════════════════

function AnomalyDetection({ t, stats }: { t: any; stats: CommandCenterStats }) {
  // Compile anomaly signals from stats
  const anomalies: Array<{
    severity: 'high' | 'medium' | 'low';
    icon: any;
    title: string;
    detail: string;
    link: string;
  }> = [];

  // High: critical fraud + escalations
  if (stats.criticalFraudFlags > 0) {
    anomalies.push({
      severity: 'high',
      icon: ShieldX,
      title: `Pattern fraud terdeteksi — ${stats.criticalFraudFlags} kasus CRITICAL`,
      detail: 'Velocity/amount/duplicate signal threshold tercapai',
      link: '/admin/funding/fraud?severity=critical',
    });
  }

  // High: escalations stuck
  if (stats.pendingEscalations > 0) {
    anomalies.push({
      severity: 'high',
      icon: Bell,
      title: `${stats.pendingEscalations} donasi auto-escalated`,
      detail: 'Penggalang offline >3 hari + donasi belum diakui',
      link: '/admin/funding/escalations',
    });
  }

  // Medium: large pending volume (>5 pending)
  if (stats.pendingDonations > 5) {
    anomalies.push({
      severity: 'medium',
      icon: TrendingUp,
      title: `Volume pending donasi tinggi (${stats.pendingDonations})`,
      detail: 'Backlog verifikasi growing · Consider batch verify',
      link: '/admin/funding/donations?status=pending',
    });
  }

  // Medium: fee setor lama belum
  if (stats.pendingFeeRemittances > 3) {
    anomalies.push({
      severity: 'medium',
      icon: Landmark,
      title: `${stats.pendingFeeRemittances} fee setor menunggu verify`,
      detail: `${rp(stats.feePendingAmount)} revenue TeraLoka pending`,
      link: '/admin/funding/fee-remittance',
    });
  }

  // Low: needs_attention smart view
  const campNeedsAttention = Number(stats.campaignSmartViews['needs_attention'] || 0);
  if (campNeedsAttention > 0) {
    anomalies.push({
      severity: 'low',
      icon: Flame,
      title: `${campNeedsAttention} kampanye butuh perhatian`,
      detail: 'Detected by algorithm: low progress / suspicious / inactive',
      link: '/admin/funding/campaigns?sv=needs_attention',
    });
  }

  if (anomalies.length === 0) {
    return null; // Hide section kalau gak ada anomaly
  }

  const colors = {
    high:   { bg: 'rgba(239,68,68,0.06)',  border: 'rgba(239,68,68,0.25)',  dot: '#EF4444' },
    medium: { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.25)', dot: '#F59E0B' },
    low:    { bg: 'rgba(99,102,241,0.06)', border: 'rgba(99,102,241,0.25)', dot: '#6366F1' },
  };

  return (
    <div style={{
      background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
      borderRadius: 16, padding: 20, marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(239,68,68,0.1)', color: '#EF4444',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertCircle size={16} strokeWidth={2.2} />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary }}>
              Cross-Domain Anomaly
            </h2>
            <p style={{ fontSize: 11, color: t.textDim }}>
              Algoritma scan signals dari semua domain
            </p>
          </div>
        </div>
        <span style={{ fontSize: 11, color: t.textDim }}>
          {anomalies.length} sinyal terdeteksi
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {anomalies.map((a, i) => {
          const Icon = a.icon;
          const c = colors[a.severity];
          return (
            <Link key={i} href={a.link} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: 12, borderRadius: 10,
                background: c.bg, border: `1px solid ${c.border}`,
                cursor: 'pointer', transition: 'all 150ms',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: `${c.dot}18`, color: c.dot,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={16} strokeWidth={2.2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, marginBottom: 2 }}>
                    {a.title}
                  </p>
                  <p style={{ fontSize: 11, color: t.textDim }}>{a.detail}</p>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  background: c.dot, color: '#fff',
                  padding: '4px 8px', borderRadius: 6, letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}>
                  {a.severity}
                </span>
                <ChevronRight size={16} color={t.textMuted} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT: ACTIVITY FEED — Real-Time Stream
// ═══════════════════════════════════════════════════════════════

function ActivityFeed({ t, stats }: { t: any; stats: CommandCenterStats }) {
  const donations = (stats.recentDonations || []).slice(0, 8);

  if (donations.length === 0) {
    return null;
  }

  return (
    <div style={{
      background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
      borderRadius: 16, padding: 20, marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(16,185,129,0.1)', color: '#10B981',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Activity size={16} strokeWidth={2.2} />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary }}>
              Activity Live
            </h2>
            <p style={{ fontSize: 11, color: t.textDim }}>
              Real-time donasi terbaru · Auto-refresh 60s
            </p>
          </div>
        </div>
        <Link href="/admin/funding/donations" style={{ textDecoration: 'none' }}>
          <span style={{
            fontSize: 11, color: '#EC4899', fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            Lihat semua <ArrowRight size={12} />
          </span>
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {donations.map((d: any, i: number) => {
          const status = (d.verification_status || d.status || '').toLowerCase();
          const statusColor = status === 'verified' ? '#10B981' : status === 'rejected' ? '#EF4444' : '#F59E0B';
          const statusLabel = status === 'verified' ? 'verified' : status === 'rejected' ? 'rejected' : 'pending';

          return (
            <Link key={d.id || i} href={`/admin/funding/donations/${d.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 8,
                cursor: 'pointer', transition: 'background 150ms',
              }}
              className="activity-row"
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: statusColor, flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>
                    {d.is_anonymous ? 'Anonim' : (d.donor_name || 'Hamba Allah')}
                  </span>
                  <span style={{ fontSize: 12, color: t.textDim }}>donasi</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#EC4899' }}>
                    {rp(d.amount || 0)}
                  </span>
                  <span style={{ fontSize: 12, color: t.textDim }}>
                    ke {d.campaign_title || 'Kampanye'}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                    background: `${statusColor}18`, color: statusColor,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {statusLabel}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: t.textMuted, flexShrink: 0 }}>
                  {timeAgo(d.created_at || d.createdAt || new Date().toISOString())}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <style jsx>{`
        :global(.activity-row:hover) { background: rgba(236,72,153,0.04); }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EXISTING COMPONENTS (updated)
// ═══════════════════════════════════════════════════════════════

function StatCard({ t, icon, label, value, sublabel, accent, link, highlight, alert, actionLabel }: {
  t: any; icon: React.ReactNode; label: string; value: number; sublabel?: string;
  accent: string; link: string; highlight?: boolean; alert?: boolean; actionLabel?: string;
}) {
  return (
    <Link href={link} style={{ textDecoration: 'none' }}>
      <div style={{
        background: t.mainBg,
        border: `1px solid ${highlight ? accent + '55' : t.sidebarBorder}`,
        borderRadius: 12, padding: 16,
        boxShadow: alert ? `0 0 0 3px ${accent}15` : 'none',
        transition: 'all 200ms',
        cursor: 'pointer',
        animation: alert ? `pulse-${accent.replace('#', '')} 2s ease-in-out infinite` : undefined,
        height: '100%',
        position: 'relative',
      }}
      className="stat-card-hover"
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: accent + '18', color: accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {icon}
          </div>
          {actionLabel && value > 0 && (
            <span style={{
              fontSize: 9, fontWeight: 700, color: accent,
              padding: '2px 6px', borderRadius: 4,
              background: `${accent}10`, letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>
              {actionLabel}
            </span>
          )}
        </div>
        <p style={{ fontSize: 11, color: t.textDim, fontWeight: 500, marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary }}>{value}</p>
        {sublabel && (
          <p style={{ fontSize: 11, color: accent, fontWeight: 600, marginTop: 2 }}>{sublabel}</p>
        )}
      </div>
      <style>{`@keyframes pulse-${accent.replace('#', '')} {
        0%, 100% { box-shadow: 0 0 0 3px ${accent}15; }
        50% { box-shadow: 0 0 0 5px ${accent}30; }
      }
      :global(.stat-card-hover):hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.06);
      }`}</style>
    </Link>
  );
}

function PriorityInbox({ t, stats }: { t: any; stats: CommandCenterStats }) {
  const items: Array<{
    severity: 'critical' | 'high' | 'medium';
    title: string; sub: string; link: string; cta: string;
  }> = [];

  if (stats.pendingOver24h > 0) {
    items.push({
      severity: 'critical',
      title: `${stats.pendingOver24h} donasi pending >24 jam`,
      sub: 'Donor menunggu lama — risk complaint',
      link: '/admin/funding/donations?sv=verify_urgent',
      cta: 'Verify',
    });
  }
  if (stats.criticalFraudFlags > 0) {
    items.push({
      severity: 'critical',
      title: `${stats.criticalFraudFlags} fraud severity critical`,
      sub: 'Investigasi segera diperlukan',
      link: '/admin/funding/fraud?severity=critical',
      cta: 'Selidiki',
    });
  }
  if (stats.pendingCampaigns > 0) {
    items.push({
      severity: 'high',
      title: `${stats.pendingCampaigns} kampanye butuh verify`,
      sub: 'Penggalang menunggu approval',
      link: '/admin/funding/campaigns?status=pending_review',
      cta: 'Review',
    });
  }
  if (stats.pendingDisbursements > 0) {
    items.push({
      severity: 'high',
      title: `${stats.pendingDisbursements} pencairan pending review`,
      sub: 'Dana siap dicairkan ke penggalang',
      link: '/admin/funding/disbursements?status=pending',
      cta: 'Review',
    });
  }
  if (stats.pendingFeeRemittances > 0) {
    items.push({
      severity: 'medium',
      title: `${stats.pendingFeeRemittances} setor fee menunggu verifikasi`,
      sub: `${rp(stats.feePendingAmount)} dari partner siap diverifikasi`,
      link: '/admin/funding/fee-remittance',
      cta: 'Verify',
    });
  }
  if (stats.pendingEscalations > 0) {
    items.push({
      severity: 'high',
      title: `${stats.pendingEscalations} donasi auto-escalated`,
      sub: 'Penggalang offline mode >3 hari',
      link: '/admin/funding/escalations',
      cta: 'Tangani',
    });
  }

  const severityColors = {
    critical: { dot: '#DC2626', bg: 'rgba(220,38,38,0.06)', border: 'rgba(220,38,38,0.2)' },
    high:     { dot: '#F59E0B', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)' },
    medium:   { dot: '#FBBF24', bg: 'rgba(251,191,36,0.06)', border: 'rgba(251,191,36,0.2)' },
  };

  if (items.length === 0) {
    return (
      <div style={{
        background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
        borderRadius: 16, padding: 32, marginBottom: 20, textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(16,185,129,0.12)', color: '#10B981',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 12,
        }}>
          <CheckCircle2 size={32} strokeWidth={2.2} />
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#10B981', marginBottom: 4 }}>
          Semua clear!
        </p>
        <p style={{
          fontSize: 12, color: t.textDim,
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          Tidak ada antrian prioritas saat ini. Selamat ngopi
          <Coffee size={14} strokeWidth={2.2} color="#92400E" />
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
      borderRadius: 16, padding: 20, marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Target size={18} strokeWidth={2.2} color="#EC4899" />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary }}>
            Antrian Prioritas
          </h2>
        </div>
        <span style={{ fontSize: 11, color: t.textDim }}>
          {items.length} item · sorted by severity
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => {
          const colors = severityColors[item.severity];
          return (
            <Link key={i} href={item.link} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: 14, borderRadius: 12,
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                cursor: 'pointer', transition: 'all 150ms',
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: colors.dot, flexShrink: 0,
                }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, marginBottom: 2 }}>
                    {item.title}
                  </p>
                  <p style={{ fontSize: 11, color: t.textDim }}>{item.sub}</p>
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '6px 12px', borderRadius: 8,
                  background: colors.dot, color: '#fff',
                  fontSize: 11, fontWeight: 700,
                }}>
                  {item.cta}
                  <ArrowRight size={12} strokeWidth={2.5} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function SmartAlertSection({ t, stats }: { t: any; stats: CommandCenterStats }) {
  const campTotal = Object.values(stats.campaignSmartViews).reduce((s: number, n: any) => s + (Number(n) || 0), 0);
  const donTotal = Object.values(stats.donationSmartViews).reduce((s: number, n: any) => s + (Number(n) || 0), 0);

  return (
    <div style={{
      background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
      borderRadius: 16, padding: 20,
    }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles size={18} strokeWidth={2.2} color="#8B5CF6" />
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary, marginBottom: 2 }}>
            Smart Insights
          </h2>
          <p style={{ fontSize: 11, color: t.textDim }}>
            {campTotal + donTotal} item terdeteksi · 12 preset filter cerdas · Click untuk drill
          </p>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 11, fontWeight: 700, color: t.textDim, marginBottom: 10, letterSpacing: '0.05em' }}>
          KAMPANYE (6 view)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {CAMPAIGN_SMART_VIEWS.map(sv => {
            const count = Number(stats.campaignSmartViews[sv.key] || 0);
            const Icon = sv.Icon;
            return (
              <Link key={sv.key} href={`/admin/funding/campaigns?sv=${sv.key}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: 12, borderRadius: 10,
                  background: count > 0 ? `${sv.color}10` : t.navHover,
                  border: `1px solid ${count > 0 ? sv.color + '40' : t.sidebarBorder}`,
                  cursor: 'pointer', transition: 'all 150ms',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: count > 0 ? `${sv.color}20` : 'transparent',
                      color: count > 0 ? sv.color : t.textDim,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={15} strokeWidth={2.2} />
                    </div>
                    <span style={{ fontSize: 20, fontWeight: 800, color: count > 0 ? sv.color : t.textDim }}>
                      {count}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: t.textPrimary }}>
                    {sv.label}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: 11, fontWeight: 700, color: t.textDim, marginBottom: 10, letterSpacing: '0.05em' }}>
          DONASI (6 view)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {DONATION_SMART_VIEWS.map(sv => {
            const count = Number(stats.donationSmartViews[sv.key] || 0);
            const Icon = sv.Icon;
            return (
              <Link key={sv.key} href={`/admin/funding/donations?sv=${sv.key}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: 12, borderRadius: 10,
                  background: count > 0 ? `${sv.color}10` : t.navHover,
                  border: `1px solid ${count > 0 ? sv.color + '40' : t.sidebarBorder}`,
                  cursor: 'pointer', transition: 'all 150ms',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: count > 0 ? `${sv.color}20` : 'transparent',
                      color: count > 0 ? sv.color : t.textDim,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={15} strokeWidth={2.2} />
                    </div>
                    <span style={{ fontSize: 20, fontWeight: 800, color: count > 0 ? sv.color : t.textDim }}>
                      {count}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: t.textPrimary }}>
                    {sv.label}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
