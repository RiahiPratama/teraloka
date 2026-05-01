'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useContext, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

import AdminFundingSubNav from '@/components/admin/funding/AdminFundingSubNav';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ═══════════════════════════════════════════════════════════════
// /admin/funding/fee-remittance — Owner Setor Fee Queue
//
// Phase 4: Admin UI Setor Fee Workflow
// 5 Smart Views:
//   - Perlu Review (default) — pending submissions
//   - Hampir Telat — pending > 24h aging
//   - Verified Hari Ini — terverifikasi today
//   - Ditolak Minggu Ini — rejected last 7d
//   - Legacy — admin direct-entry (submitted_at NULL)
// 
// Filosofi: Backend (Otak) compute, frontend (Wajah) display only.
// ═══════════════════════════════════════════════════════════════

// ── Icons ─────────────────────────────────────────
const Icons = {
  Search:      () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  X:           () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Receipt:     () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Eye:         () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Check:       () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
};

// ── Smart Views ─────────────────────────────────────────
type SmartView = 'perlu_review' | 'hampir_telat' | 'verified_today' | 'rejected_week' | 'legacy';

const SMART_VIEWS: Array<{ value: SmartView; label: string; emoji: string; color: string }> = [
  { value: 'perlu_review',    label: 'Perlu Review',       emoji: '🔴', color: '#DC2626' },
  { value: 'hampir_telat',    label: 'Hampir Telat',       emoji: '⏰', color: '#EA580C' },
  { value: 'verified_today',  label: 'Verified Hari Ini',  emoji: '✅', color: '#16A34A' },
  { value: 'rejected_week',   label: 'Ditolak Minggu Ini', emoji: '❌', color: '#B91C1C' },
  { value: 'legacy',          label: 'Legacy',             emoji: '📦', color: '#6B7280' },
];

// ── Types ─────────────────────────────────────────
interface RemittanceItem {
  id: string;
  owner_id: string | null;
  partner_name: string;
  amount: number;
  donation_count: number;
  status: 'pending' | 'verified' | 'rejected' | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reference_code: string | null;
  receipt_url: string | null;
  notes: string | null;
  review_notes: string | null;
  recorded_by: string | null;
  created_at: string;
  aging_days?: number;
}

