'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useContext, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

import AdminFundingSubNav from '@/components/admin/funding/AdminFundingSubNav';
import PartnerFeeCards, { type PartnerFeeSummary } from '@/components/admin/funding/PartnerFeeCards';
import PendingFeesTable, { type PendingFeeDonation } from '@/components/admin/funding/PendingFeesTable';
import RecordRemittanceModal from '@/components/admin/funding/RecordRemittanceModal';
import Pagination from '@/components/admin/funding/Pagination';
import AdminAuthGuard from '@/components/admin/funding/AdminAuthGuard';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ── Icons ─────────────────────────────────────────
const Icons = {
  Alert:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Clock:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Receipt: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="11" x2="15" y2="11"/></svg>,
};

// ── Types ─────────────────────────────────────────
interface FeeSummary {
  total_expected: number;
  total_remitted: number;
  total_pending: number;
  remitted_count: number;
  pending_count: number;
  partner_count: number;
  oldest_pending_days: number;
}

interface AgingBuckets {
  thresholds: { recent: number; warning: number; overdue: number };
  buckets: {
    recent:   { count: number; amount: number };
    warning:  { count: number; amount: number };
    overdue:  { count: number; amount: number };
    critical: { count: number; amount: number };
  };
  total_pending_amount: number;
  total_pending_count: number;
}

interface RemittanceRecord {
  id: string;
  partner_name: string;
  amount: number;
  donation_count: number;
  recorded_by: string;
  remitted_at: string;
  reference_code: string | null;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
}

type TabKey = 'partners' | 'pending' | 'history';

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: 'partners', label: 'Per Partner',     emoji: '👥' },
  { key: 'pending',  label: 'Pending Donasi',  emoji: '⏳' },
  { key: 'history',  label: 'Riwayat',         emoji: '📜' },
];

