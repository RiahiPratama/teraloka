'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useContext } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

import ReportsTable, { type UsageReport } from '@/components/admin/funding/ReportsTable';
import ReportReviewModal from '@/components/admin/funding/ReportReviewModal';
import ReportCreateModal from '@/components/admin/funding/ReportCreateModal';
import Pagination from '@/components/admin/funding/Pagination';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ── Icons ─────────────────────────────────────────
const Icons = {
  Search:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Plus:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Alert:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

// ── Types ─────────────────────────────────────────
interface ReportStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
  pending_amount: number;
  campaigns_without_report: number;
  active_campaigns_count: number;
}

type StatusTab = 'pending' | 'approved' | 'rejected' | 'all';

const STATUS_TABS: { key: StatusTab; label: string; emoji: string }[] = [
  { key: 'pending',  label: 'Pending',  emoji: '⏳' },
  { key: 'approved', label: 'Approved', emoji: '✅' },
  { key: 'rejected', label: 'Rejected', emoji: '❌' },
  { key: 'all',      label: 'Semua',    emoji: '📋' },
];

const SORT_OPTIONS = [
  { key: 'newest',      label: 'Terbaru' },
  { key: 'oldest',      label: 'Terlama' },
  { key: 'amount_high', label: 'Jumlah Tertinggi' },
  { key: 'amount_low',  label: 'Jumlah Terendah' },
];