const STATUS_TABS = [
  { key: 'pending',  label: 'Pending' },
  { key: 'verified', label: 'Verified' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all',      label: 'Semua' },
];

// ── Helpers ─────────────────────────────────────────
function rp(n: number) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function getAgingDays(iso: string | null): number {
  if (!iso) return 0;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const today = new Date();
  return d.getFullYear() === today.getFullYear()
    && d.getMonth() === today.getMonth()
    && d.getDate() === today.getDate();
}

function isWithinDays(iso: string | null, days: number): boolean {
  if (!iso) return false;
  const diff = Date.now() - new Date(iso).getTime();
  return diff < days * 24 * 60 * 60 * 1000;
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function AdminFundingFeeRemittancePage() {
  const { t } = useContext(AdminThemeContext);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { token } = useAuth();

  // ── URL state ──
  const activeStatus = searchParams.get('status') ?? 'pending';
  const activeSmartView = (searchParams.get('sv') as SmartView | null) ?? 'perlu_review';
  const urlSearch = searchParams.get('q') ?? '';
  const urlPage = Number(searchParams.get('page')) || 1;
  const urlLimit = Number(searchParams.get('limit')) || 20;

  // ── Component state ──
  const [remittances, setRemittances] = useState<RemittanceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [subNavRefresh, setSubNavRefresh] = useState(0);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  // ═══════ URL helper ═══════
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

  // ═══════ Fetch remittances ═══════
  const fetchRemittances = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    const params = new URLSearchParams({
      page: String(urlPage),
      limit: String(urlLimit),
    });

    // Map smart view → backend filter
    if (activeSmartView === 'perlu_review' || activeStatus === 'pending') {
      params.set('status', 'pending');
    } else if (activeSmartView === 'verified_today' || activeStatus === 'verified') {
      params.set('status', 'verified');
    } else if (activeSmartView === 'rejected_week' || activeStatus === 'rejected') {
      params.set('status', 'rejected');
    } else if (activeSmartView === 'hampir_telat') {
      params.set('status', 'pending');
    } else if (activeSmartView === 'legacy') {
      params.set('status', 'verified'); // legacy = verified + submitted_at NULL
    } else if (activeStatus !== 'all') {
      params.set('status', activeStatus);
    }

    if (urlSearch) params.set('partner_name', urlSearch);

    try {
      const res = await fetch(`${API_URL}/funding/admin/fee-remittances?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        let items: RemittanceItem[] = json.data ?? [];

        // Frontend filter for smart views (since backend doesn't have these specific filters)
        if (activeSmartView === 'hampir_telat') {
          items = items.filter(r => r.status === 'pending' && getAgingDays(r.submitted_at) >= 1);
        } else if (activeSmartView === 'verified_today') {
          items = items.filter(r => r.status === 'verified' && isToday(r.reviewed_at));
        } else if (activeSmartView === 'rejected_week') {
          items = items.filter(r => r.status === 'rejected' && isWithinDays(r.reviewed_at, 7));
        } else if (activeSmartView === 'legacy') {
          items = items.filter(r => r.status === 'verified' && !r.submitted_at);
        }

        setRemittances(items);
        setTotal(json.meta?.total ?? items.length);
      } else {
        setRemittances([]);
        setTotal(0);
      }
    } catch (err) {
      console.error('[AdminFeeRemittance] Fetch error:', err);
      setRemittances([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, urlPage, urlLimit, activeStatus, activeSmartView, urlSearch]);

  useEffect(() => { fetchRemittances(); }, [fetchRemittances]);

  // ═══════ Search debounce ═══════
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== urlSearch) {
        updateUrl({ q: searchInput || null, page: 1 });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, urlSearch, updateUrl]);

  // ═══════ Stats per smart view (counts) ═══════
  const smartViewCounts = useMemo(() => {
    return {
      perlu_review: remittances.filter(r => r.status === 'pending').length,
      hampir_telat: remittances.filter(r => r.status === 'pending' && getAgingDays(r.submitted_at) >= 1).length,
      verified_today: remittances.filter(r => r.status === 'verified' && isToday(r.reviewed_at)).length,
      rejected_week: remittances.filter(r => r.status === 'rejected' && isWithinDays(r.reviewed_at, 7)).length,
      legacy: remittances.filter(r => r.status === 'verified' && !r.submitted_at).length,
    };
  }, [remittances]);

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div style={{ background: t.mainBg, minHeight: '100vh', padding: '24px 32px' }}>
      {/* SubNav */}
      <AdminFundingSubNav refreshKey={subNavRefresh} />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: t.textPrimary, marginBottom: 4 }}>
          Setor Fee — Owner Submissions
        </h1>
        <p style={{ fontSize: 13, color: t.textDim }}>
          Review setoran fee dari penggalang. Verify untuk match donations via FIFO + mark remitted.
        </p>
      </div>

      {/* Smart Views Pills */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 16,
        overflowX: 'auto',
        paddingBottom: 4,
      }}>
        {SMART_VIEWS.map(view => {
          const isActive = activeSmartView === view.value;
          const count = smartViewCounts[view.value];
          return (
            <button
              key={view.value}
              onClick={() => updateUrl({ sv: view.value, status: null, page: 1 })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 700,
                color: isActive ? '#fff' : t.textPrimary,
                background: isActive ? view.color : t.mainBg,
                border: `1px solid ${isActive ? view.color : t.sidebarBorder}`,
                borderRadius: 999,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 150ms',
              }}
            >
              <span>{view.emoji}</span>
              <span>{view.label}</span>
              {count > 0 && (
                <span style={{
                  background: isActive ? 'rgba(255,255,255,0.25)' : '#F3F4F6',
                  color: isActive ? '#fff' : '#6B7280',
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: 999,
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Status Tabs */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 16,
        borderBottom: `1px solid ${t.sidebarBorder}`,
      }}>
        {STATUS_TABS.map(tab => {
          const isActive = activeStatus === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => updateUrl({ status: tab.key === 'pending' ? null : tab.key, sv: null, page: 1 })}
              style={{
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 600,
                color: isActive ? '#EC4899' : t.textDim,
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #EC4899' : '2px solid transparent',
                marginBottom: -1,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div style={{
        background: t.mainBg,
        border: `1px solid ${t.sidebarBorder}`,
        borderRadius: 10,
        padding: '8px 12px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        maxWidth: 400,
      }}>
        <span style={{ color: t.textMuted }}><Icons.Search /></span>
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Cari nama penggalang..."
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 13,
            color: t.textPrimary,
          }}
        />
        {searchInput && (
          <button
            onClick={() => setSearchInput('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: 0 }}
          >
            <Icons.X />
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{
          background: t.mainBg,
          border: `1px solid ${t.sidebarBorder}`,
          borderRadius: 12,
          padding: 60,
          textAlign: 'center',
          color: t.textDim,
          fontSize: 13,
        }}>
          Memuat data setoran...
        </div>
      )}

      {/* Empty state */}
      {!loading && remittances.length === 0 && (
        <div style={{
          background: t.mainBg,
          border: `1px solid ${t.sidebarBorder}`,
          borderRadius: 12,
          padding: 60,
          textAlign: 'center',
        }}>
          <div style={{ color: t.textMuted, marginBottom: 12 }}>
            <Icons.Receipt />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>
            Belum ada setoran
          </p>
          <p style={{ fontSize: 12, color: t.textDim }}>
            {activeSmartView === 'perlu_review' && 'Tidak ada setoran fee yang menunggu review.'}
            {activeSmartView === 'hampir_telat' && 'Tidak ada setoran yang sudah lebih dari 24 jam pending.'}
            {activeSmartView === 'verified_today' && 'Belum ada setoran yang diverifikasi hari ini.'}
            {activeSmartView === 'rejected_week' && 'Tidak ada setoran ditolak dalam 7 hari terakhir.'}
            {activeSmartView === 'legacy' && 'Tidak ada record legacy admin direct-entry.'}
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && remittances.length > 0 && (
        <div style={{
          background: t.mainBg,
          border: `1px solid ${t.sidebarBorder}`,
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: t.navHover }}>
              <tr>
                <th style={thStyle(t)}>Penggalang</th>
                <th style={thStyle(t)}>Jumlah</th>
                <th style={thStyle(t)}>Donasi</th>
                <th style={thStyle(t)}>Status</th>
                <th style={thStyle(t)}>Disubmit</th>
                <th style={thStyle(t)}>Aging</th>
                <th style={thStyle(t)}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {remittances.map(r => {
                const aging = getAgingDays(r.submitted_at);
                const isPending = r.status === 'pending';
                const agingColor = aging >= 3 ? '#DC2626' : aging >= 1 ? '#EA580C' : t.textDim;
                const isLegacy = r.status === 'verified' && !r.submitted_at;

                return (
                  <tr key={r.id} style={{ borderTop: `1px solid ${t.sidebarBorder}` }}>
                    <td style={tdStyle(t)}>
                      <div style={{ fontWeight: 600, color: t.textPrimary }}>
                        {r.partner_name}
                      </div>
                      {r.reference_code && (
                        <div style={{ fontSize: 11, color: t.textMuted, fontFamily: 'monospace', marginTop: 2 }}>
                          {r.reference_code}
                        </div>
                      )}
                    </td>
                    <td style={tdStyle(t)}>
                      <span style={{ fontWeight: 700, fontFamily: 'monospace', color: t.textPrimary }}>
                        {rp(r.amount)}
                      </span>
                    </td>
                    <td style={tdStyle(t)}>
                      <span style={{ color: t.textDim }}>
                        {r.donation_count > 0 ? `${r.donation_count}×` : '—'}
                      </span>
                    </td>
                    <td style={tdStyle(t)}>
                      <StatusBadge status={r.status} isLegacy={isLegacy} />
                    </td>
                    <td style={tdStyle(t)}>
                      <span style={{ color: t.textDim, fontSize: 12 }}>
                        {fmtDate(r.submitted_at)}
                      </span>
                    </td>
                    <td style={tdStyle(t)}>
                      {isPending ? (
                        <span style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: agingColor,
                        }}>
                          {aging > 0 ? `${aging} hari` : '<1 hari'}
                        </span>
                      ) : (
                        <span style={{ color: t.textMuted, fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td style={tdStyle(t)}>
                      <Link
                        href={`/admin/funding/fee-remittance/${r.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '5px 10px',
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#EC4899',
                          background: 'rgba(236,72,153,0.08)',
                          border: '1px solid rgba(236,72,153,0.2)',
                          borderRadius: 6,
                          textDecoration: 'none',
                        }}
                      >
                        <Icons.Eye />
                        Detail
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination simple */}
      {!loading && total > urlLimit && (
        <div style={{
          marginTop: 16,
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
        }}>
          <button
            onClick={() => updateUrl({ page: Math.max(1, urlPage - 1) })}
            disabled={urlPage <= 1}
            style={paginationBtnStyle(t, urlPage <= 1)}
          >
            ← Sebelumnya
          </button>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '8px 12px',
            fontSize: 12,
            color: t.textDim,
          }}>
            Page {urlPage} / {Math.ceil(total / urlLimit)}
          </span>
          <button
            onClick={() => updateUrl({ page: urlPage + 1 })}
            disabled={urlPage * urlLimit >= total}
            style={paginationBtnStyle(t, urlPage * urlLimit >= total)}
          >
            Selanjutnya →
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          padding: '12px 20px',
          background: toast.ok ? '#10B981' : '#EF4444',
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 100,
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function StatusBadge({ status, isLegacy }: { status: string | null; isLegacy: boolean }) {
  if (isLegacy) {
    return (
      <span style={{
        display: 'inline-flex', padding: '3px 8px', fontSize: 11, fontWeight: 700,
        color: '#6B7280', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 6,
      }}>
        Legacy
      </span>
    );
  }

  const config: Record<string, { label: string; color: string; bg: string; border: string }> = {
    pending:  { label: 'Pending',  color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' },
    verified: { label: 'Verified', color: '#047857', bg: '#D1FAE5', border: '#A7F3D0' },
    rejected: { label: 'Rejected', color: '#B91C1C', bg: '#FEE2E2', border: '#FECACA' },
  };
  const c = config[status ?? 'pending'] ?? config.pending;

  return (
    <span style={{
      display: 'inline-flex', padding: '3px 8px', fontSize: 11, fontWeight: 700,
      color: c.color, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 6,
    }}>
      {c.label}
    </span>
  );
}

// ─── Style helpers ─────────────────────────────────────────

function thStyle(t: any): React.CSSProperties {
  return {
    padding: '12px 16px',
    fontSize: 11,
    fontWeight: 700,
    color: t.textMuted,
    textAlign: 'left',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: `1px solid ${t.sidebarBorder}`,
  };
}

function tdStyle(t: any): React.CSSProperties {
  return {
    padding: '12px 16px',
    fontSize: 13,
    color: t.textPrimary,
    verticalAlign: 'top',
  };
}

function paginationBtnStyle(t: any, disabled: boolean): React.CSSProperties {
  return {
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 600,
    color: disabled ? t.textMuted : t.textPrimary,
    background: t.mainBg,
    border: `1px solid ${t.sidebarBorder}`,
    borderRadius: 6,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
}
