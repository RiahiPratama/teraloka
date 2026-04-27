'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useContext, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

import SmartViewsPills, { type SmartViewKey, type SmartViewCounts } from '@/components/admin/funding/SmartViewsPills';
import CampaignsTable, { type Campaign } from '@/components/admin/funding/CampaignsTable';
import Pagination from '@/components/admin/funding/Pagination';
import AdvancedFiltersDrawer, {
  type FiltersState, EMPTY_FILTERS, countActiveFilters,
} from '@/components/admin/funding/AdvancedFiltersDrawer';
import BulkActionsToolbar from '@/components/admin/funding/BulkActionsToolbar';
import FraudFlagsListModal from '@/components/admin/funding/FraudFlagsListModal';   // ← M4-C
import AdminFundingSubNav from '@/components/admin/funding/AdminFundingSubNav';     // ← M1-Polish

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ── Icons ─────────────────────────────────────────
const Icons = {
  Search:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  X:         () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Table:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>,
  List:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  ChevronDown: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  Filter:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Shield:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
  Alert:     () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

const STATUS_TABS = [
  { key: 'pending_review', label: 'Pending' },
  { key: 'active',         label: 'Aktif' },
  { key: 'completed',      label: 'Selesai' },
  { key: 'rejected',       label: 'Ditolak' },
  { key: 'all',            label: 'Semua' },
];

const SORT_OPTIONS = [
  { key: 'newest',        label: 'Terbaru' },
  { key: 'oldest',        label: 'Terlama' },
  { key: 'deadline',      label: 'Deadline Dekat' },
  { key: 'collected',     label: 'Terkumpul Tertinggi' },
  { key: 'progress_low',  label: 'Progress Terendah' },
  { key: 'progress_high', label: 'Progress Tertinggi' },
  { key: 'donors',        label: 'Paling Banyak Donatur' },
  { key: 'az',            label: 'A-Z' },
];

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function AdminCampaignsPage() {
  const { t } = useContext(AdminThemeContext);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { token } = useAuth();

  // ── URL state ──
  const statusParam = searchParams.get('status');
  const activeStatus = statusParam ?? 'pending_review';
  const activeSmartView = (searchParams.get('sv') as SmartViewKey | null) ?? null;
  const activeSort = searchParams.get('sort') ?? 'newest';
  const urlSearch = searchParams.get('q') ?? '';
  const urlPage = Number(searchParams.get('page')) || 1;
  const urlLimit = Number(searchParams.get('limit')) || 20;
  const urlView = searchParams.get('view') as 'table' | 'list' | null;

  // Extract filter state from URL
  const activeFilters: FiltersState = useMemo(() => {
    const cat = searchParams.get('cat');
    return {
      categories: cat ? cat.split(',').filter(Boolean) : [],
      urgent: searchParams.get('urgent') === '1',
      partner: searchParams.get('partner') ?? '',
      progress: searchParams.get('progress') ?? '',
      deadline: searchParams.get('deadline') ?? '',
      dateFrom: searchParams.get('from') ?? '',
      dateTo: searchParams.get('to') ?? '',
    };
  }, [searchParams]);

  const activeFilterCount = countActiveFilters(activeFilters);

  // ── Component state ──
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [smartViewCounts, setSmartViewCounts] = useState<SmartViewCounts | null>(null);
  const [pendingDonations, setPendingDonations] = useState(0);
  const [subNavRefresh, setSubNavRefresh] = useState(0);   // ← M1-Polish

  const [searchInput, setSearchInput] = useState(urlSearch);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [modal, setModal] = useState<{ type: 'approve' | 'reject' | 'detail'; campaign: Campaign } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  // ⭐ FIX-E-4-B: Mandatory checklist before approve (anti-rubber-stamp UX)
  // Admin wajib centang semua checklist sebelum tombol Approve aktif
  const [approveChecklist, setApproveChecklist] = useState<{
    documentsClear: boolean;
    nameMatches: boolean;
    nikValid: boolean;
    notManipulated: boolean;
    doubleChecked: boolean;
  }>({
    documentsClear: false,
    nameMatches: false,
    nikValid: false,
    notManipulated: false,
    doubleChecked: false,
  });
  const allChecked = Object.values(approveChecklist).every(Boolean);

  // M4-C: Fraud flags list modal state
  const [fraudModal, setFraudModal] = useState<{
    open: boolean;
    campaignId: string | null;
    campaignTitle: string;
  }>({ open: false, campaignId: null, campaignTitle: '' });

  const layout = useMemo<'table' | 'list'>(() => {
    if (urlView === 'list') return 'list';
    return 'table';
  }, [urlView]);

  // Selected campaigns (for bulk toolbar)
  const selectedCampaigns = useMemo(() => {
    return campaigns.filter(c => selectedIds.has(c.id));
  }, [campaigns, selectedIds]);

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

  // Build current query string (for CSV export URL preservation)
  const currentQueryString = useMemo(() => {
    const params = new URLSearchParams();
    if (activeStatus && activeStatus !== 'all') params.set('status', activeStatus);
    if (activeSmartView) params.set('sv', activeSmartView);
    if (activeSort) params.set('sort', activeSort);
    if (urlSearch) params.set('q', urlSearch);
    if (activeFilters.categories.length > 0) params.set('cat', activeFilters.categories.join(','));
    if (activeFilters.urgent) params.set('urgent', '1');
    if (activeFilters.partner) params.set('partner', activeFilters.partner);
    if (activeFilters.progress) params.set('progress', activeFilters.progress);
    if (activeFilters.deadline) params.set('deadline', activeFilters.deadline);
    if (activeFilters.dateFrom) params.set('from', activeFilters.dateFrom);
    if (activeFilters.dateTo) params.set('to', activeFilters.dateTo);
    return params.toString();
  }, [activeStatus, activeSmartView, activeSort, urlSearch, activeFilters]);

  // ═══════ Fetch campaigns ═══════

  const fetchCampaigns = useCallback(async () => {
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
    if (activeFilters.categories.length > 0) params.set('cat', activeFilters.categories.join(','));
    if (activeFilters.urgent) params.set('urgent', '1');
    if (activeFilters.partner) params.set('partner', activeFilters.partner);
    if (activeFilters.progress) params.set('progress', activeFilters.progress);
    if (activeFilters.deadline) params.set('deadline', activeFilters.deadline);
    if (activeFilters.dateFrom) params.set('from', activeFilters.dateFrom);
    if (activeFilters.dateTo) params.set('to', activeFilters.dateTo);

    try {
      const res = await fetch(`${API_URL}/funding/admin/campaigns?${params.toString()}`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setCampaigns(json.data ?? []);
        setTotal(json.meta?.total ?? 0);
      } else {
        setCampaigns([]);
        setTotal(0);
      }
    } catch {
      setCampaigns([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [activeStatus, activeSmartView, activeSort, urlSearch, urlPage, urlLimit, activeFilters]);

  const fetchStatusCounts = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    const statuses = ['pending_review', 'active', 'completed', 'rejected'];
    const results = await Promise.all(
      statuses.map(s =>
        fetch(`${API_URL}/funding/admin/campaigns?status=${s}&limit=1`, {
          headers: { Authorization: `Bearer ${tk}` },
        }).then(r => r.json()).catch(() => null)
      )
    );
    const next: Record<string, number> = {};
    statuses.forEach((s, i) => { next[s] = results[i]?.meta?.total ?? 0; });
    setStatusCounts(next);

    const dRes = await fetch(`${API_URL}/funding/admin/donations?status=pending&limit=1`, {
      headers: { Authorization: `Bearer ${tk}` },
    }).then(r => r.json()).catch(() => null);
    setPendingDonations(dRes?.meta?.total ?? 0);
  }, []);

  const fetchSmartViewCounts = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    try {
      const res = await fetch(`${API_URL}/funding/admin/campaigns/smart-views/counts`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      if (res.ok && json.success) setSmartViewCounts(json.data);
    } catch {}
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

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
    updateUrl({
      status: status || null,
      sv: null,
      page: 1,
    });
    setSelectedIds(new Set());
  }

  function switchSmartView(sv: SmartViewKey | null) {
    updateUrl({ sv: sv || null, page: 1 });
    setSelectedIds(new Set());
  }

  function switchSort(sort: string) { updateUrl({ sort, page: 1 }); }
  function switchLayout(view: 'table' | 'list') { updateUrl({ view }); }

  function onRowAction(action: 'detail' | 'approve' | 'reject', campaign: Campaign) {
    // ⭐ FIX-E-4-B: Reset checklist setiap buka modal approve baru
    if (action === 'approve') {
      setApproveChecklist({
        documentsClear: false,
        nameMatches: false,
        nikValid: false,
        notManipulated: false,
        doubleChecked: false,
      });
    }
    setModal({ type: action, campaign });
  }

  // M4-C: Open fraud flags modal when badge clicked
  function onFraudBadgeClick(campaign: Campaign) {
    setFraudModal({
      open: true,
      campaignId: campaign.id,
      campaignTitle: campaign.title,
    });
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
      const allIds = campaigns.map(c => c.id);
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

  function handleApplyFilters(filters: FiltersState) {
    updateUrl({
      cat: filters.categories.length > 0 ? filters.categories.join(',') : null,
      urgent: filters.urgent ? '1' : null,
      partner: filters.partner || null,
      progress: filters.progress || null,
      deadline: filters.deadline || null,
      from: filters.dateFrom || null,
      to: filters.dateTo || null,
      page: 1,
    });
  }

  function handleResetFilters() {
    updateUrl({
      cat: null, urgent: null, partner: null,
      progress: null, deadline: null, from: null, to: null,
      page: 1,
    });
  }

  async function handleApprove(c: Campaign) {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/funding/campaigns/${c.id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Gagal approve');
      showToast(true, `✓ "${c.title}" di-approve`);
      setModal(null);
      fetchCampaigns();
      fetchStatusCounts();
      fetchSmartViewCounts();
      setSubNavRefresh(r => r + 1);
    } catch (err: any) {
      showToast(false, err.message);
    } finally { setSubmitting(false); }
  }

  async function handleReject(c: Campaign) {
    if (rejectReason.trim().length < 10) {
      showToast(false, 'Alasan penolakan minimal 10 karakter');
      return;
    }
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/funding/campaigns/${c.id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Gagal tolak');
      showToast(true, `✗ "${c.title}" ditolak`);
      setModal(null);
      setRejectReason('');
      fetchCampaigns();
      fetchStatusCounts();
      setSubNavRefresh(r => r + 1);
    } catch (err: any) {
      showToast(false, err.message);
    } finally { setSubmitting(false); }
  }

  function handleBulkComplete() {
    fetchCampaigns();
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
        <span style={{ fontSize: 12, color: t.textDim, fontWeight: 600 }}>Kampanye</span>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800, color: t.textPrimary, marginBottom: 4 }}>
        Kelola Kampanye
      </h1>
      <p style={{ fontSize: 14, color: t.textDim, marginBottom: 24 }}>
        Verifikasi dokumen, approve kampanye yang memenuhi standar, atau tolak dengan alasan jelas.
      </p>

      <AdminFundingSubNav refreshKey={subNavRefresh} />

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
                background: active ? 'rgba(255,255,255,0.2)' : (tab.key === 'pending_review' && count > 0 ? 'rgba(245,158,11,0.15)' : t.navHover),
                color: active ? '#fff' : (tab.key === 'pending_review' && count > 0 ? '#F59E0B' : t.textDim),
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Smart Views */}
      <SmartViewsPills
        counts={smartViewCounts}
        selected={activeSmartView}
        onSelect={switchSmartView}
      />

      {/* Search + Sort + Filter + Layout Toggle */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 16,
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: t.textDim }}>
            <Icons.Search />
          </span>
          <input
            type="text"
            placeholder="Cari judul, penerima, partner..."
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

        {/* Sort */}
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

        {/* Layout toggle */}
        <div style={{
          display: 'flex', border: `1px solid ${t.sidebarBorder}`,
          borderRadius: 10, overflow: 'hidden',
        }}>
          <button onClick={() => switchLayout('table')} title="Table view"
            style={{
              padding: '10px 12px',
              background: layout === 'table' ? '#EC4899' : t.mainBg,
              color: layout === 'table' ? '#fff' : t.textPrimary,
              border: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center',
            }}>
            <Icons.Table />
          </button>
          <button onClick={() => switchLayout('list')} title="List view"
            style={{
              padding: '10px 12px',
              background: layout === 'list' ? '#EC4899' : t.mainBg,
              color: layout === 'list' ? '#fff' : t.textPrimary,
              border: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center',
              borderLeft: `1px solid ${t.sidebarBorder}`,
            }}>
            <Icons.List />
          </button>
        </div>
      </div>

      {/* Bulk Actions Toolbar (sticky at top when selected) */}
      <BulkActionsToolbar
        selectedIds={selectedIds}
        selectedCampaigns={selectedCampaigns}
        currentQueryString={currentQueryString}
        onClear={() => setSelectedIds(new Set())}
        onComplete={handleBulkComplete}
        onToast={showToast}
      />

      {/* Data Table */}
      {loading ? (
        <div style={{
          background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
          borderRadius: 16, padding: 60, textAlign: 'center',
          color: t.textDim, fontSize: 14,
        }}>
          Memuat kampanye...
        </div>
      ) : (
        <CampaignsTable
          campaigns={campaigns}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleAll={toggleSelectAll}
          onRowAction={onRowAction}
          onFraudBadgeClick={onFraudBadgeClick}   // ← M4-C
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
      <AdvancedFiltersDrawer
        open={drawerOpen}
        filters={activeFilters}
        onClose={() => setDrawerOpen(false)}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

      {/* MODAL (single approve/reject/detail) */}
      {modal && (
        <div onClick={() => !submitting && setModal(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)',
          backdropFilter: 'blur(4px)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, overflowY: 'auto',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: t.mainBg, borderRadius: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            width: '100%', maxWidth: 640, margin: '32px 0', maxHeight: '90vh',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              padding: '16px 24px', borderBottom: `1px solid ${t.sidebarBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: t.textPrimary }}>
                {modal.type === 'approve' && '✓ Approve Kampanye'}
                {modal.type === 'reject'  && '✗ Tolak Kampanye'}
                {modal.type === 'detail'  && 'Detail Kampanye'}
              </h3>
              <button onClick={() => !submitting && setModal(null)}
                style={{ background: 'transparent', border: 'none', color: t.textDim, cursor: 'pointer', padding: 4 }}>
                <Icons.X />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              {modal.type === 'approve' && (
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
                      <strong>Kampanye akan langsung publik.</strong> Pastikan identitas & dokumen valid.
                    </div>
                  </div>

                  <CampaignSummary c={modal.campaign} t={t} />

                  {/* ⭐ FIX-E-4-B: Side-by-side beneficiary KTP review */}
                  {modal.campaign.beneficiary_id_documents && modal.campaign.beneficiary_id_documents.length > 0 ? (
                    <div style={{
                      marginTop: 16, padding: 14, borderRadius: 12,
                      background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          🔒 Identitas Penerima Manfaat
                        </p>
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: '#EF4444',
                          background: 'rgba(239,68,68,0.1)', padding: '3px 7px', borderRadius: 6,
                          letterSpacing: '0.5px',
                        }}>
                          RAHASIA
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {/* Side: KTP Images */}
                        <div>
                          <p style={{ fontSize: 10, color: t.textMuted, marginBottom: 6, fontWeight: 600 }}>
                            📷 Foto KTP / Identitas ({modal.campaign.beneficiary_id_documents.length})
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                            {modal.campaign.beneficiary_id_documents.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                style={{
                                  aspectRatio: '1', borderRadius: 8, overflow: 'hidden',
                                  border: `1px solid ${t.sidebarBorder}`, background: t.navHover,
                                  display: 'block',
                                }}>
                                <img src={url} alt={`KTP ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </a>
                            ))}
                          </div>
                          <p style={{ fontSize: 10, color: t.textMuted, marginTop: 6, fontStyle: 'italic' }}>
                            Klik gambar untuk view full size
                          </p>
                        </div>

                        {/* Side: Typed Data */}
                        <div>
                          <p style={{ fontSize: 10, color: t.textMuted, marginBottom: 6, fontWeight: 600 }}>
                            📝 Data Yang Diketik
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div>
                              <p style={{ fontSize: 10, color: t.textMuted, marginBottom: 2 }}>Nama:</p>
                              <p style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary }}>{modal.campaign.beneficiary_name}</p>
                            </div>
                            {modal.campaign.beneficiary_relation && (
                              <div>
                                <p style={{ fontSize: 10, color: t.textMuted, marginBottom: 2 }}>Hubungan:</p>
                                <p style={{ fontSize: 12, color: t.textPrimary }}>{modal.campaign.beneficiary_relation}</p>
                              </div>
                            )}
                            <div>
                              <p style={{ fontSize: 10, color: t.textMuted, marginBottom: 2 }}>Tipe:</p>
                              <p style={{ fontSize: 12, color: t.textPrimary }}>
                                {modal.campaign.is_independent ? '👤 Perorangan' : '🏢 Komunitas/Lembaga'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      marginTop: 16, padding: 12, borderRadius: 12,
                      background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                      fontSize: 12, color: '#B45309', lineHeight: 1.5,
                    }}>
                      ⚠️ <strong>KTP penerima manfaat tidak ada.</strong> Pertimbangkan untuk reject jika kampanye butuh verifikasi identitas.
                    </div>
                  )}

                  {/* ⭐ FIX-E-4-B: Mandatory Checklist (anti-rubber-stamp) */}
                  <div style={{
                    marginTop: 16, padding: 14, borderRadius: 12,
                    background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.3)',
                  }}>
                    <p style={{
                      fontSize: 11, fontWeight: 700, color: '#B45309',
                      textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10,
                    }}>
                      ⚠️ Checklist Wajib (Centang Semua)
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { key: 'documentsClear', label: 'Foto KTP terbaca jelas (tidak blur/buram)' },
                        { key: 'nameMatches', label: 'Nama di KTP cocok dengan yang diketik penggalang' },
                        { key: 'nikValid', label: 'NIK pada KTP terlihat valid (16 digit)' },
                        { key: 'notManipulated', label: 'Foto KTP tidak terlihat dimanipulasi/edited' },
                        { key: 'doubleChecked', label: 'Saya sudah double-check semua data dengan teliti' },
                      ].map(item => {
                        const checked = approveChecklist[item.key as keyof typeof approveChecklist];
                        return (
                          <label key={item.key} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 8,
                            cursor: 'pointer', padding: 4, borderRadius: 6,
                          }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => setApproveChecklist(prev => ({
                                ...prev,
                                [item.key]: e.target.checked,
                              }))}
                              disabled={submitting}
                              style={{
                                marginTop: 2, width: 16, height: 16,
                                accentColor: '#10B981', cursor: 'pointer', flexShrink: 0,
                              }}
                            />
                            <span style={{
                              fontSize: 12, color: checked ? t.textPrimary : t.textDim,
                              lineHeight: 1.5,
                              fontWeight: checked ? 600 : 400,
                            }}>
                              {item.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {!allChecked && (
                      <p style={{
                        marginTop: 10, fontSize: 11, color: '#B45309',
                        fontStyle: 'italic',
                      }}>
                        Tombol Approve aktif setelah semua dicentang.
                      </p>
                    )}
                  </div>

                  <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                    <button onClick={() => setModal(null)} disabled={submitting}
                      style={cancelBtnStyle(t)}>Batal</button>
                    <button
                      onClick={() => handleApprove(modal.campaign)}
                      disabled={submitting || !allChecked}
                      style={primaryBtnStyle('#10B981', '#059669', submitting || !allChecked)}
                    >
                      {submitting ? 'Memproses...' : allChecked ? '✓ Ya, Approve' : '🔒 Lengkapi Checklist'}
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
                      <strong>Alasan penolakan wajib jelas & spesifik.</strong>
                    </div>
                  </div>
                  <CampaignSummary c={modal.campaign} t={t} />
                  <div style={{ marginTop: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: t.textPrimary, marginBottom: 8 }}>
                      Alasan Penolakan <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                      placeholder="Contoh: Dokumen identitas tidak jelas. Mohon upload ulang."
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
                    <button onClick={() => handleReject(modal.campaign)}
                      disabled={submitting || rejectReason.trim().length < 10}
                      style={primaryBtnStyle('#EF4444', '#DC2626', submitting || rejectReason.trim().length < 10)}>
                      {submitting ? 'Memproses...' : '✗ Tolak'}
                    </button>
                  </div>
                </>
              )}

              {modal.type === 'detail' && (
                <>
                  <CampaignDetail c={modal.campaign} t={t} />
                  <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
                    <a href={`/fundraising/${modal.campaign.slug}`} target="_blank" rel="noopener noreferrer"
                      style={{
                        flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        padding: '12px 16px', borderRadius: 12,
                        background: t.navHover, color: t.textPrimary,
                        fontSize: 13, fontWeight: 600, textDecoration: 'none',
                      }}>
                      Lihat di Publik →
                    </a>
                    {modal.campaign.status === 'pending_review' && (
                      <>
                        <button onClick={() => setModal({ type: 'reject', campaign: modal.campaign })}
                          style={{
                            flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none',
                            background: 'rgba(239,68,68,0.1)', color: '#EF4444',
                            fontWeight: 600, fontSize: 13, cursor: 'pointer',
                          }}>
                          ✗ Tolak
                        </button>
                        <button onClick={() => setModal({ type: 'approve', campaign: modal.campaign })}
                          style={{
                            flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none',
                            background: 'rgba(16,185,129,0.1)', color: '#10B981',
                            fontWeight: 600, fontSize: 13, cursor: 'pointer',
                          }}>
                          ✓ Approve
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

      {/* M4-C: Fraud Flags List Modal */}
      <FraudFlagsListModal
        open={fraudModal.open}
        targetType="campaign"
        targetId={fraudModal.campaignId}
        targetName={fraudModal.campaignTitle}
        onClose={() => setFraudModal({ open: false, campaignId: null, campaignTitle: '' })}
        onFlagResolved={() => {
          fetchCampaigns();
          fetchStatusCounts();
          setSubNavRefresh(r => r + 1);
        }}
      />

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

const CATEGORY_LABEL: Record<string, string> = {
  kesehatan: 'Kesehatan', bencana: 'Bencana', duka: 'Duka',
  anak_yatim: 'Anak Yatim', lansia: 'Lansia', hunian_darurat: 'Hunian Darurat',
};

function CampaignSummary({ c, t }: { c: Campaign; t: any }) {
  return (
    <div style={{ background: t.navHover, borderRadius: 12, padding: 14 }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>{c.title}</p>
      <p style={{ fontSize: 11, color: t.textDim, marginBottom: 10 }}>
        untuk {c.beneficiary_name} · {CATEGORY_LABEL[c.category] ?? c.category}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
        <div>
          <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Target</p>
          <p style={{ fontWeight: 700, color: t.textPrimary }}>{shortRupiah(c.target_amount)}</p>
        </div>
        <div>
          <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Partner</p>
          <p style={{ fontWeight: 700, color: t.textPrimary }}>{c.partner_name}</p>
        </div>
      </div>
    </div>
  );
}

function CampaignDetail({ c, t }: { c: Campaign; t: any }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {c.cover_image_url && (
        <img src={c.cover_image_url} alt={c.title} style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 12 }} />
      )}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: t.textPrimary, marginBottom: 4, lineHeight: 1.3 }}>{c.title}</h2>
        <p style={{ fontSize: 13, color: t.textDim }}>
          untuk <strong style={{ color: t.textPrimary }}>{c.beneficiary_name}</strong>
          {c.beneficiary_relation && ` (${c.beneficiary_relation})`}
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <div style={{ background: t.navHover, borderRadius: 10, padding: 12 }}>
          <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Target</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>{shortRupiah(c.target_amount)}</p>
        </div>
        <div style={{ background: 'rgba(236,72,153,0.08)', borderRadius: 10, padding: 12 }}>
          <p style={{ fontSize: 10, color: '#EC4899', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Terkumpul</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#BE185D' }}>{shortRupiah(c.collected_amount)}</p>
        </div>
        <div style={{ background: t.navHover, borderRadius: 10, padding: 12 }}>
          <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Donatur</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>{c.donor_count ?? 0}</p>
        </div>
      </div>
      {c.partner_name && (
        <div style={{ background: t.navHover, borderRadius: 12, padding: 14 }}>
          <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
            Partner Komunitas
          </p>
          <p style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>{c.partner_name}</p>
          <div style={{ fontSize: 12, color: t.textDim, marginTop: 4 }}>
            {c.bank_name && <p>{c.bank_name} · <span style={{ fontFamily: 'monospace' }}>{c.bank_account_number}</span></p>}
            {c.bank_account_name && <p>a.n. {c.bank_account_name}</p>}
          </div>
        </div>
      )}
      {c.description && (
        <div>
          <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Deskripsi</p>
          <p style={{ fontSize: 13, color: t.textPrimary, whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 192, overflowY: 'auto' }}>
            {c.description}
          </p>
        </div>
      )}

      {/* ⭐ Sprint 2.2: Beneficiary Phone & Type (RAHASIA — admin only) */}
      {c.beneficiary_phone && (
        <div style={{
          padding: 14, borderRadius: 12,
          background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.2)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ fontSize: 10, color: '#A855F7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              📞 Kontak Penerima Manfaat
            </p>
            <span style={{
              fontSize: 9, fontWeight: 700, color: '#EF4444',
              background: 'rgba(239,68,68,0.1)', padding: '3px 7px', borderRadius: 6,
              letterSpacing: '0.5px',
            }}>
              RAHASIA
            </span>
          </div>

          {/* Tipe Beneficiary */}
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, marginBottom: 4 }}>
              Tipe Penerima
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: t.navHover }}>
              <span style={{ fontSize: 14 }}>
                {c.beneficiary_type === 'individu' && '👤'}
                {c.beneficiary_type === 'keluarga' && '🏠'}
                {c.beneficiary_type === 'kelompok' && '👥'}
                {!c.beneficiary_type && '👤'}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, textTransform: 'capitalize' }}>
                {c.beneficiary_type ?? 'individu'}
              </span>
              {c.beneficiary_type === 'kelompok' && c.beneficiary_count && c.beneficiary_count > 1 && (
                <span style={{ fontSize: 11, color: t.textDim, marginLeft: 4 }}>
                  ({c.beneficiary_count} orang/KK)
                </span>
              )}
            </div>
          </div>

          {/* Phone clickable */}
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, marginBottom: 4 }}>
              {c.beneficiary_phone_owner === 'self' && 'Nomor HP Penerima'}
              {c.beneficiary_phone_owner === 'wali' && 'Nomor HP Wali/Penanggung Jawab'}
              {c.beneficiary_phone_owner === 'coordinator' && 'Nomor HP Koordinator'}
              {!c.beneficiary_phone_owner && 'Nomor HP'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, fontFamily: 'monospace' }}>
                {c.beneficiary_phone}
              </p>
              <a
                href={`https://wa.me/${c.beneficiary_phone.replace(/[^\d]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 11, fontWeight: 700, color: '#fff',
                  background: '#25D366', padding: '5px 12px', borderRadius: 8,
                  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
                }}
              >
                💬 Verify via WA
              </a>
              <a
                href={`tel:+${c.beneficiary_phone.replace(/[^\d]/g, '')}`}
                style={{
                  fontSize: 11, fontWeight: 700, color: '#fff',
                  background: '#3B82F6', padding: '5px 12px', borderRadius: 8,
                  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
                }}
              >
                📞 Call
              </a>
            </div>
          </div>

          {/* Owner name (kalau bukan self) */}
          {c.beneficiary_phone_owner && c.beneficiary_phone_owner !== 'self' && c.beneficiary_phone_owner_name && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, marginBottom: 4 }}>
                Nama Pemilik HP
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>
                {c.beneficiary_phone_owner_name}
              </p>
            </div>
          )}

          {/* Verification Checklist */}
          <div style={{
            marginTop: 12, padding: 10, borderRadius: 8,
            background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)',
          }}>
            <p style={{ fontSize: 10, color: '#D97706', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
              ⚠️ Checklist Verifikasi Admin
            </p>
            <div style={{ fontSize: 11, color: t.textPrimary, lineHeight: 1.7 }}>
              <p>☐ KTP/KK cocok dengan nama penerima</p>
              <p>☐ Sudah hubungi via WA/Call ke nomor di atas</p>
              <p>☐ Penerima/wali/koordinator konfirmasi mengetahui kampanye</p>
              <p>☐ Cerita masuk akal &amp; konsisten dengan dokumen</p>
              <p>☐ Dokumen pendukung lengkap &amp; valid</p>
            </div>
          </div>
        </div>
      )}

      {/* ⭐ FIX-E-4-B: Beneficiary KTP (RAHASIA — admin only) */}
      {c.beneficiary_id_documents && c.beneficiary_id_documents.length > 0 && (
        <div style={{
          padding: 14, borderRadius: 12,
          background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <p style={{ fontSize: 10, color: '#3B82F6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🔒 Identitas Penerima Manfaat ({c.beneficiary_id_documents.length})
            </p>
            <span style={{
              fontSize: 9, fontWeight: 700, color: '#EF4444',
              background: 'rgba(239,68,68,0.1)', padding: '3px 7px', borderRadius: 6,
              letterSpacing: '0.5px',
            }}>
              RAHASIA
            </span>
          </div>
          <p style={{ fontSize: 11, color: t.textMuted, marginBottom: 8, fontStyle: 'italic' }}>
            Hanya terlihat oleh admin. Tidak ditampilkan ke publik.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {c.beneficiary_id_documents.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                style={{
                  aspectRatio: '1', background: t.navHover, borderRadius: 10, overflow: 'hidden',
                  border: `1px solid ${t.sidebarBorder}`, display: 'block',
                }}>
                <img src={url} alt={`KTP ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </a>
            ))}
          </div>
        </div>
      )}

      {c.proof_documents && c.proof_documents.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>
              Dokumen Pendukung ({c.proof_documents.length})
            </p>
            <span style={{
              fontSize: 9, fontWeight: 700, color: '#10B981',
              background: 'rgba(16,185,129,0.1)', padding: '3px 7px', borderRadius: 6,
              letterSpacing: '0.5px',
            }}>
              PUBLIK
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {c.proof_documents.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                style={{ aspectRatio: '1', background: t.navHover, borderRadius: 10, overflow: 'hidden' }}>
                <img src={url} alt={`Dokumen ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