// ── Helpers ──────────────────────────────────────
function formatRupiah(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function shortRupiah(n: number): string {
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + n.toLocaleString('id-ID');
}

// ── SubNav (7 tabs — Laporan added) ──────────────
function SubNav({ pendingReports, t }: { pendingReports: number; t: any }) {
  const pathname = usePathname();
  const tabs = [
    { href: '/admin/funding',           label: 'Dashboard' },
    { href: '/admin/funding/campaigns', label: 'Kampanye' },
    { href: '/admin/funding/donations', label: 'Donasi' },
    { href: '/admin/funding/fees',      label: 'Fee Settlement', accent: true },
    { href: '/admin/funding/cashflow',  label: 'Aliran Uang',    accent: true },
    { href: '/admin/funding/reports',   label: 'Laporan',        badge: pendingReports, accent: true },
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
        return (
          <Link key={tab.href} href={tab.href}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', fontSize: 13, fontWeight: 600,
              color: active ? '#EC4899' : t.textDim,
              borderBottom: active ? '2px solid #EC4899' : '2px solid transparent',
              marginBottom: -1, textDecoration: 'none', whiteSpace: 'nowrap',
            }}>
            {tab.label}
            {!!tab.badge && tab.badge > 0 && (
              <span style={{
                background: tab.accent ? '#EC4899' : '#EF4444',
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

export default function AdminReportsPage() {
  const { t } = useContext(AdminThemeContext);
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── State from URL ──
  const urlStatus = (searchParams.get('status') as StatusTab) || 'pending';
  const urlPage = Number(searchParams.get('page')) || 1;
  const urlLimit = Number(searchParams.get('limit')) || 20;
  const urlSort = searchParams.get('sort') || 'newest';
  const urlSearch = searchParams.get('q') || '';

  const [activeTab, setActiveTab] = useState<StatusTab>(urlStatus);
  const [page, setPage] = useState(urlPage);
  const [limit, setLimit] = useState(urlLimit);
  const [sort, setSort] = useState(urlSort);
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [searchApplied, setSearchApplied] = useState(urlSearch);

  // ── Data ──
  const [reports, setReports] = useState<UsageReport[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Modals ──
  const [reviewModal, setReviewModal] = useState<{ open: boolean; reportId: string | null; mode: 'view' | 'approve' | 'reject' }>({
    open: false, reportId: null, mode: 'view',
  });
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Sync URL ──
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== 'pending') params.set('status', activeTab);
    if (page !== 1) params.set('page', String(page));
    if (limit !== 20) params.set('limit', String(limit));
    if (sort !== 'newest') params.set('sort', sort);
    if (searchApplied) params.set('q', searchApplied);

    const qs = params.toString();
    router.replace(`/admin/funding/reports${qs ? '?' + qs : ''}`, { scroll: false });
  }, [activeTab, page, limit, sort, searchApplied, router]);

  // ── Fetch ──
  const fetchStats = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    try {
      const res = await fetch(`${API_URL}/funding/admin/usage-reports/stats`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      if (res.ok && json.success) setStats(json.data);
    } catch {}
  }, []);

  const fetchReports = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;

    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (activeTab !== 'all') qs.set('status', activeTab);
      qs.set('sort', sort);
      qs.set('page', String(page));
      qs.set('limit', String(limit));
      if (searchApplied) qs.set('q', searchApplied);

      const res = await fetch(`${API_URL}/funding/admin/usage-reports?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setReports(json.data ?? []);
        setTotal(json.meta?.total ?? 0);
      }
    } catch {}
    setLoading(false);
  }, [activeTab, sort, page, limit, searchApplied]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ── Handlers ──
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchApplied(searchInput.trim());
    setPage(1);
  }

  function switchTab(tab: StatusTab) {
    setActiveTab(tab);
    setPage(1);
  }

  function openReview(r: UsageReport, mode: 'view' | 'approve' | 'reject') {
    setReviewModal({ open: true, reportId: r.id, mode });
  }

  function handleModalSuccess() {
    fetchStats();
    fetchReports();
  }

  // ── Render ──
  const pendingCount = stats?.pending ?? 0;
  const hasPendingAmount = (stats?.pending_amount ?? 0) > 0;

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, color: t.textPrimary }}>

      {/* Breadcrumb */}
      <div style={{ marginBottom: 8 }}>
        <Link href="/admin/funding" style={{ fontSize: 12, color: t.textDim, textDecoration: 'none' }}>Dashboard</Link>
        <span style={{ fontSize: 12, color: t.textMuted, margin: '0 6px' }}>/</span>
        <span style={{ fontSize: 12, color: t.textDim, fontWeight: 600 }}>Laporan Penggunaan</span>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800, color: t.textPrimary, marginBottom: 4 }}>
        📋 Laporan Penggunaan
      </h1>
      <p style={{ fontSize: 14, color: t.textDim, marginBottom: 24 }}>
        Review laporan penggunaan dana dari partner. Approve untuk tampil ke publik & naikin disbursement rate.
      </p>

      <SubNav pendingReports={pendingCount} t={t} />

      {/* Stats Cards */}
      {stats && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12, marginBottom: 16,
        }}>
          <StatCard
            label="⏳ Pending Review"
            value={String(stats.pending)}
            subtext={stats.pending_amount > 0 ? shortRupiah(stats.pending_amount) + ' menunggu' : '-'}
            color="#F59E0B" t={t}
            alert={stats.pending > 0}
          />
          <StatCard
            label="✅ Approved"
            value={String(stats.approved)}
            subtext="tampil ke publik"
            color="#10B981" t={t}
          />
          <StatCard
            label="❌ Rejected"
            value={String(stats.rejected)}
            subtext="ditolak admin"
            color="#EF4444" t={t}
          />
          <StatCard
            label="⚠️ Kampanye Belum Laporan"
            value={String(stats.campaigns_without_report)}
            subtext={`dari ${stats.active_campaigns_count} kampanye aktif`}
            color="#EA580C" t={t}
            alert={stats.campaigns_without_report > 0}
          />
        </div>
      )}

      {/* Alert Banner (if pending > 0) */}
      {pendingCount > 0 && hasPendingAmount && (
        <div style={{
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 12, padding: 12, marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#F59E0B', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icons.Alert />
          </div>
          <div style={{ flex: 1, fontSize: 12, color: t.textDim }}>
            <strong style={{ color: '#B45309' }}>{pendingCount} laporan</strong> menunggu review
            {stats && stats.pending_amount > 0 && (
              <> · Total <strong style={{ color: '#B45309' }}>{formatRupiah(stats.pending_amount)}</strong></>
            )}
            . Review sekarang biar dana tampak disalurkan di dashboard publik.
          </div>
        </div>
      )}

      {/* Status Tabs */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto',
        flexWrap: 'wrap',
      }}>
        {STATUS_TABS.map(tab => {
          const active = activeTab === tab.key;
          const count = stats
            ? (tab.key === 'all' ? stats.total : stats[tab.key] as number)
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

      {/* Search + Sort + Create */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <form onSubmit={handleSearch} style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: t.textMuted,
          }}>
            <Icons.Search />
          </span>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Cari judul atau deskripsi laporan..."
            style={{
              width: '100%', padding: '9px 14px 9px 36px',
              borderRadius: 10,
              border: `1px solid ${t.sidebarBorder}`,
              background: t.mainBg, color: t.textPrimary,
              fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
          {searchInput !== searchApplied && (
            <button type="submit" style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              padding: '5px 12px', borderRadius: 7,
              border: 'none', background: '#EC4899', color: '#fff',
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>
              Cari
            </button>
          )}
        </form>

        <select
          value={sort}
          onChange={e => { setSort(e.target.value); setPage(1); }}
          style={{
            padding: '9px 14px', borderRadius: 10,
            border: `1px solid ${t.sidebarBorder}`,
            background: t.mainBg, color: t.textPrimary,
            fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none',
          }}>
          {SORT_OPTIONS.map(opt => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>

        <button
          onClick={() => setCreateModalOpen(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '9px 16px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #EC4899, #BE185D)',
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(236,72,153,0.25)',
          }}>
          <Icons.Plus /> Buat Laporan
        </button>
      </div>

      {/* Search Active Indicator */}
      {searchApplied && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 999,
          background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.3)',
          color: '#EC4899', fontSize: 11, fontWeight: 600,
          marginBottom: 12,
        }}>
          Search: "{searchApplied}"
          <button
            onClick={() => { setSearchInput(''); setSearchApplied(''); setPage(1); }}
            style={{
              background: 'transparent', border: 'none', color: '#EC4899',
              cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1,
            }}>
            ×
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{
          background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
          borderRadius: 16, padding: 60, textAlign: 'center',
          color: t.textDim, fontSize: 14,
        }}>
          Memuat laporan...
        </div>
      ) : (
        <>
          <ReportsTable
            reports={reports}
            onRowAction={(action, report) => openReview(report, action)}
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

      {/* Review Modal */}
      <ReportReviewModal
        open={reviewModal.open}
        reportId={reviewModal.reportId}
        initialMode={reviewModal.mode}
        onClose={() => setReviewModal({ open: false, reportId: null, mode: 'view' })}
        onSuccess={handleModalSuccess}
        onToast={showToast}
      />

      {/* Create Modal */}
      <ReportCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
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
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
      }}>
        {label}
      </p>
      <p style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 2 }}>
        {value}
      </p>
      {subtext && (
        <p style={{ fontSize: 10, color: t.textMuted }}>
          {subtext}
        </p>
      )}
    </div>
  );
}
