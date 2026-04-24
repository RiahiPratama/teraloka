'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useContext } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

import FraudFlagsTable, { type FraudFlag } from '@/components/admin/funding/FraudFlagsTable';
import FraudFlagDetailModal from '@/components/admin/funding/FraudFlagDetailModal';
import Pagination from '@/components/admin/funding/Pagination';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ── Icons ─────────────────────────────────────────
const Icons = {
  Search: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Refresh: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
};

// ── Types ─────────────────────────────────────────
interface FraudStats {
  active: number;
  resolved: number;
  critical: number;
  high: number;
  by_signal: Record<string, number>;
  by_severity: Record<string, number>;
}

type StatusTab = 'active' | 'resolved' | 'all';

const STATUS_TABS: { key: StatusTab; label: string; emoji: string }[] = [
  { key: 'active',   label: 'Active',   emoji: '🔴' },
  { key: 'resolved', label: 'Resolved', emoji: '✅' },
  { key: 'all',      label: 'Semua',    emoji: '📋' },
];

const SEVERITY_OPTIONS = [
  { key: '',         label: 'Semua Severity' },
  { key: 'critical', label: '🔴 Critical' },
  { key: 'high',     label: '🟠 High' },
  { key: 'medium',   label: '🟡 Medium' },
  { key: 'low',      label: '🔵 Low' },
];

const TARGET_OPTIONS = [
  { key: '',         label: 'Semua Target' },
  { key: 'donation', label: '💰 Donasi' },
  { key: 'campaign', label: '🎯 Kampanye' },
  { key: 'user',     label: '👤 User' },
];