// ── Helpers ──────────────────────────────────────
function formatRupiah(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function shortRupiah(n: number): string {
  if (n >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + n.toLocaleString('id-ID');
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function AdminFeesPage() {
  const { t } = useContext(AdminThemeContext);
  const { token } = useAuth();

  // Data
  const [summary, setSummary] = useState<FeeSummary | null>(null);
  const [partners, setPartners] = useState<PartnerFeeSummary[]>([]);
  const [aging, setAging] = useState<AgingBuckets | null>(null);
  const [pendingDonations, setPendingDonations] = useState<PendingFeeDonation[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [history, setHistory] = useState<RemittanceRecord[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);

  // UI state
  const [activeTab, setActiveTab] = useState<TabKey>('partners');
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [subNavRefresh, setSubNavRefresh] = useState(0);

  // Pending table pagination
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingLimit, setPendingLimit] = useState(20);

  // History pagination
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit] = useState(20);

  // Modal state
  const [remitModal, setRemitModal] = useState<{
    open: boolean;
    donations: PendingFeeDonation[];
    partnerName: string;
  }>({ open: false, donations: [], partnerName: '' });

  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  }

  // ═══════ Fetch functions ═══════

  const fetchSummary = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    try {
      const res = await fetch(`${API_URL}/funding/admin/fees/summary`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      if (res.ok && json.success) setSummary(json.data);
    } catch {}
  }, []);

  const fetchPartners = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    try {
      const res = await fetch(`${API_URL}/funding/admin/fees/partners`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      if (res.ok && json.success) setPartners(json.data);
    } catch {}
  }, []);

  const fetchAging = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    try {
      const res = await fetch(`${API_URL}/funding/admin/fees/aging`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      if (res.ok && json.success) setAging(json.data);
    } catch {}
  }, []);

  const fetchPending = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    try {
      const res = await fetch(
        `${API_URL}/funding/admin/fees/pending?page=${pendingPage}&limit=${pendingLimit}&sort=oldest`,
        { headers: { Authorization: `Bearer ${tk}` } }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setPendingDonations(json.data);
        setPendingTotal(json.meta?.total ?? 0);
      }
    } catch {}
  }, [pendingPage, pendingLimit]);

  const fetchHistory = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    try {
      const res = await fetch(
        `${API_URL}/funding/admin/fees/remittances?page=${historyPage}&limit=${historyLimit}`,
        { headers: { Authorization: `Bearer ${tk}` } }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setHistory(json.data);
        setHistoryTotal(json.meta?.total ?? 0);
      }
    } catch {}
  }, [historyPage, historyLimit]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchSummary(), fetchPartners(), fetchAging(),
    ]);
    setLoading(false);
  }, [fetchSummary, fetchPartners, fetchAging]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  useEffect(() => {
    if (activeTab === 'pending') fetchPending();
  }, [activeTab, fetchPending]);

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab, fetchHistory]);

  // ═══════ Selection handlers ═══════

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
      const selectable = pendingDonations.filter(d => d.operational_fee > 0);
      const allIds = selectable.map(d => d.id);
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

  const selectedDonations = useMemo(
    () => pendingDonations.filter(d => selectedIds.has(d.id)),
    [pendingDonations, selectedIds]
  );

  const selectedPartners = useMemo(() => {
    const set = new Set<string>();
    selectedDonations.forEach(d => {
      if (d.campaign?.partner_name) set.add(d.campaign.partner_name);
    });
    return Array.from(set);
  }, [selectedDonations]);

  const selectedTotalFee = useMemo(
    () => selectedDonations.reduce((sum, d) => sum + (d.operational_fee || 0), 0),
    [selectedDonations]
  );

  const multiPartnerWarning = selectedPartners.length > 1;
  const canRecordFromSelection = selectedPartners.length === 1 && selectedTotalFee > 0;

  // ═══════ Modal handlers ═══════

  function openRemittanceFromPartner(partnerName: string) {
    const partnerDonations = pendingDonations.filter(
      d => d.campaign?.partner_name === partnerName && d.operational_fee > 0
    );

    if (partnerDonations.length === 0) {
      fetchPendingForPartner(partnerName);
      return;
    }

    setRemitModal({
      open: true,
      donations: partnerDonations,
      partnerName,
    });
  }

  async function fetchPendingForPartner(partnerName: string) {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    try {
      const res = await fetch(
        `${API_URL}/funding/admin/fees/pending?partner=${encodeURIComponent(partnerName)}&limit=100`,
        { headers: { Authorization: `Bearer ${tk}` } }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        const ds = (json.data as PendingFeeDonation[]).filter(d => d.operational_fee > 0);
        if (ds.length === 0) {
          showToast(false, 'Tidak ada donasi pending dengan fee > 0 dari partner ini');
          return;
        }
        setRemitModal({ open: true, donations: ds, partnerName });
      }
    } catch (err: any) {
      showToast(false, err.message ?? 'Gagal fetch donasi partner');
    }
  }

  function openRemittanceFromSelection() {
    if (!canRecordFromSelection) return;
    setRemitModal({
      open: true,
      donations: selectedDonations,
      partnerName: selectedPartners[0],
    });
  }

  function handleRemittanceSuccess() {
    setSelectedIds(new Set());
    refreshAll();
    setSubNavRefresh(r => r + 1);
    if (activeTab === 'pending') fetchPending();
    if (activeTab === 'history') fetchHistory();
  }

  // ═══════ Render ═══════

  const hasCritical = aging && (aging.buckets.critical.count > 0 || aging.buckets.overdue.count > 0);

  return (
    <AdminAuthGuard>
      <div style={{ padding: '24px 32px', maxWidth: 1400, color: t.textPrimary }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 8 }}>
        <Link href="/admin/funding" style={{ fontSize: 12, color: t.textDim, textDecoration: 'none' }}>Dashboard</Link>
        <span style={{ fontSize: 12, color: t.textMuted, margin: '0 6px' }}>/</span>
        <span style={{ fontSize: 12, color: t.textDim, fontWeight: 600 }}>Fee Settlement</span>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800, color: t.textPrimary, marginBottom: 4 }}>
        🧾 Fee Settlement
      </h1>
      <p style={{ fontSize: 14, color: t.textDim, marginBottom: 24 }}>
        Pantau setoran fee operasional dari partner ke TeraLoka — transparansi revenue platform.
      </p>

      <AdminFundingSubNav refreshKey={subNavRefresh} />

      {/* Stats Cards */}
      {summary && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12, marginBottom: 16,
        }}>
          <StatCard
            label="Total Expected"
            value={formatRupiah(summary.total_expected)}
            subtext={`${summary.pending_count + summary.remitted_count} donasi verified`}
            color="#6366F1" t={t}
          />
          <StatCard
            label="Sudah Remitted"
            value={formatRupiah(summary.total_remitted)}
            subtext={`${summary.remitted_count} donasi · ${summary.total_expected > 0 ? Math.round((summary.total_remitted / summary.total_expected) * 100) : 0}%`}
            color="#10B981" t={t}
          />
          <StatCard
            label="⚠️ Pending Settle"
            value={formatRupiah(summary.total_pending)}
            subtext={`${summary.pending_count} donasi · ${summary.partner_count} partner`}
            color="#EC4899" t={t}
            alert={summary.total_pending > 0}
          />
          <StatCard
            label="⏱️ Oldest Pending"
            value={summary.oldest_pending_days > 0 ? `${summary.oldest_pending_days} hari` : '-'}
            subtext={summary.oldest_pending_days > 30 ? 'PERLU PERHATIAN' : 'Dalam batas normal'}
            color={summary.oldest_pending_days > 60 ? '#DC2626' : summary.oldest_pending_days > 30 ? '#EA580C' : summary.oldest_pending_days > 7 ? '#F59E0B' : '#10B981'}
            t={t}
            alert={summary.oldest_pending_days > 30}
          />
        </div>
      )}

      {/* Aging Banner (critical/overdue only) */}
      {hasCritical && aging && (
        <div style={{
          background: 'rgba(220,38,38,0.08)',
          border: '1px solid rgba(220,38,38,0.3)',
          borderRadius: 12, padding: 14, marginBottom: 20,
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#DC2626', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icons.Alert />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#DC2626', marginBottom: 4 }}>
              Ada {aging.buckets.overdue.count + aging.buckets.critical.count} donasi overdue!
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: t.textDim }}>
              {aging.buckets.overdue.count > 0 && (
                <span>🟠 <strong style={{ color: '#EA580C' }}>{aging.buckets.overdue.count}</strong> overdue (30-60 hari): {shortRupiah(aging.buckets.overdue.amount)}</span>
              )}
              {aging.buckets.critical.count > 0 && (
                <span>🔴 <strong style={{ color: '#DC2626' }}>{aging.buckets.critical.count}</strong> KRITIS (&gt;60 hari): {shortRupiah(aging.buckets.critical.amount)}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto' }}>
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSelectedIds(new Set()); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', borderRadius: 10,
                fontSize: 13, fontWeight: 600,
                color: active ? '#fff' : t.textPrimary,
                background: active ? '#1F2937' : t.mainBg,
                border: `1px solid ${active ? '#1F2937' : t.sidebarBorder}`,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
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
          Memuat data fee settlement...
        </div>
      ) : (
        <>
          {activeTab === 'partners' && (
            <PartnerFeeCards
              partners={partners}
              onRecordRemittance={openRemittanceFromPartner}
            />
          )}

          {activeTab === 'pending' && (
            <>
              {/* Multi-partner warning */}
              {multiPartnerWarning && (
                <div style={{
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: 12, padding: 12, marginBottom: 12,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <Icons.Alert />
                  <div style={{ fontSize: 12, color: '#B45309' }}>
                    <strong>Pilih donasi dari 1 partner yang sama.</strong>
                    {' '}Saat ini: <strong>{selectedPartners.length} partner</strong> ter-select ({selectedPartners.join(', ')}).
                  </div>
                </div>
              )}

              {/* Bulk action toolbar */}
              {selectedIds.size > 0 && (
                <div style={{
                  position: 'sticky', top: 16, zIndex: 30,
                  marginBottom: 16,
                  background: canRecordFromSelection
                    ? 'linear-gradient(135deg, #EC4899, #BE185D)'
                    : 'linear-gradient(135deg, #6B7280, #4B5563)',
                  color: '#fff',
                  borderRadius: 14, padding: '10px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexWrap: 'wrap', gap: 12,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 12, fontWeight: 800,
                      background: 'rgba(255,255,255,0.2)',
                      padding: '4px 10px', borderRadius: 999,
                    }}>
                      {selectedIds.size}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      dipilih
                    </span>
                    <span style={{ fontSize: 11, opacity: 0.9 }}>
                      · Total: <strong>{formatRupiah(selectedTotalFee)}</strong>
                    </span>
                    {selectedPartners.length === 1 && (
                      <span style={{ fontSize: 11, opacity: 0.9 }}>
                        · Partner: <strong>{selectedPartners[0]}</strong>
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={openRemittanceFromSelection}
                      disabled={!canRecordFromSelection}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '8px 14px', borderRadius: 9, border: 'none',
                        background: 'rgba(255,255,255,0.2)',
                        color: '#fff', fontSize: 12, fontWeight: 700,
                        cursor: canRecordFromSelection ? 'pointer' : 'not-allowed',
                        opacity: canRecordFromSelection ? 1 : 0.6,
                      }}
                    >
                      <Icons.Receipt /> Catat Remittance
                    </button>
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      style={{
                        padding: '8px 12px', borderRadius: 9,
                        border: '1px solid rgba(255,255,255,0.35)',
                        background: 'transparent', color: '#fff',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              <PendingFeesTable
                donations={pendingDonations}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleAll={toggleSelectAll}
              />

              {pendingTotal > 0 && (
                <Pagination
                  page={pendingPage}
                  limit={pendingLimit}
                  total={pendingTotal}
                  onPageChange={setPendingPage}
                  onLimitChange={l => { setPendingLimit(l); setPendingPage(1); }}
                />
              )}
            </>
          )}

          {activeTab === 'history' && (
            <HistoryTable
              records={history}
              total={historyTotal}
              page={historyPage}
              limit={historyLimit}
              onPageChange={setHistoryPage}
              t={t}
            />
          )}
        </>
      )}

      {/* Remittance Modal */}
      <RecordRemittanceModal
        open={remitModal.open}
        donations={remitModal.donations}
        partnerName={remitModal.partnerName}
        onClose={() => setRemitModal({ open: false, donations: [], partnerName: '' })}
        onSuccess={handleRemittanceSuccess}
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
    </AdminAuthGuard>
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
        fontSize: 11, fontWeight: 700, color: alert ? color : t.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
      }}>
        {label}
      </p>
      {/* PRIMARY — angka rupiah ditonjolkan */}
      <p style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 4, lineHeight: 1.2 }}>
        {value}
      </p>
      {/* SECONDARY — subtext lebih kecil & dimmer */}
      {subtext && (
        <p style={{ fontSize: 10, color: t.textMuted, opacity: 0.75, fontWeight: 500 }}>
          {subtext}
        </p>
      )}
    </div>
  );
}

// ── History Table ────────────────────────────────

function HistoryTable({
  records, total, page, limit, onPageChange, t,
}: {
  records: RemittanceRecord[]; total: number; page: number; limit: number;
  onPageChange: (p: number) => void; t: any;
}) {
  if (records.length === 0) {
    return (
      <div style={{
        background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
        borderRadius: 16, padding: 60, textAlign: 'center',
      }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, marginBottom: 4 }}>
          Belum ada remittance tercatat
        </p>
        <p style={{ fontSize: 12, color: t.textDim }}>
          Remittance yang sudah dicatat akan muncul di sini sebagai audit trail.
        </p>
      </div>
    );
  }

  return (
    <>
      <div style={{
        background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
        borderRadius: 16, overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.sidebarBorder}`, background: t.navHover + '55' }}>
                <th style={histThStyle(t, 'left')}>Partner</th>
                <th style={histThStyle(t, 'right', 130)}>Jumlah</th>
                <th style={histThStyle(t, 'center', 90)}>Donasi</th>
                <th style={histThStyle(t, 'center', 130)}>Tanggal</th>
                <th style={histThStyle(t, 'left', 140)}>Reference</th>
                <th style={histThStyle(t, 'left')}>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => (
                <tr key={r.id} style={{
                  borderBottom: idx === records.length - 1 ? 'none' : `1px solid ${t.sidebarBorder}`,
                }}>
                  <td style={histTdStyle(t, 'left')}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#EC4899' }}>
                      {r.partner_name}
                    </div>
                  </td>
                  <td style={histTdStyle(t, 'right')}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#10B981' }}>
                      {formatRupiah(r.amount)}
                    </span>
                  </td>
                  <td style={histTdStyle(t, 'center')}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary }}>
                      {r.donation_count}
                    </span>
                  </td>
                  <td style={histTdStyle(t, 'center')}>
                    <span style={{ fontSize: 11, color: t.textDim }}>
                      {new Date(r.remitted_at).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </td>
                  <td style={histTdStyle(t, 'left')}>
                    {r.reference_code ? (
                      <span style={{
                        fontSize: 11, fontFamily: 'monospace', fontWeight: 600,
                        color: t.textDim, background: t.navHover,
                        padding: '3px 8px', borderRadius: 6, display: 'inline-block',
                      }}>
                        {r.reference_code}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: t.textMuted, fontStyle: 'italic' }}>-</span>
                    )}
                  </td>
                  <td style={histTdStyle(t, 'left')}>
                    {r.notes ? (
                      <span style={{
                        fontSize: 11, color: t.textDim,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {r.notes}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: t.textMuted, fontStyle: 'italic' }}>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {total > 0 && (
        <Pagination
          page={page}
          limit={limit}
          total={total}
          onPageChange={onPageChange}
          onLimitChange={() => {}}
        />
      )}
    </>
  );
}

function histThStyle(t: any, align: 'left' | 'right' | 'center', width?: number): React.CSSProperties {
  return {
    textAlign: align,
    padding: '10px 12px',
    fontSize: 10, fontWeight: 700, color: t.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    whiteSpace: 'nowrap',
    width: width ? `${width}px` : 'auto',
  };
}

function histTdStyle(t: any, align: 'left' | 'right' | 'center'): React.CSSProperties {
  return {
    textAlign: align,
    padding: '12px',
    verticalAlign: 'top',
    color: t.textPrimary,
  };
}
