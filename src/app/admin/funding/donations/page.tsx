'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useContext, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

import AdminFundingSubNav from '@/components/admin/funding/AdminFundingSubNav';
import DonationSmartViewsPills, {
  type DonationSmartViewKey, type DonationSmartViewCounts,
} from '@/components/admin/funding/DonationSmartViewsPills';
import DonationsTable, { type Donation } from '@/components/admin/funding/DonationsTable';
import Pagination from '@/components/admin/funding/Pagination';
import DonationsAdvancedFiltersDrawer, {
  type DonationFiltersState, EMPTY_DONATION_FILTERS, countActiveDonationFilters,
} from '@/components/admin/funding/DonationsAdvancedFiltersDrawer';
import DonationsBulkActionsToolbar from '@/components/admin/funding/DonationsBulkActionsToolbar';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ── Icons ─────────────────────────────────────────
const Icons = {
  Search:      () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  X:           () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  ChevronDown: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  Filter:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Shield:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
  Alert:       () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

const STATUS_TABS = [
  { key: 'pending',  label: 'Pending' },
  { key: 'verified', label: 'Verified' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all',      label: 'Semua' },
];

const SORT_OPTIONS = [
  { key: 'newest',      label: 'Terbaru' },
  { key: 'oldest',      label: 'Terlama' },
  { key: 'amount_high', label: 'Nominal Tertinggi' },
  { key: 'amount_low',  label: 'Nominal Terendah' },
  { key: 'donor_az',    label: 'Donor A-Z' },
];

interface DonationStats {
  pending: number;
  pendingOver24h: number;
  verifiedToday: number;
  rejectedToday: number;
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function AdminDonationsPage() {
  const { t } = useContext(AdminThemeContext);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { token } = useAuth();

  // ── URL state ──
  const statusParam = searchParams.get('status');
  const activeStatus = statusParam ?? 'pending';
  const activeSmartView = (searchParams.get('sv') as DonationSmartViewKey | null) ?? null;
  const activeSort = searchParams.get('sort') ?? 'newest';
  const urlSearch = searchParams.get('q') ?? '';
  const urlPage = Number(searchParams.get('page')) || 1;
  const urlLimit = Number(searchParams.get('limit')) || 20;

  // Extract filter state from URL
  const activeFilters: DonationFiltersState = useMemo(() => ({
    amountMin: searchParams.get('amount_min') ?? '',
    amountMax: searchParams.get('amount_max') ?? '',
    anonFilter: searchParams.get('anon') ?? '',
    dateFrom: searchParams.get('from') ?? '',
    dateTo: searchParams.get('to') ?? '',
  }), [searchParams]);

  const activeFilterCount = countActiveDonationFilters(activeFilters);

  // ── Component state ──
  const [donations, setDonations] = useState<Donation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DonationStats>({
    pending: 0, pendingOver24h: 0, verifiedToday: 0, rejectedToday: 0,
  });
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [smartViewCounts, setSmartViewCounts] = useState<DonationSmartViewCounts | null>(null);
  const [subNavRefresh, setSubNavRefresh] = useState(0);

  const [searchInput, setSearchInput] = useState(urlSearch);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [modal, setModal] = useState<{ type: 'verify' | 'reject' | 'detail'; donation: Donation } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  // Selected donations for bulk toolbar
  const selectedDonations = useMemo(() => {
    return donations.filter(d => selectedIds.has(d.id));
  }, [donations, selectedIds]);

  // ═══════ URL helpers ═══════

  const updateUrl = useCallback((updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === undefined) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);

  // Build current query string (for CSV export)
  const currentQueryString = useMemo(() => {
    const params = new URLSearchParams();
    if (activeStatus && activeStatus !== 'all') params.set('status', activeStatus);
    if (activeSmartView) params.set('sv', activeSmartView);
    if (activeSort) params.set('sort', activeSort);
    if (urlSearch) params.set('q', urlSearch);
    if (activeFilters.amountMin) params.set('amount_min', activeFilters.amountMin);
    if (activeFilters.amountMax) params.set('amount_max', activeFilters.amountMax);
    if (activeFilters.anonFilter) params.set('anon', activeFilters.anonFilter);
    if (activeFilters.dateFrom) params.set('from', activeFilters.dateFrom);
    if (activeFilters.dateTo) params.set('to', activeFilters.dateTo);
    return params.toString();
  }, [activeStatus, activeSmartView, activeSort, urlSearch, activeFilters]);

  // ═══════ Fetch donations ═══════

  const fetchDonations = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    setLoading(true);

    const params = new URLSearchParams({
      page: String(urlPage),
      limit: String(urlLimit),
      sort: activeSort,
    });
    if (activeStatus && activeStatus !== 'all') params.set('status', activeStatus);
    if (activeSmartView) params.set('sv', activeSmartView);
    if (urlSearch) params.set('q', urlSearch);
    if (activeFilters.amountMin) params.set('amount_min', activeFilters.amountMin);
    if (activeFilters.amountMax) params.set('amount_max', activeFilters.amountMax);
    if (activeFilters.anonFilter) params.set('anon', activeFilters.anonFilter);
    if (activeFilters.dateFrom) params.set('from', activeFilters.dateFrom);
    if (activeFilters.dateTo) params.set('to', activeFilters.dateTo);

    try {
      const res = await fetch(`${API_URL}/funding/admin/donations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setDonations(json.data ?? []);
        setTotal(json.meta?.total ?? 0);
        if (json.stats) setStats(json.stats);
      } else {
        setDonations([]);
        setTotal(0);
      }
    } catch {
      setDonations([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [activeStatus, activeSmartView, activeSort, urlSearch, urlPage, urlLimit, activeFilters]);

  const fetchStatusCounts = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    const statuses = ['pending', 'verified', 'rejected'];
    const results = await Promise.all(
      statuses.map(s =>
        fetch(`${API_URL}/funding/admin/donations?status=${s}&limit=1`, {
          headers: { Authorization: `Bearer ${tk}` },
        }).then(r => r.json()).catch(() => null)
      )
    );
    const next: Record<string, number> = {};
    statuses.forEach((s, i) => { next[s] = results[i]?.meta?.total ?? 0; });
    setStatusCounts(next);
  }, []);

  const fetchSmartViewCounts = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    try {
      const res = await fetch(`${API_URL}/funding/admin/donations/smart-views/counts`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      if (res.ok && json.success) setSmartViewCounts(json.data);
    } catch {}
  }, []);

  useEffect(() => { fetchDonations(); }, [fetchDonations]);
  useEffect(() => {
    fetchStatusCounts();
    fetchSmartViewCounts();
  }, [fetchStatusCounts, fetchSmartViewCounts]);

  useEffect(() => { setSearchInput(urlSearch); }, [urlSearch]);

  useEffect(() => {
    if (searchInput === urlSearch) return;
    const timer = setTimeout(() => {
      updateUrl({ q: searchInput || null, page: 1 });
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // ═══════ Handlers ═══════

  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  }

  function switchStatus(status: string) {
    updateUrl({ status: status || null, sv: null, page: 1 });
    setSelectedIds(new Set());
  }

  function switchSmartView(sv: DonationSmartViewKey | null) {
    updateUrl({ sv: sv || null, page: 1 });
    setSelectedIds(new Set());
  }

  function switchSort(sort: string) { updateUrl({ sort, page: 1 }); }

  function onRowAction(action: 'detail' | 'verify' | 'reject', donation: Donation) {
    setModal({ type: action, donation });
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(prev => {
      const allIds = donations.map(d => d.id);
      const allSelected = allIds.every(id => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        allIds.forEach(id => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      allIds.forEach(id => next.add(id));
      return next;
    });
  }

  function handleApplyFilters(filters: DonationFiltersState) {
    updateUrl({
      amount_min: filters.amountMin || null,
      amount_max: filters.amountMax || null,
      anon: filters.anonFilter || null,
      from: filters.dateFrom || null,
      to: filters.dateTo || null,
      page: 1,
    });
  }

  function handleResetFilters() {
    updateUrl({
      amount_min: null, amount_max: null, anon: null,
      from: null, to: null, page: 1,
    });
  }

  async function handleVerify(d: Donation) {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/funding/donations/${d.id}/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify' }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Gagal verify');
      showToast(true, `✓ Donasi ${d.donation_code} ter-verifikasi`);
      setModal(null);
      fetchDonations();
      fetchStatusCounts();
      fetchSmartViewCounts();
      setSubNavRefresh(r => r + 1);
    } catch (err: any) {
      showToast(false, err.message);
    } finally { setSubmitting(false); }
  }

  async function handleReject(d: Donation) {
    if (rejectReason.trim().length < 10) {
      showToast(false, 'Alasan penolakan minimal 10 karakter');
      return;
    }
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/funding/donations/${d.id}/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: rejectReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Gagal tolak');
      showToast(true, `✗ Donasi ${d.donation_code} ditolak`);
      setModal(null);
      setRejectReason('');
      fetchDonations();
      fetchStatusCounts();
      fetchSmartViewCounts();
      setSubNavRefresh(r => r + 1);
    } catch (err: any) {
      showToast(false, err.message);
    } finally { setSubmitting(false); }
  }

  function handleBulkComplete() {
    fetchDonations();
    fetchStatusCounts();
    fetchSmartViewCounts();
    setSubNavRefresh(r => r + 1);
  }

  // ═══════ Render ═══════

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, color: t.textPrimary }}>

      {/* Breadcrumb */}
      <div style={{ marginBottom: 8 }}>
        <Link href="/admin/funding" style={{ fontSize: 12, color: t.textDim, textDecoration: 'none' }}>Dashboard</Link>
        <span style={{ fontSize: 12, color: t.textMuted, margin: '0 6px' }}>/</span>
        <span style={{ fontSize: 12, color: t.textDim, fontWeight: 600 }}>Donasi</span>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800, color: t.textPrimary, marginBottom: 4 }}>
        Verifikasi Donasi
      </h1>
      <p style={{ fontSize: 14, color: t.textDim, marginBottom: 24 }}>
        Verifikasi donasi yang masuk — pastikan transfer sudah diterima sebelum konfirmasi.
      </p>

      <AdminFundingSubNav refreshKey={subNavRefresh} />

      {/* Stats Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12, marginBottom: 24,
      }}>
        <StatCard label="Pending Total" value={stats.pending} color="#F59E0B" t={t} />
        <StatCard
          label="⚠️ Pending >24 Jam"
          value={stats.pendingOver24h}
          color="#EF4444"
          t={t}
          alert={stats.pendingOver24h > 0}
        />
        <StatCard label="✓ Verified Hari Ini" value={stats.verifiedToday} color="#10B981" t={t} />
        <StatCard label="✗ Rejected Hari Ini" value={stats.rejectedToday} color="#6B7280" t={t} />
      </div>

      {/* Status Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
        {STATUS_TABS.map(tab => {
          const active = activeStatus === tab.key;
          const count = tab.key === 'all'
            ? Object.values(statusCounts).reduce((sum, n) => sum + n, 0)
            : (statusCounts[tab.key] ?? 0);
          return (
            <button key={tab.key} onClick={() => switchStatus(tab.key)}
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
                background: active ? 'rgba(255,255,255,0.2)' : (tab.key === 'pending' && count > 0 ? 'rgba(245,158,11,0.15)' : t.navHover),
                color: active ? '#fff' : (tab.key === 'pending' && count > 0 ? '#F59E0B' : t.textDim),
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Smart Views */}
      <DonationSmartViewsPills
        counts={smartViewCounts}
        selected={activeSmartView}
        onSelect={switchSmartView}
      />

      {/* Search + Filter + Sort */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 16,
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: t.textDim }}>
            <Icons.Search />
          </span>
          <input
            type="text"
            placeholder="Cari donor, kode donasi, nomor HP..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            style={{
              width: '100%', padding: '10px 36px 10px 40px',
              borderRadius: 10,
              border: `1px solid ${t.sidebarBorder}`,
              background: t.mainBg, color: t.textPrimary,
              fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: t.textDim, padding: 4,
              }}>
              <Icons.X />
            </button>
          )}
        </div>

        {/* Filter button */}
        <button
          onClick={() => setDrawerOpen(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 14px', borderRadius: 10,
            border: `1px solid ${activeFilterCount > 0 ? '#EC4899' : t.sidebarBorder}`,
            background: activeFilterCount > 0 ? 'rgba(236,72,153,0.08)' : t.mainBg,
            color: activeFilterCount > 0 ? '#EC4899' : t.textPrimary,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Icons.Filter />
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span style={{
              background: '#EC4899', color: '#fff',
              fontSize: 10, fontWeight: 700,
              padding: '2px 7px', borderRadius: 999, minWidth: 20, textAlign: 'center',
            }}>
              {activeFilterCount}
            </span>
          )}
        </button>

        <div style={{ position: 'relative' }}>
          <select value={activeSort} onChange={e => switchSort(e.target.value)}
            style={{
              appearance: 'none',
              padding: '10px 36px 10px 14px',
              borderRadius: 10,
              border: `1px solid ${t.sidebarBorder}`,
              background: t.mainBg, color: t.textPrimary,
              fontSize: 13, fontWeight: 600,
              cursor: 'pointer', outline: 'none',
            }}>
            {SORT_OPTIONS.map(opt => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
          <span style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            color: t.textDim, pointerEvents: 'none',
          }}>
            <Icons.ChevronDown />
          </span>
        </div>
      </div>

      {/* Bulk Actions Toolbar (sticky when selected) */}
      <DonationsBulkActionsToolbar
        selectedIds={selectedIds}
        selectedDonations={selectedDonations}
        currentQueryString={currentQueryString}
        onClear={() => setSelectedIds(new Set())}
        onComplete={handleBulkComplete}
        onToast={showToast}
      />

      {/* Table */}
      {loading ? (
        <div style={{
          background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
          borderRadius: 16, padding: 60, textAlign: 'center',
          color: t.textDim, fontSize: 14,
        }}>
          Memuat donasi...
        </div>
      ) : (
        <DonationsTable
          donations={donations}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleAll={toggleSelectAll}
          onRowAction={onRowAction}
        />
      )}

      {/* Pagination */}
      {!loading && total > 0 && (
        <Pagination
          page={urlPage}
          limit={urlLimit}
          total={total}
          onPageChange={p => updateUrl({ page: p })}
          onLimitChange={l => updateUrl({ limit: l, page: 1 })}
        />
      )}

      {/* Advanced Filters Drawer */}
      <DonationsAdvancedFiltersDrawer
        open={drawerOpen}
        filters={activeFilters}
        onClose={() => setDrawerOpen(false)}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

      {/* MODAL (single verify/reject/detail) */}
      {modal && (
        <div onClick={() => !submitting && setModal(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)',
          backdropFilter: 'blur(4px)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, overflowY: 'auto',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: t.mainBg, borderRadius: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            width: '100%', maxWidth: 560, margin: '32px 0', maxHeight: '90vh',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              padding: '16px 24px', borderBottom: `1px solid ${t.sidebarBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: t.textPrimary }}>
                {modal.type === 'verify' && '✓ Verifikasi Donasi'}
                {modal.type === 'reject' && '✗ Tolak Donasi'}
                {modal.type === 'detail' && 'Detail Donasi'}
              </h3>
              <button onClick={() => !submitting && setModal(null)}
                style={{ background: 'transparent', border: 'none', color: t.textDim, cursor: 'pointer', padding: 4 }}>
                <Icons.X />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              {modal.type === 'verify' && (
                <>
                  <div style={{
                    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                    borderRadius: 12, padding: 14, marginBottom: 16,
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: '#10B981', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}><Icons.Shield /></div>
                    <div style={{ fontSize: 12, color: '#10B981', lineHeight: 1.5 }}>
                      <strong>Konfirmasi transfer sudah diterima.</strong> Cek rekening partner sebelum verify.
                    </div>
                  </div>
                  <DonationSummary d={modal.donation} t={t} />
                  <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                    <button onClick={() => setModal(null)} disabled={submitting} style={cancelBtnStyle(t)}>Batal</button>
                    <button onClick={() => handleVerify(modal.donation)} disabled={submitting}
                      style={primaryBtnStyle('#10B981', '#059669', submitting)}>
                      {submitting ? 'Memproses...' : '✓ Ya, Verify'}
                    </button>
                  </div>
                </>
              )}

              {modal.type === 'reject' && (
                <>
                  <div style={{
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: 12, padding: 14, marginBottom: 16,
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: '#EF4444', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}><Icons.Alert /></div>
                    <div style={{ fontSize: 12, color: '#EF4444', lineHeight: 1.5 }}>
                      <strong>Donasi yang ditolak tidak bisa di-revert.</strong> Beri alasan yang jelas.
                    </div>
                  </div>
                  <DonationSummary d={modal.donation} t={t} />
                  <div style={{ marginTop: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: t.textPrimary, marginBottom: 8 }}>
                      Alasan Penolakan <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                      placeholder="Contoh: Transfer belum masuk rekening partner setelah 48 jam."
                      rows={4} maxLength={500} disabled={submitting}
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: 12,
                        border: `1px solid ${t.sidebarBorder}`, background: t.mainBg,
                        color: t.textPrimary, fontSize: 13, resize: 'none',
                        fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                      }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      <p style={{ fontSize: 11, color: t.textMuted }}>Minimal 10 karakter.</p>
                      <p style={{ fontSize: 11, color: t.textMuted }}>{rejectReason.length}/500</p>
                    </div>
                  </div>
                  <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                    <button onClick={() => { setModal(null); setRejectReason(''); }} disabled={submitting}
                      style={cancelBtnStyle(t)}>Batal</button>
                    <button onClick={() => handleReject(modal.donation)}
                      disabled={submitting || rejectReason.trim().length < 10}
                      style={primaryBtnStyle('#EF4444', '#DC2626', submitting || rejectReason.trim().length < 10)}>
                      {submitting ? 'Memproses...' : '✗ Tolak'}
                    </button>
                  </div>
                </>
              )}

              {modal.type === 'detail' && (
                <>
                  <DonationDetail d={modal.donation} t={t} />
                  <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
                    {modal.donation.verification_status === 'pending' && (
                      <>
                        <button onClick={() => setModal({ type: 'reject', donation: modal.donation })}
                          style={{
                            flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none',
                            background: 'rgba(239,68,68,0.1)', color: '#EF4444',
                            fontWeight: 600, fontSize: 13, cursor: 'pointer',
                          }}>
                          ✗ Tolak
                        </button>
                        <button onClick={() => setModal({ type: 'verify', donation: modal.donation })}
                          style={{
                            flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none',
                            background: 'rgba(16,185,129,0.1)', color: '#10B981',
                            fontWeight: 600, fontSize: 13, cursor: 'pointer',
                          }}>
                          ✓ Verify
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 70,
          padding: '12px 20px', borderRadius: 12,
          background: toast.ok ? '#10B981' : '#EF4444', color: '#fff',
          fontWeight: 600, fontSize: 14, maxWidth: 400,
          boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────

function shortRupiah(n: number): string {
  if (n >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + n.toLocaleString('id-ID');
}

function cancelBtnStyle(t: any): React.CSSProperties {
  return {
    flex: 1, padding: '12px 16px', borderRadius: 12,
    border: `1px solid ${t.sidebarBorder}`, background: 'transparent',
    color: t.textPrimary, fontWeight: 600, fontSize: 14, cursor: 'pointer',
  };
}

function primaryBtnStyle(c1: string, c2: string, disabled: boolean): React.CSSProperties {
  return {
    flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none',
    background: `linear-gradient(135deg, ${c1}, ${c2})`, color: '#fff',
    fontWeight: 700, fontSize: 14,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
}

function StatCard({ label, value, color, t, alert }: {
  label: string; value: number; color: string; t: any; alert?: boolean;
}) {
  return (
    <div style={{
      background: alert ? 'rgba(239,68,68,0.08)' : t.mainBg,
      border: `1px solid ${alert ? 'rgba(239,68,68,0.3)' : t.sidebarBorder}`,
      borderRadius: 12,
      padding: 14,
    }}>
      <p style={{
        fontSize: 11, fontWeight: 700, color: alert ? '#EF4444' : t.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
      }}>
        {label}
      </p>
      <p style={{ fontSize: 24, fontWeight: 800, color }}>{value}</p>
    </div>
  );
}

function DonationSummary({ d, t }: { d: Donation; t: any }) {
  return (
    <div style={{ background: t.navHover, borderRadius: 12, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: t.textPrimary }}>
          {shortRupiah(d.amount)}
        </span>
        <span style={{
          fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
          color: t.textDim, background: t.mainBg, padding: '3px 8px', borderRadius: 6,
        }}>
          {d.donation_code}
        </span>
      </div>
      <p style={{ fontSize: 12, color: t.textPrimary, fontWeight: 600 }}>
        {d.is_anonymous ? '🎭 Anonim' : d.donor_name}
      </p>
      {d.donor_phone && (
        <p style={{ fontSize: 11, color: t.textDim, fontFamily: 'monospace', marginTop: 2 }}>
          {d.donor_phone}
        </p>
      )}
      {d.campaign && (
        <p style={{ fontSize: 11, color: t.textDim, marginTop: 6 }}>
          untuk <strong style={{ color: t.textPrimary }}>{d.campaign.title}</strong>
        </p>
      )}
    </div>
  );
}

function DonationDetail({ d, t }: { d: Donation; t: any }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(236,72,153,0.1), rgba(190,24,93,0.05))',
        border: '1px solid rgba(236,72,153,0.2)',
        borderRadius: 12, padding: 20, textAlign: 'center',
      }}>
        <p style={{
          fontSize: 11, fontWeight: 700, color: '#EC4899',
          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
        }}>
          Jumlah Donasi
        </p>
        <p style={{ fontSize: 32, fontWeight: 900, color: '#BE185D' }}>
          {shortRupiah(d.amount)}
        </p>
        <p style={{ fontSize: 12, color: t.textDim, marginTop: 4, fontFamily: 'monospace' }}>
          Kode: <strong>{d.donation_code}</strong>
        </p>
      </div>

      <div>
        <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
          Donor
        </p>
        <div style={{ background: t.navHover, borderRadius: 12, padding: 14 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>
            {d.is_anonymous ? '🎭 Anonim' : d.donor_name}
          </p>
          {d.donor_phone && (
            <p style={{ fontSize: 12, color: t.textDim, fontFamily: 'monospace', marginTop: 4 }}>
              {d.donor_phone}
            </p>
          )}
        </div>
      </div>

      {d.campaign && (
        <div>
          <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
            Kampanye
          </p>
          <Link href={`/fundraising/${d.campaign.slug}`} target="_blank"
            style={{
              display: 'block', background: t.navHover, borderRadius: 12, padding: 14,
              textDecoration: 'none', color: 'inherit',
            }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>
              {d.campaign.title} →
            </p>
            <p style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}>
              Status: {d.campaign.status}
            </p>
          </Link>
        </div>
      )}

      <div>
        <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
          Rincian Transfer
        </p>
        <div style={{ background: t.navHover, borderRadius: 12, padding: 14 }}>
          <Row label="Donasi" value={shortRupiah(d.amount)} t={t} />
          <Row label="Fee Operasional" value={shortRupiah(d.operational_fee)} t={t} />
          <div style={{ borderTop: `1px solid ${t.sidebarBorder}`, marginTop: 8, paddingTop: 8 }}>
            <Row label="Total Transfer" value={shortRupiah(d.total_transfer)} t={t} bold />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
            Dibuat
          </p>
          <p style={{ fontSize: 12, color: t.textPrimary }}>
            {new Date(d.created_at).toLocaleString('id-ID', {
              dateStyle: 'medium', timeStyle: 'short',
            })}
          </p>
        </div>
        {d.verified_at && (
          <div>
            <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
              Diverifikasi
            </p>
            <p style={{ fontSize: 12, color: t.textPrimary }}>
              {new Date(d.verified_at).toLocaleString('id-ID', {
                dateStyle: 'medium', timeStyle: 'short',
              })}
            </p>
          </div>
        )}
      </div>

      {d.rejection_reason && (
        <div>
          <p style={{ fontSize: 10, color: '#EF4444', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
            Alasan Penolakan
          </p>
          <p style={{ fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', padding: 10, borderRadius: 8 }}>
            {d.rejection_reason}
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, t, bold }: { label: string; value: string; t: any; bold?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      marginBottom: 4,
    }}>
      <span style={{ fontSize: bold ? 12 : 11, color: bold ? t.textPrimary : t.textDim, fontWeight: bold ? 700 : 500 }}>
        {label}
      </span>
      <span style={{ fontSize: bold ? 14 : 12, color: t.textPrimary, fontWeight: bold ? 800 : 600 }}>
        {value}
      </span>
    </div>
  );
}