// ── SubNav (8 tabs — Fraud added) ────────────────
function SubNav({ fraudCount, t }: { fraudCount: number; t: any }) {
  const pathname = usePathname();
  const tabs = [
    { href: '/admin/funding',           label: 'Dashboard' },
    { href: '/admin/funding/campaigns', label: 'Kampanye' },
    { href: '/admin/funding/donations', label: 'Donasi' },
    { href: '/admin/funding/fees',      label: 'Fee Settlement' },
    { href: '/admin/funding/cashflow',  label: 'Aliran Uang' },
    { href: '/admin/funding/reports',   label: 'Laporan' },
    { href: '/admin/funding/fraud',     label: 'Fraud',         badge: fraudCount, accent: 'red' },
    { href: '/admin/funding/settings',  label: 'Pengaturan' },
  ];
  return (
    <div style={{
      display: 'flex', gap: 8, marginBottom: 24,
      borderBottom: `1px solid ${t.sidebarBorder}`, overflowX: 'auto',
    }}>
      {tabs.map(tab => {
        const active = pathname === tab.href
          || (tab.href !== '/admin/funding' && pathname.startsWith(tab.href));
        const accentColor = tab.accent === 'red' ? '#EF4444' : '#EC4899';
        return (
          <Link key={tab.href} href={tab.href}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', fontSize: 13, fontWeight: 600,
              color: active ? accentColor : t.textDim,
              borderBottom: active ? `2px solid ${accentColor}` : '2px solid transparent',
              marginBottom: -1, textDecoration: 'none', whiteSpace: 'nowrap',
            }}>
            {tab.label}
            {!!tab.badge && tab.badge > 0 && (
              <span style={{
                background: accentColor,
                color: '#fff', fontSize: 10, fontWeight: 700,
                padding: '2px 7px', borderRadius: 999, minWidth: 20, textAlign: 'center',
              }}>{tab.badge}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function AdminFraudPage() {
  const { t } = useContext(AdminThemeContext);
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── State from URL ──
  const urlStatus = (searchParams.get('status') as StatusTab) || 'active';
  const urlPage = Number(searchParams.get('page')) || 1;
  const urlLimit = Number(searchParams.get('limit')) || 20;
  const urlSeverity = searchParams.get('severity') || '';
  const urlTarget = searchParams.get('target') || '';

  const [activeTab, setActiveTab] = useState<StatusTab>(urlStatus);
  const [page, setPage] = useState(urlPage);
  const [limit, setLimit] = useState(urlLimit);
  const [severity, setSeverity] = useState(urlSeverity);
  const [target, setTarget] = useState(urlTarget);

  // ── Data ──
  const [flags, setFlags] = useState<FraudFlag[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<FraudStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  // ── Modal ──
  const [modalState, setModalState] = useState<{ open: boolean; flagId: string | null; mode: 'view' | 'resolve' }>({
    open: false, flagId: null, mode: 'view',
  });

  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  }

  // ── URL sync ──
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== 'active') params.set('status', activeTab);
    if (page !== 1) params.set('page', String(page));
    if (limit !== 20) params.set('limit', String(limit));
    if (severity) params.set('severity', severity);
    if (target) params.set('target', target);

    const qs = params.toString();
    router.replace(`/admin/funding/fraud${qs ? '?' + qs : ''}`, { scroll: false });
  }, [activeTab, page, limit, severity, target, router]);

  // ── Fetch stats ──
  const fetchStats = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    try {
      const res = await fetch(`${API_URL}/fraud/admin/stats`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      if (res.ok && json.success) setStats(json.data);
    } catch {}
  }, []);

  // ── Fetch flags ──
  const fetchFlags = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;

    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (activeTab !== 'all') qs.set('status', activeTab);
      if (severity) qs.set('severity', severity);
      if (target) qs.set('target_type', target);
      qs.set('page', String(page));
      qs.set('limit', String(limit));

      const res = await fetch(`${API_URL}/fraud/admin/flags?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setFlags(json.data ?? []);
        setTotal(json.meta?.total ?? 0);
      }
    } catch {}
    setLoading(false);
  }, [activeTab, severity, target, page, limit]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  // ── Handlers ──

  function switchTab(tab: StatusTab) {
    setActiveTab(tab);
    setPage(1);
  }

  function openModal(f: FraudFlag, mode: 'view' | 'resolve') {
    setModalState({ open: true, flagId: f.id, mode });
  }

  function handleModalSuccess() {
    fetchStats();
    fetchFlags();
  }

  async function handleScanAll() {
    const tk = localStorage.getItem('tl_token');
    if (!tk) { showToast(false, 'Session expired'); return; }

    setScanning(true);
    try {
      // Run both donation & campaign scans in parallel
      const [dRes, cRes] = await Promise.all([
        fetch(`${API_URL}/fraud/admin/scan-all`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${tk}` },
        }).then(r => r.json()),
        fetch(`${API_URL}/fraud/admin/scan-all-campaigns`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${tk}` },
        }).then(r => r.json()),
      ]);

      const totalFlags = (dRes?.data?.total_flags ?? 0) + (cRes?.data?.total_flags ?? 0);
      const scanned = (dRes?.data?.scanned ?? 0) + (cRes?.data?.scanned ?? 0);
      showToast(true, `✓ Scan complete: ${scanned} entities, ${totalFlags} flags`);

      fetchStats();
      fetchFlags();
    } catch (err: any) {
      showToast(false, err.message ?? 'Scan failed');
    } finally {
      setScanning(false);
    }
  }

  // ── Render ──
  const activeCount = stats?.active ?? 0;

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, color: t.textPrimary }}>

      {/* Breadcrumb */}
      <div style={{ marginBottom: 8 }}>
        <Link href="/admin/funding" style={{ fontSize: 12, color: t.textDim, textDecoration: 'none' }}>Dashboard</Link>
        <span style={{ fontSize: 12, color: t.textMuted, margin: '0 6px' }}>/</span>
        <span style={{ fontSize: 12, color: t.textDim, fontWeight: 600 }}>Fraud Detection</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: t.textPrimary }}>
          🛡️ Fraud Detection
        </h1>
        <button
          onClick={handleScanAll}
          disabled={scanning}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 16px', borderRadius: 10, border: 'none',
            background: scanning ? '#9CA3AF' : 'linear-gradient(135deg, #EF4444, #DC2626)',
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: scanning ? 'not-allowed' : 'pointer',
            boxShadow: scanning ? 'none' : '0 2px 8px rgba(239,68,68,0.25)',
          }}>
          <Icons.Refresh /> {scanning ? 'Scanning...' : 'Manual Scan All'}
        </button>
      </div>
      <p style={{ fontSize: 14, color: t.textDim, marginBottom: 24 }}>
        Review & resolve 12 fraud signals (7 donasi + 5 kampanye). Auto-scan aktif setiap verify donation & approve campaign.
      </p>

      <SubNav fraudCount={activeCount} t={t} />

      {/* Stats Cards */}
      {stats && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12, marginBottom: 16,
        }}>
          <StatCard label="🔴 Active Flags" value={String(stats.active)} color="#EF4444" t={t} alert={stats.active > 0} />
          <StatCard label="⚠️ Critical" value={String(stats.critical)} color="#DC2626" t={t} alert={stats.critical > 0} />
          <StatCard label="🟠 High" value={String(stats.high)} color="#EA580C" t={t} alert={stats.high > 0} />
          <StatCard label="✅ Resolved" value={String(stats.resolved)} color="#10B981" t={t} />
        </div>
      )}

      {/* Signal Breakdown (collapsed if empty) */}
      {stats && Object.keys(stats.by_signal).length > 0 && (
        <div style={{
          background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
          borderRadius: 12, padding: 14, marginBottom: 20,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            📊 Breakdown by Signal
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(stats.by_signal).map(([signal, count]) => (
              <span key={signal} style={{
                fontSize: 11, fontWeight: 600,
                padding: '4px 10px', borderRadius: 999,
                background: t.navHover, color: t.textPrimary,
                fontFamily: 'monospace',
              }}>
                {signal} · <strong>{count}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Status Tabs */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', flexWrap: 'wrap',
      }}>
        {STATUS_TABS.map(tab => {
          const active = activeTab === tab.key;
          const count = stats
            ? (tab.key === 'all' ? stats.active + stats.resolved : stats[tab.key as 'active' | 'resolved'])
            : 0;
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 10,
                fontSize: 13, fontWeight: 600,
                color: active ? '#fff' : t.textPrimary,
                background: active ? '#1F2937' : t.mainBg,
                border: `1px solid ${active ? '#1F2937' : t.sidebarBorder}`,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
              <span style={{
                background: active ? 'rgba(255,255,255,0.2)' : t.navHover,
                color: active ? '#fff' : t.textDim,
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                minWidth: 20, textAlign: 'center',
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter Dropdowns */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          value={severity}
          onChange={e => { setSeverity(e.target.value); setPage(1); }}
          style={selectStyle(t)}
        >
          {SEVERITY_OPTIONS.map(opt => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>

        <select
          value={target}
          onChange={e => { setTarget(e.target.value); setPage(1); }}
          style={selectStyle(t)}
        >
          {TARGET_OPTIONS.map(opt => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>

        {(severity || target) && (
          <button
            onClick={() => { setSeverity(''); setTarget(''); setPage(1); }}
            style={{
              padding: '8px 14px', borderRadius: 10,
              border: `1px dashed ${t.sidebarBorder}`,
              background: 'transparent', color: t.textDim,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
            × Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{
          background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
          borderRadius: 16, padding: 60, textAlign: 'center',
          color: t.textDim, fontSize: 14,
        }}>
          Memuat flags...
        </div>
      ) : (
        <>
          <FraudFlagsTable
            flags={flags}
            onRowAction={(action, flag) => openModal(flag, action)}
          />

          {total > 0 && (
            <Pagination
              page={page}
              limit={limit}
              total={total}
              onPageChange={setPage}
              onLimitChange={l => { setLimit(l); setPage(1); }}
            />
          )}
        </>
      )}

      {/* Detail Modal */}
      <FraudFlagDetailModal
        open={modalState.open}
        flagId={modalState.flagId}
        initialMode={modalState.mode}
        onClose={() => setModalState({ open: false, flagId: null, mode: 'view' })}
        onSuccess={handleModalSuccess}
        onToast={showToast}
      />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 70,
          padding: '12px 20px', borderRadius: 12,
          background: toast.ok ? '#10B981' : '#EF4444', color: '#fff',
          fontWeight: 600, fontSize: 14, maxWidth: 420,
          boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Stat Card ────────────────────────────────────

function StatCard({
  label, value, color, t, alert,
}: {
  label: string; value: string; color: string; t: any; alert?: boolean;
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
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
      }}>
        {label}
      </p>
      <p style={{ fontSize: 26, fontWeight: 800, color }}>
        {value}
      </p>
    </div>
  );
}

// ── Style helpers ────────────────────────────────

function selectStyle(t: any): React.CSSProperties {
  return {
    padding: '9px 14px', borderRadius: 10,
    border: `1px solid ${t.sidebarBorder}`,
    background: t.mainBg, color: t.textPrimary,
    fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none',
    minWidth: 160,
  };
}
