'use client';

import Link from 'next/link';
import React, { useEffect, useState, useCallback, useContext, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

import CommandCenterTabs from '@/components/admin/funding/CommandCenterTabs';
import {
  Inbox, PauseCircle, XOctagon, CheckCheck, AlertCircle,
  Clock, CheckCircle2, XCircle, ArrowRight, Eye,
  BarChart3, Calendar,
} from 'lucide-react';
import DonationSmartViewsPills, {
  type DonationSmartViewKey, type DonationSmartViewCounts,
} from '@/components/admin/funding/DonationSmartViewsPills';
import DonationsTable, { type Donation } from '@/components/admin/funding/DonationsTable';
import Pagination from '@/components/admin/funding/Pagination';
import DonationsAdvancedFiltersDrawer, {
  type DonationFiltersState, EMPTY_DONATION_FILTERS, countActiveDonationFilters,
} from '@/components/admin/funding/DonationsAdvancedFiltersDrawer';
import DonationsBulkActionsToolbar from '@/components/admin/funding/DonationsBulkActionsToolbar';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// ── Icons ─────────────────────────────────────────
const Icons = {
  Search:      () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  X:           () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  ChevronDown: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  Filter:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Shield:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
  Alert:       () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

// ⭐ Sesi 13 Mission 2N: Filosofi Cash Flow Real
// "Semua" = valid only (exclude rejected)
// "Rejected" = pill terpisah, visual distinct
const STATUS_TABS = [
  { key: 'pending',     label: 'Pending',     separated: false },
  { key: 'verified',    label: 'Verified',    separated: false },
  { key: 'under_audit', label: 'Tahan Audit', separated: false },
  { key: 'all',         label: 'Semua',       separated: false },
  { key: 'rejected',    label: 'Rejected',    separated: true  }, // visual terpisah
];

const SORT_OPTIONS = [
  { key: 'newest',      label: 'Terbaru' },
  { key: 'oldest',      label: 'Terlama' },
  { key: 'amount_high', label: 'Nominal Tertinggi' },
  { key: 'amount_low',  label: 'Nominal Terendah' },
  { key: 'donor_az',    label: 'Donor A-Z' },
];

// ⭐ Sesi 13 Mission 2M: Date range filter
type DateRangePreset = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

const DATE_PRESET_OPTIONS: { key: DateRangePreset; label: string }[] = [
  { key: 'all',   label: 'Semua' },
  { key: 'today', label: 'Hari Ini' },
  { key: 'week',  label: 'Minggu Ini' },
  { key: 'month', label: 'Bulan Ini' },
  { key: 'year',  label: 'Tahun Ini' },
];

function isoAtDayStart(d: Date): string {
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return startOfDay.toISOString();
}

function getDateRangeFromPreset(preset: DateRangePreset): { from: string | null; to: string | null } {
  const now = new Date();
  switch (preset) {
    case 'today': {
      return { from: isoAtDayStart(now), to: null };
    }
    case 'week': {
      // Senin minggu ini sebagai start (locale Indonesia)
      const day = now.getDay(); // 0=Minggu, 1=Senin, ...
      const diff = day === 0 ? 6 : day - 1; // diff dari Senin
      const monday = new Date(now);
      monday.setDate(now.getDate() - diff);
      return { from: isoAtDayStart(monday), to: null };
    }
    case 'month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: isoAtDayStart(from), to: null };
    }
    case 'year': {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from: isoAtDayStart(from), to: null };
    }
    case 'all':
    default:
      return { from: null, to: null };
  }
}

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
  // ⭐ Sprint 2.3 Phase 3a: Accrual breakdown (5 metrics including under_audit)
  const [accrualStats, setAccrualStats] = useState({
    accrualAmount: 0,    accrualCount: 0,    // Total semua donations (verified + pending + rejected + under_audit)
    pendingAmount: 0,    pendingCount: 0,    // Donations menunggu verifikasi penggalang
    underAuditAmount: 0, underAuditCount: 0, // ⭐ Sesi 13 Mission 2J: Donations tahan audit (escalated)
    rejectedAmount: 0,   rejectedCount: 0,   // Donations ditolak
    aktualAmount: 0,     aktualCount: 0,     // = accrual − pending − under_audit − rejected (verified saja)
  });
  const [smartViewCounts, setSmartViewCounts] = useState<DonationSmartViewCounts | null>(null);
  const [subNavRefresh, setSubNavRefresh] = useState(0);

  // ⭐ Sesi 13 Mission 2M: Date range preset filter
  const [datePreset, setDatePreset] = useState<DateRangePreset>('all');

  const dateRange = useMemo(() => {
    if (datePreset === 'custom') {
      return {
        from: activeFilters.dateFrom || null,
        to: activeFilters.dateTo || null,
      };
    }
    return getDateRangeFromPreset(datePreset);
  }, [datePreset, activeFilters.dateFrom, activeFilters.dateTo]);

  const [searchInput, setSearchInput] = useState(urlSearch);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [modal, setModal] = useState<{ type: 'verify' | 'reject' | 'detail' | 'addNote'; donation: Donation } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
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
    // ⭐ Sesi 13 Mission 2N: "Semua" = valid only (exclude rejected)
    if (activeStatus === 'all') {
      params.set('status', 'valid');
    } else if (activeStatus) {
      params.set('status', activeStatus);
    }
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
    // ⭐ Sesi 13 Mission 2N: "Semua" = valid only (exclude rejected)
    if (activeStatus === 'all') {
      params.set('status', 'valid');
    } else if (activeStatus) {
      params.set('status', activeStatus);
    }
    if (activeSmartView) params.set('sv', activeSmartView);
    if (urlSearch) params.set('q', urlSearch);
    if (activeFilters.amountMin) params.set('amount_min', activeFilters.amountMin);
    if (activeFilters.amountMax) params.set('amount_max', activeFilters.amountMax);
    if (activeFilters.anonFilter) params.set('anon', activeFilters.anonFilter);
    // ⭐ Mission 2M: dateRange (dari preset atau custom) takes priority
    if (dateRange.from) params.set('from', dateRange.from);
    if (dateRange.to) params.set('to', dateRange.to);

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
  }, [activeStatus, activeSmartView, activeSort, urlSearch, urlPage, urlLimit, activeFilters, dateRange]);

  const fetchStatusCounts = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    // ⭐ Sesi 13 Mission 2J: Include under_audit
    // ⭐ Mission 2M: respect date filter
    const statuses = ['pending', 'verified', 'rejected', 'under_audit'];
    const dateQs = [
      dateRange.from ? `&from=${encodeURIComponent(dateRange.from)}` : '',
      dateRange.to ? `&to=${encodeURIComponent(dateRange.to)}` : '',
    ].join('');
    const results = await Promise.all(
      statuses.map(s =>
        fetch(`${API_URL}/funding/admin/donations?status=${s}&limit=1${dateQs}`, {
          headers: { Authorization: `Bearer ${tk}` },
        }).then(r => r.json()).catch(() => null)
      )
    );
    const next: Record<string, number> = {};
    statuses.forEach((s, i) => { next[s] = results[i]?.meta?.total ?? 0; });
    setStatusCounts(next);
  }, [dateRange]);

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

  // ⭐ Sprint 2.3 Phase 3a: Fetch accrual breakdown (sum amount per status)
  const fetchAccrualStats = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    try {
      // Fetch each status with high limit untuk dapat semua amount
      // ⭐ Sesi 13 Mission 2J: Include under_audit
      // ⭐ Mission 2M: respect date filter
      const statuses = ['pending', 'verified', 'rejected', 'under_audit'];
      const dateQs = [
        dateRange.from ? `&from=${encodeURIComponent(dateRange.from)}` : '',
        dateRange.to ? `&to=${encodeURIComponent(dateRange.to)}` : '',
      ].join('');
      const results = await Promise.all(
        statuses.map(s =>
          fetch(`${API_URL}/funding/admin/donations?status=${s}&limit=1000${dateQs}`, {
            headers: { Authorization: `Bearer ${tk}` },
          }).then(r => r.json()).catch(() => null)
        )
      );

      // Sum amount per status
      const sumByStatus = (data: any[] | undefined) => {
        if (!Array.isArray(data)) return 0;
        return data.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
      };

      const pendingData = results[0]?.data ?? [];
      const verifiedData = results[1]?.data ?? [];
      const rejectedData = results[2]?.data ?? [];
      const underAuditData = results[3]?.data ?? [];

      const pendingAmount = sumByStatus(pendingData);
      const aktualAmount = sumByStatus(verifiedData);
      const rejectedAmount = sumByStatus(rejectedData);
      const underAuditAmount = sumByStatus(underAuditData);
      // ⭐ Mission 2N: Filosofi Cash Flow Real LOCKED
      // Total Tercatat = pending + verified + under_audit (EXCLUDE rejected)
      // Rejected = riwayat terpisah, tidak masuk hitungan
      const accrualAmount = pendingAmount + aktualAmount + underAuditAmount;

      const pendingCount = results[0]?.meta?.total ?? 0;
      const aktualCount = results[1]?.meta?.total ?? 0;
      const rejectedCount = results[2]?.meta?.total ?? 0;
      const underAuditCount = results[3]?.meta?.total ?? 0;
      const accrualCount = pendingCount + aktualCount + underAuditCount;

      setAccrualStats({
        accrualAmount, accrualCount,
        pendingAmount, pendingCount,
        underAuditAmount, underAuditCount,
        rejectedAmount, rejectedCount,
        aktualAmount, aktualCount,
      });
    } catch (err) {
      console.error('Fetch accrual stats failed:', err);
    }
  }, [dateRange]);

  useEffect(() => { fetchDonations(); }, [fetchDonations]);
  useEffect(() => {
    fetchStatusCounts();
    fetchSmartViewCounts();
    fetchAccrualStats();  // ⭐ Sprint 2.3 Phase 3a
  }, [fetchStatusCounts, fetchSmartViewCounts, fetchAccrualStats]);

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
      if (!res.ok || !json.success) {
        // [REMEDIASI-02C3] Donasi selisih → quick-verify tak punya picker; arahkan ke detail
        if (json?.error?.code === 'DECISION_REQUIRED') {
          setModal(null);
          showToast(false, `Donasi ${d.donation_code} selisih nominal — buka detail untuk pilih keputusan`);
          router.push(`/admin/funding/donations/${d.id}`);
          return;
        }
        throw new Error(json?.error?.message ?? 'Gagal verify');
      }
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

  // ⭐ Sesi 13 Mission 2H: Chat WA Donor / Partner (log + open WhatsApp)
  async function handleChatWA(target: 'donor' | 'partner', d: any) {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    
    const phone = target === 'donor' ? d.donor_phone : d.partner_phone;
    if (!phone) {
      showToast(false, `Nomor WA ${target === 'donor' ? 'donor' : 'penggalang'} tidak tersedia`);
      return;
    }
    
    // Empatic message — penggalang mungkin di daerah 3T
    const greeting = target === 'partner' 
      ? `Halo Penggalang ${d.campaigns?.partner_name || ''}, ini admin TeraLoka. Kami ingin konfirmasi donasi *${d.donation_code}* (${shortRupiah(d.amount)}) dari donor *${d.donor_name}*. Mungkin lagi di lokasi sulit sinyal? Mohon balas kalau sempat, terima kasih atas dedikasinya 🙏`
      : `Halo *${d.donor_name}*, ini admin TeraLoka. Kami ingin verify donasi *${d.donation_code}* (${shortRupiah(d.amount)}) yang Anda kirim. Bisa konfirmasi transfer sudah berhasil? Terima kasih 🙏`;
    
    const waUrl = `https://wa.me/${normalizeWaNumber(phone)}?text=${encodeURIComponent(greeting)}`;
    window.open(waUrl, '_blank');
    
    // Log action ke backend (non-blocking)
    fetch(`${API_URL}/funding/admin/donations/${d.id}/view`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_taken: target === 'donor' ? 'wa_donor' : 'wa_partner' }),
    }).catch(() => {});
    
    showToast(true, `📱 Chat WA ke ${target === 'donor' ? 'donor' : 'penggalang'} terbuka`);
  }

  // ⭐ Sesi 13 Mission 2H: Tambah catatan admin
  async function handleAddNote(d: Donation) {
    if (adminNote.trim().length < 3) {
      showToast(false, 'Catatan minimal 3 karakter');
      return;
    }
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/funding/admin/donations/${d.id}/view`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_taken: 'note', notes: adminNote.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Gagal simpan');
      showToast(true, '📝 Catatan tersimpan');
      setAdminNote('');
      setModal({ type: 'detail', donation: d });  // back to detail
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

      <CommandCenterTabs active="donations" refreshKey={subNavRefresh} />

      {/* ⭐ Sesi 13 Mission 2M: Date Range Preset Pills */}
      <div style={{ 
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        marginBottom: 16, paddingBottom: 4,
      }}>
        <span style={{ 
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 11, fontWeight: 700, color: t.textMuted, 
          textTransform: 'uppercase', letterSpacing: '0.06em',
          marginRight: 4,
        }}>
          <Calendar size={13} strokeWidth={2.5} />
          Periode:
        </span>
        {DATE_PRESET_OPTIONS.map(opt => {
          const active = datePreset === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => setDatePreset(opt.key)}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                border: `1px solid ${active ? '#3B82F6' : t.sidebarBorder}`,
                background: active ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: active ? '#3B82F6' : t.textDim,
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          );
        })}
        {/* Active range indicator */}
        {dateRange.from && (
          <span style={{ 
            fontSize: 11, color: t.textDim, fontStyle: 'italic',
            marginLeft: 'auto',
          }}>
            sejak {new Date(dateRange.from).toLocaleDateString('id-ID', { 
              day: 'numeric', month: 'short', year: 'numeric' 
            })}
          </span>
        )}
      </div>

      {/* ⭐ Sprint 2.3 Phase 3a: Accrual Breakdown — formula visual */}
      <div style={{
        background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
        borderRadius: 12, padding: 16, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ 
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 700, color: t.textMuted, 
            textTransform: 'uppercase', letterSpacing: '0.06em',
            margin: 0,
          }}>
            <BarChart3 size={13} strokeWidth={2.5} />
            Rekonsiliasi Donasi
          </p>
          <p style={{ fontSize: 10, color: t.textDim, fontStyle: 'italic' }}>
            Rumus: Dana Donasi = Total Tercatat − Pending − Tahan Audit
          </p>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 10,
        }}>
          <AccrualCard
            label="TOTAL TERCATAT"
            sublabel="Donasi valid masuk sistem"
            amount={accrualStats.accrualAmount}
            count={accrualStats.accrualCount}
            color="#3B82F6"
            t={t}
            href="/admin/funding/donations?status=all"
            Icon={Inbox}
          />
          <AccrualCard
            label="PENDING"
            sublabel="Menunggu verifikasi penggalang"
            amount={accrualStats.pendingAmount}
            count={accrualStats.pendingCount}
            color="#F59E0B"
            t={t}
            operator="−"
            href="/admin/funding/donations?status=pending"
            Icon={PauseCircle}
          />
          <AccrualCard
            label="TAHAN AUDIT"
            sublabel="Belum tercatat (escalated admin)"
            amount={accrualStats.underAuditAmount}
            count={accrualStats.underAuditCount}
            color="#8B5CF6"
            t={t}
            operator="−"
            href="/admin/funding/donations?status=under_audit"
            Icon={AlertCircle}
          />
          <AccrualCard
            label="DANA DONASI"
            sublabel="Donasi valid terverifikasi"
            amount={accrualStats.aktualAmount}
            count={accrualStats.aktualCount}
            color="#10B981"
            t={t}
            operator="="
            highlight
            href="/admin/funding/donations?status=verified"
            Icon={CheckCheck}
          />
        </div>

        {/* ⭐ Mission 2N: Riwayat Ditolak terpisah (Filosofi Cash Flow Real) */}
        {accrualStats.rejectedCount > 0 && (
          <Link 
            href="/admin/funding/donations?status=rejected" 
            style={{ textDecoration: 'none', display: 'block', marginTop: 12 }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'rgba(239,68,68,0.05)',
              border: '1px dashed rgba(239,68,68,0.3)',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <XOctagon size={14} style={{ color: '#EF4444', opacity: 0.7 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Riwayat Ditolak
                </span>
                <span style={{ fontSize: 11, color: t.textDim }}>
                  {accrualStats.rejectedCount} transaksi · {shortRupiah(accrualStats.rejectedAmount)}
                </span>
                <span style={{ fontSize: 10, color: t.textMuted, fontStyle: 'italic' }}>
                  · tidak masuk hitungan
                </span>
              </div>
              <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>
                Lihat →
              </span>
            </div>
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12, marginBottom: 24,
      }}>
        <StatCard
          label="Pending Total"
          value={stats.pending}
          color="#F59E0B"
          t={t}
          href="/admin/funding/donations?status=pending"
          Icon={Clock}
        />
        <StatCard
          label="Pending >24 Jam"
          value={stats.pendingOver24h}
          color="#EF4444"
          t={t}
          alert={stats.pendingOver24h > 0}
          href="/admin/funding/donations?sv=verify_urgent"
          Icon={AlertCircle}
        />
        <StatCard
          label="Verified Hari Ini"
          value={stats.verifiedToday}
          color="#10B981"
          t={t}
          href="/admin/funding/donations?status=verified"
          Icon={CheckCircle2}
        />
        <StatCard
          label="Rejected Hari Ini"
          value={stats.rejectedToday}
          color="#6B7280"
          t={t}
          href="/admin/funding/donations?status=rejected"
          Icon={XCircle}
        />
      </div>

      {/* Status Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', alignItems: 'center' }}>
        {STATUS_TABS.map((tab, idx) => {
          const active = activeStatus === tab.key;
          // ⭐ Mission 2N: "Semua" count = valid only (exclude rejected)
          const count = tab.key === 'all'
            ? (statusCounts.pending ?? 0) + (statusCounts.verified ?? 0) + (statusCounts.under_audit ?? 0)
            : (statusCounts[tab.key] ?? 0);
          const isRejected = tab.key === 'rejected';
          
          return (
            <React.Fragment key={tab.key}>
              {/* ⭐ Mission 2N: Visual separator sebelum Rejected (terpisah dari valid statuses) */}
              {tab.separated && (
                <span style={{ 
                  color: t.textMuted, 
                  fontSize: 14, 
                  margin: '0 4px',
                  userSelect: 'none',
                }}>·</span>
              )}
              <button onClick={() => switchStatus(tab.key)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px', borderRadius: 10,
                  fontSize: 13, fontWeight: 600,
                  color: active 
                    ? '#fff' 
                    : (isRejected ? t.textDim : t.textPrimary),
                  background: active 
                    ? (isRejected ? '#7F1D1D' : '#1F2937')
                    : (isRejected ? 'rgba(239,68,68,0.04)' : t.mainBg),
                  border: `1px ${isRejected ? 'dashed' : 'solid'} ${active 
                    ? (isRejected ? '#7F1D1D' : '#1F2937')
                    : (isRejected ? 'rgba(239,68,68,0.3)' : t.sidebarBorder)}`,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  opacity: isRejected && !active ? 0.85 : 1,
                }}>
                {tab.label}
                <span style={{
                  background: active 
                    ? 'rgba(255,255,255,0.2)' 
                    : (tab.key === 'pending' && count > 0 
                        ? 'rgba(245,158,11,0.15)' 
                        : (isRejected ? 'rgba(239,68,68,0.15)' : t.navHover)),
                  color: active 
                    ? '#fff' 
                    : (tab.key === 'pending' && count > 0 
                        ? '#F59E0B' 
                        : (isRejected ? '#EF4444' : t.textDim)),
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                }}>
                  {count}
                </span>
              </button>
            </React.Fragment>
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
                {modal.type === 'addNote' && '📝 Tambah Catatan Admin'}
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
                  
                  {/* ⭐ Sesi 13 Mission 2G + 2H: Empathic workflow panel untuk under_audit */}
                  {modal.donation.verification_status === 'under_audit' && (
                    <UnderAuditActionPanel 
                      donation={modal.donation as any}
                      t={t}
                      onChatDonor={() => handleChatWA('donor', modal.donation as any)}
                      onChatPartner={() => handleChatWA('partner', modal.donation as any)}
                      onAddNote={() => setModal({ type: 'addNote', donation: modal.donation })}
                    />
                  )}
                  
                  {/* ⭐ Mission 2G: Action buttons — sekarang juga muncul untuk under_audit */}
                  <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
                    {(modal.donation.verification_status === 'pending' || 
                      modal.donation.verification_status === 'under_audit') && (
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
                          {modal.donation.verification_status === 'under_audit' ? '✓ Verify Manual' : '✓ Verify'}
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}

              {/* ⭐ Sesi 13 Mission 2H: Add Note modal */}
              {modal.type === 'addNote' && (
                <>
                  <div style={{
                    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)',
                    borderRadius: 12, padding: 14, marginBottom: 16,
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: '#6366F1', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      fontSize: 14,
                    }}>📝</div>
                    <div style={{ fontSize: 12, color: '#4F46E5', lineHeight: 1.5 }}>
                      <strong>Catatan visible untuk admin lain.</strong> Bantu tim koordinasi resolusi donasi ini.
                    </div>
                  </div>
                  <DonationSummary d={modal.donation} t={t} />
                  <div style={{ marginTop: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: t.textPrimary, marginBottom: 8 }}>
                      Catatan <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)}
                      placeholder="Contoh: Sudah Chat WA donor, bukti transfer asli. Tunggu konfirmasi penggalang Senin depan."
                      rows={4} maxLength={500} disabled={submitting}
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: 12,
                        border: `1px solid ${t.sidebarBorder}`, background: t.mainBg,
                        color: t.textPrimary, fontSize: 13, resize: 'none',
                        fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                      }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      <p style={{ fontSize: 11, color: t.textMuted }}>Minimal 3 karakter.</p>
                      <p style={{ fontSize: 11, color: t.textMuted }}>{adminNote.length}/500</p>
                    </div>
                  </div>
                  <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                    <button onClick={() => { setModal({ type: 'detail', donation: modal.donation }); setAdminNote(''); }} 
                      disabled={submitting} style={cancelBtnStyle(t)}>Batal</button>
                    <button onClick={() => handleAddNote(modal.donation)}
                      disabled={submitting || adminNote.trim().length < 3}
                      style={primaryBtnStyle('#6366F1', '#4F46E5', submitting || adminNote.trim().length < 3)}>
                      {submitting ? 'Menyimpan...' : '📝 Simpan'}
                    </button>
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

function normalizeWaNumber(phone: string): string {
  // Normalize Indonesian phone → wa.me format (no +)
  // 081234567890 → 6281234567890
  // +6281234567890 → 6281234567890
  // 6281234567890 → 6281234567890
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) return '62' + cleaned.slice(1);
  if (cleaned.startsWith('62')) return cleaned;
  return cleaned;
}

function shortRupiah(n: number): string {
  // Long format (full precision) — for financial verification context.
  return 'Rp ' + (n ?? 0).toLocaleString('id-ID');
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

// v2.0 (24 Mei 2026): Clickable + Lucide premium icon
function StatCard({ label, value, color, t, alert, href, Icon }: {
  label: string; value: number; color: string; t: any; alert?: boolean;
  href?: string; Icon?: any;
}) {
  const cardContent = (
    <div style={{
      background: alert ? 'rgba(239,68,68,0.08)' : t.mainBg,
      border: `1px solid ${alert ? 'rgba(239,68,68,0.3)' : t.sidebarBorder}`,
      borderRadius: 12,
      padding: 14,
      cursor: href ? 'pointer' : 'default',
      transition: 'all 200ms',
      height: '100%',
      position: 'relative',
    }}
    className={href ? 'stat-card-hover-v2' : ''}
    >
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 6,
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {Icon && (
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: alert ? 'rgba(239,68,68,0.15)' : `${color}18`,
              color: alert ? '#EF4444' : color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={13} strokeWidth={2.4} />
            </div>
          )}
          <p style={{
            fontSize: 11, fontWeight: 700,
            color: alert ? '#EF4444' : t.textMuted,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {label}
          </p>
        </div>
        {href && value > 0 && (
          <Eye size={11} color={t.textMuted} strokeWidth={2.2} />
        )}
      </div>
      <p style={{ fontSize: 24, fontWeight: 800, color }}>{value}</p>
      {href && value > 0 && (
        <p style={{
          fontSize: 10, color, fontWeight: 600, marginTop: 4,
          display: 'inline-flex', alignItems: 'center', gap: 2,
        }}>
          Lihat semua <ArrowRight size={10} strokeWidth={2.5} />
        </p>
      )}

      <style jsx>{`
        :global(.stat-card-hover-v2):hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
          border-color: ${alert ? 'rgba(239,68,68,0.5)' : color + '50'} !important;
        }
      `}</style>
    </div>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: 'none' }}>
        {cardContent}
      </Link>
    );
  }
  return cardContent;
}

// ⭐ Sprint 2.3 Phase 3a: AccrualCard — for donation rekonsiliasi (4 cards)
// v2.0 (24 Mei 2026): Clickable navigation + Lucide premium icon + hover lift
function AccrualCard({ label, sublabel, amount, count, color, t, operator, highlight, href, Icon }: {
  label: string; sublabel: string; amount: number; count: number;
  color: string; t: any; operator?: string; highlight?: boolean;
  href?: string; Icon?: any;
}) {
  const cardContent = (
    <div style={{
      position: 'relative',
      background: highlight ? `${color}10` : t.navHover,
      border: `2px solid ${highlight ? color : 'transparent'}`,
      borderRadius: 12,
      padding: 12,
      cursor: href ? 'pointer' : 'default',
      transition: 'all 200ms',
      height: '100%',
    }}
    className={href ? 'accrual-card-hover' : ''}
    >
      {operator && (
        <span style={{
          position: 'absolute', top: -10, left: 12,
          background: t.mainBg, color, fontSize: 16, fontWeight: 800,
          width: 24, height: 24, borderRadius: '50%',
          border: `2px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {operator}
        </span>
      )}

      {/* Header row: Icon + Label + Action indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 2, marginTop: operator ? 6 : 0,
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {Icon && (
            <div style={{
              width: 20, height: 20, borderRadius: 5,
              background: `${color}20`, color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={12} strokeWidth={2.4} />
            </div>
          )}
          <p style={{
            fontSize: 10, fontWeight: 700, color,
            letterSpacing: '0.04em',
          }}>
            {label}
          </p>
        </div>
        {href && (
          <Eye size={11} color={t.textMuted} strokeWidth={2.2} />
        )}
      </div>

      <p style={{ fontSize: 9, color: t.textDim, marginBottom: 8 }}>
        {sublabel}
      </p>
      <p style={{ fontSize: 18, fontWeight: 800, color: t.textPrimary, lineHeight: 1.1 }}>
        {shortRupiah(amount)}
      </p>
      <p style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>
        {count} transaksi
        {href && count > 0 && (
          <span style={{
            color, fontWeight: 600, marginLeft: 6,
            display: 'inline-flex', alignItems: 'center', gap: 2,
          }}>
            · Lihat semua <ArrowRight size={10} strokeWidth={2.5} />
          </span>
        )}
      </p>

      <style jsx>{`
        :global(.accrual-card-hover):hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
          border-color: ${color}40 !important;
        }
      `}</style>
    </div>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: 'none' }}>
        {cardContent}
      </Link>
    );
  }
  return cardContent;
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6 }}>
              <p style={{ fontSize: 12, color: t.textDim, fontFamily: 'monospace' }}>
                {d.donor_phone}
              </p>
              <a
                href={`https://wa.me/${normalizeWaNumber(d.donor_phone)}?text=${encodeURIComponent(
                  `Halo ${d.is_anonymous ? '' : d.donor_name + ' '}—saya admin TeraLoka, mau konfirmasi donasi Rp ${d.amount.toLocaleString('id-ID')} dengan kode ${d.donation_code}. Terima kasih.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: '#25D366', color: '#fff',
                  padding: '6px 10px', borderRadius: 8,
                  fontSize: 11, fontWeight: 700,
                  textDecoration: 'none', whiteSpace: 'nowrap',
                }}
              >
                💬 Chat WA
              </a>
            </div>
          )}
          {d.is_anonymous && (
            <p style={{ fontSize: 10, color: t.textMuted, marginTop: 6, fontStyle: 'italic' }}>
              ℹ️ Nama disembunyikan ke publik. Phone tersedia untuk audit & konfirmasi internal.
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
          {/* ⭐ Sesi 13 Mission 2K: Tip Penggalang + Kode Unik */}
          {(() => {
            const tip = Number((d as any).penggalang_fee) || 0;
            const kodeUnik = Math.max(0, 
              (Number(d.total_transfer) || 0) - 
              (Number(d.amount) || 0) - 
              (Number(d.operational_fee) || 0) - 
              tip
            );
            return (
              <>
                {tip > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#8B5CF6', fontWeight: 600 }}>
                      Tip Penggalang
                    </span>
                    <span style={{ fontSize: 12, color: '#8B5CF6', fontWeight: 700 }}>
                      {shortRupiah(tip)}
                    </span>
                  </div>
                )}
                {kodeUnik > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>
                      Kode Unik <span style={{ fontSize: 9, opacity: 0.7 }}>(cross-check)</span>
                    </span>
                    <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 700 }}>
                      {shortRupiah(kodeUnik)}
                    </span>
                  </div>
                )}
              </>
            );
          })()}
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
            {/* FIX-G-C: Show verifier name + role */}
            {(d as any).verifier && (
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: t.textPrimary, fontWeight: 600 }}>
                  {(d as any).verifier.name || 'Admin'}
                </span>
                <RoleBadgeAdmin role={(d as any).verifier.role} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* FIX-G-C: Escalation indicator + ⭐ Mission 2G: Aging counter */}
      {(d as any).escalated_to_admin_at && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 8,
          padding: 10,
          marginTop: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14 }}>⚡</span>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#B45309', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Auto-Escalated
              </p>
            </div>
            {/* ⭐ Mission 2G: Aging since escalation */}
            {(() => {
              const escalatedAt = new Date((d as any).escalated_to_admin_at).getTime();
              const days = Math.floor((Date.now() - escalatedAt) / (1000 * 60 * 60 * 24));
              const color = days > 14 ? '#DC2626' : days > 7 ? '#F59E0B' : '#92400E';
              return (
                <span style={{ 
                  fontSize: 10, fontWeight: 700, color, 
                  background: 'rgba(255,255,255,0.6)',
                  padding: '2px 8px', borderRadius: 999,
                }}>
                  {days === 0 ? 'hari ini' : `${days} hari lalu`}
                  {days > 14 && ' ⚠️'}
                </span>
              );
            })()}
          </div>
          {(d as any).escalation_reason && (
            <p style={{ fontSize: 11, color: '#92400E', lineHeight: 1.5 }}>
              {(d as any).escalation_reason}
            </p>
          )}
        </div>
      )}

      {/* ⭐ Bukti Transfer — kalau donor sudah upload */}
      {(d as any).transfer_proof_url && (
        <div>
          <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
            Bukti Transfer
          </p>
          <a
            href={(d as any).transfer_proof_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'block', textDecoration: 'none' }}
          >
            <img
              src={(d as any).transfer_proof_url}
              alt="Bukti transfer"
              style={{
                width: '100%',
                maxHeight: 400,
                objectFit: 'contain',
                borderRadius: 12,
                border: `1px solid ${t.sidebarBorder}`,
                background: t.navHover,
                cursor: 'zoom-in',
              }}
            />
            <p style={{ fontSize: 11, color: t.textMuted, marginTop: 6, textAlign: 'center' }}>
              Klik untuk perbesar
            </p>
          </a>
        </div>
      )}

      {/* Status: bukti belum upload */}
      {!(d as any).transfer_proof_url && d.verification_status === 'pending' && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 12,
          padding: 14,
        }}>
          <p style={{ fontSize: 12, color: '#92400E', fontWeight: 600, marginBottom: 4 }}>
            ⚠️ Bukti transfer belum di-upload
          </p>
          <p style={{ fontSize: 11, color: '#B45309', lineHeight: 1.5 }}>
            Donor belum konfirmasi transfer. Cek manual di rekening partner kalau perlu.
          </p>
        </div>
      )}

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

// ═══════════════════════════════════════════════════════════════
// FIX-G-C: RoleBadgeAdmin — visual indicator role admin
// (using inline styles since this page uses theme system, not Tailwind)
// ═══════════════════════════════════════════════════════════════

function RoleBadgeAdmin({ role }: { role: string }) {
  const meta = (() => {
    switch (role) {
      case 'super_admin':
        return { label: 'Super Admin', color: '#7C3AED', bg: '#F3E8FF', icon: '⭐' };
      case 'admin_funding':
        return { label: 'Admin BADONASI', color: '#047857', bg: '#D1FAE5', icon: '🛡️' };
      case 'admin_content':
        return { label: 'Admin Konten', color: '#1D4ED8', bg: '#DBEAFE', icon: '📝' };
      case 'user':
        return { label: 'Penggalang', color: '#4B5563', bg: '#F3F4F6', icon: '👤' };
      default:
        return { label: role, color: '#4B5563', bg: '#F3F4F6', icon: '🔹' };
    }
  })();

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      background: meta.bg,
      color: meta.color,
      fontSize: 9,
      fontWeight: 700,
      padding: '2px 6px',
      borderRadius: 999,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    }}>
      <span style={{ fontSize: 8 }}>{meta.icon}</span>
      {meta.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// ⭐ Sesi 13 Mission 2G + 2H: UnderAuditActionPanel
// Empathic workflow guide untuk donasi tahan audit
// Filosofi: Penggalang mungkin di daerah 3T tanpa sinyal — bukan lalai
// ═══════════════════════════════════════════════════════════════

interface UnderAuditActionPanelProps {
  donation: any;
  t: any;
  onChatDonor: () => void;
  onChatPartner: () => void;
  onAddNote: () => void;
}

function UnderAuditActionPanel({ 
  donation, t, onChatDonor, onChatPartner, onAddNote 
}: UnderAuditActionPanelProps) {
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [loadingLog, setLoadingLog] = useState(false);

  useEffect(() => {
    const tk = localStorage.getItem('tl_token');
    if (!tk || !donation?.id) return;
    setLoadingLog(true);
    fetch(`${API_URL}/funding/admin/donations/${donation.id}/views`, {
      headers: { Authorization: `Bearer ${tk}` },
    })
      .then(r => r.json())
      .then(j => { if (j.success) setActivityLog(j.data || []); })
      .catch(() => {})
      .finally(() => setLoadingLog(false));

    // Auto-log "view" pas pertama buka panel (fire-and-forget)
    fetch(`${API_URL}/funding/admin/donations/${donation.id}/view`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_taken: 'view' }),
    }).catch(() => {});
  }, [donation?.id]);

  const hasDonorPhone = !!donation.donor_phone;
  const hasPartnerPhone = !!donation.partner_phone;
  const partnerName = donation.campaigns?.partner_name || 'penggalang';

  // SLA countdown — info only, GAK auto-reject
  const escalatedAt = donation.escalated_to_admin_at 
    ? new Date(donation.escalated_to_admin_at).getTime() 
    : null;
  const daysSinceEscalation = escalatedAt
    ? Math.floor((Date.now() - escalatedAt) / (1000 * 60 * 60 * 24))
    : 0;
  const SLA_DAYS = 30; // info only — gak auto-reject
  const daysRemaining = SLA_DAYS - daysSinceEscalation;
  const slaUrgency = daysRemaining <= 0 ? 'expired' 
    : daysRemaining <= 7 ? 'urgent' 
    : daysRemaining <= 14 ? 'warning' 
    : 'normal';
  const slaColor = slaUrgency === 'expired' ? '#DC2626'
    : slaUrgency === 'urgent' ? '#EF4444'
    : slaUrgency === 'warning' ? '#F59E0B'
    : '#10B981';

  return (
    <div style={{
      marginTop: 16,
      background: 'rgba(139,92,246,0.08)',
      border: '1px solid rgba(139,92,246,0.3)',
      borderRadius: 12,
      padding: 14,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>⏳</span>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 }}>
          Donasi Tahan Audit — Butuh Resolusi Admin
        </p>
      </div>
      
      {/* SLA countdown — info only */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.06)', borderRadius: 8, padding: '8px 12px',
        marginBottom: 12,
      }}>
        <span style={{ fontSize: 11, color: t.textDim }}>
          Sudah {daysSinceEscalation} hari sejak auto-escalate
        </span>
        <span style={{ 
          fontSize: 11, fontWeight: 700, color: slaColor,
          padding: '2px 8px', borderRadius: 999,
          background: 'rgba(255,255,255,0.6)',
        }}>
          {slaUrgency === 'expired' && '⚠️ SLA terlewat'}
          {slaUrgency === 'urgent' && `🔥 ${daysRemaining} hari lagi`}
          {slaUrgency === 'warning' && `${daysRemaining} hari lagi`}
          {slaUrgency === 'normal' && `${daysRemaining} hari tersisa`}
        </span>
      </div>
      
      {/* Empathic context */}
      <div style={{ 
        background: 'rgba(16,185,129,0.06)', 
        border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: 8, padding: '10px 12px', marginBottom: 12,
      }}>
        <p style={{ fontSize: 11, color: t.textPrimary, lineHeight: 1.6, margin: 0 }}>
          💡 <strong>Sebelum reject:</strong> Penggalang di Maluku Utara sering di daerah 3T tanpa sinyal stabil. 
          Ini bukan kelalaian — sistem fleksibel terhadap kondisi geografis. 
          Coba kontak via WA dulu, bantu admin tracking kondisi penggalang di lapangan.
        </p>
      </div>
      
      {/* Quick Actions */}
      <p style={{ fontSize: 10, color: t.textDim, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>
        Aksi Cepat
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {hasDonorPhone && (
          <button onClick={onChatDonor} style={{
            padding: '10px 12px', borderRadius: 10, border: 'none',
            background: '#25D366', color: '#fff',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            💬 Chat Donor
          </button>
        )}
        {hasPartnerPhone && (
          <button onClick={onChatPartner} style={{
            padding: '10px 12px', borderRadius: 10, border: 'none',
            background: '#128C7E', color: '#fff',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            💬 Chat {partnerName.slice(0, 20)}{partnerName.length > 20 ? '…' : ''}
          </button>
        )}
        {!hasPartnerPhone && (
          <button disabled title="Nomor WA penggalang tidak tersedia" style={{
            padding: '10px 12px', borderRadius: 10, border: 'none',
            background: 'rgba(128,128,128,0.2)', color: t.textMuted,
            fontSize: 11, cursor: 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            WA penggalang N/A
          </button>
        )}
        <button onClick={onAddNote} style={{
          padding: '10px 12px', borderRadius: 10, border: 'none',
          background: 'rgba(99,102,241,0.15)', color: '#6366F1',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          gridColumn: hasDonorPhone && hasPartnerPhone ? 'span 2' : 'auto',
        }}>
          📝 Tambah Catatan
        </button>
      </div>
      
      {/* Decision Tree */}
      <p style={{ fontSize: 10, color: t.textDim, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>
        Panduan Keputusan
      </p>
      <ol style={{ 
        margin: 0, padding: '0 0 0 18px', 
        fontSize: 11, color: t.textDim, lineHeight: 1.8,
      }}>
        <li>
          <strong style={{ color: t.textPrimary }}>Cek bukti transfer</strong> di card bawah — kalau ada, verify rekening partner manual
        </li>
        <li>
          <strong style={{ color: t.textPrimary }}>Konfirmasi via WA</strong> (donor + penggalang) — beri waktu 3-7 hari sebelum lanjut
        </li>
        <li>
          Kalau bukti sah & terkonfirmasi → <strong style={{ color: '#10B981' }}>✓ Verify Manual</strong>
        </li>
        <li>
          Kalau bukti palsu / kedua pihak gak respon &gt; 14 hari → <strong style={{ color: '#EF4444' }}>✗ Tolak</strong> dgn alasan jelas
        </li>
      </ol>
      
      {/* Activity Log */}
      {activityLog.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${t.sidebarBorder}` }}>
          <p style={{ fontSize: 10, color: t.textDim, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>
            Riwayat Aktivitas ({activityLog.length})
          </p>
          <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activityLog.map((log, i) => (
              <ActivityLogRow key={log.id || i} log={log} t={t} />
            ))}
          </div>
        </div>
      )}
      {loadingLog && (
        <p style={{ fontSize: 11, color: t.textMuted, fontStyle: 'italic', marginTop: 10 }}>
          Memuat riwayat...
        </p>
      )}
    </div>
  );
}

function ActivityLogRow({ log, t }: { log: any; t: any }) {
  const actionMeta: Record<string, { icon: string; label: string; color: string }> = {
    view: { icon: '👁️', label: 'Lihat detail', color: '#6B7280' },
    wa_donor: { icon: '💬', label: 'Chat donor', color: '#25D366' },
    wa_partner: { icon: '💬', label: 'Chat penggalang', color: '#128C7E' },
    note: { icon: '📝', label: 'Catatan', color: '#6366F1' },
    verify: { icon: '✓', label: 'Verify', color: '#10B981' },
    reject: { icon: '✗', label: 'Reject', color: '#EF4444' },
  };
  const meta = actionMeta[log.action_taken] || actionMeta.view;
  const time = log.viewed_at 
    ? new Date(log.viewed_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
    : '';

  return (
    <div style={{ 
      display: 'flex', alignItems: 'flex-start', gap: 8, 
      background: 'rgba(0,0,0,0.04)', padding: '6px 10px', borderRadius: 6,
    }}>
      <span style={{ fontSize: 12 }}>{meta.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: meta.color }}>
            {meta.label}
          </span>
          <span style={{ fontSize: 10, color: t.textMuted }}>
            oleh {log.admin_name || 'Admin'}
          </span>
          <span style={{ fontSize: 10, color: t.textMuted, marginLeft: 'auto' }}>
            {time}
          </span>
        </div>
        {log.notes && (
          <p style={{ fontSize: 11, color: t.textPrimary, marginTop: 4, lineHeight: 1.5 }}>
            {log.notes}
          </p>
        )}
      </div>
    </div>
  );
}
