'use client';

import { useEffect, useState, useContext, useCallback, useMemo } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import AdminFundingSubNav from '@/components/admin/funding/AdminFundingSubNav';
import AdminAuthGuard from '@/components/admin/funding/AdminAuthGuard';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ═══════════════════════════════════════════════════════════════
// FIX-E-4-C: Admin Penggalang KYC Verification — List Page
//
// Path: /admin/funding/penggalang
// Role: super_admin OR admin_funding
//
// Features:
// - 4 status filter tabs (pending, verified, rejected, all)
// - Search by name / phone
// - Pagination 20/page
// - Click row → simple review modal (Batch C: basic UX)
// - Batch D will enhance modal with anti-error checklist + throttle
// ═══════════════════════════════════════════════════════════════

interface Creator {
  id: string;
  phone: string;
  name: string | null;
  avatar_url: string | null;
  creator_full_name: string | null;
  creator_id_documents: string[] | null;
  creator_verified: boolean;
  creator_verified_at: string | null;
  creator_kyc_rejected_at: string | null;
  creator_kyc_rejection_reason: string | null;
  created_at: string | null;
  status: 'pending_verification' | 'verified' | 'incomplete';
}

type StatusFilter = 'pending' | 'verified' | 'rejected' | 'all';

const STATUS_LABELS: Record<StatusFilter, string> = {
  pending: 'Pending',
  verified: 'Verified',
  rejected: 'Rejected',
  all: 'Semua',
};

const REJECT_REASONS: { value: string; label: string }[] = [
  { value: 'ktp_not_clear', label: 'KTP blur / tidak terbaca' },
  { value: 'name_mismatch', label: 'Nama tidak cocok' },
  { value: 'invalid_nik', label: 'NIK tidak valid 16 digit' },
  { value: 'suspect_manipulation', label: 'Curiga dimanipulasi' },
  { value: 'other', label: 'Lainnya (notes wajib)' },
];

export default function AdminPenggalangPage() {
  const { t } = useContext(AdminThemeContext);

  // ─── State ────────────────────────────────────────────
  const [status, setStatus] = useState<StatusFilter>('pending');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ pending: 0, verified: 0, rejected: 0, total_creators: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  // ⭐ Track record: campaign + donation stats per creator
  const [trackRecord, setTrackRecord] = useState<Record<string, {
    campaigns: number; active: number; total_collected: number;
  }>>({});

  // Modal state
  const [modal, setModal] = useState<{
    type: 'review' | 'reject';
    creator: Creator;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('ktp_not_clear');
  const [rejectNotes, setRejectNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const LIMIT = 20;

  // ─── Debounced search ─────────────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // ─── Fetch creators list ──────────────────────────────
  const fetchCreators = useCallback(async () => {
    setLoading(true);
    try {
      const tk = localStorage.getItem('tl_token');
      if (!tk) return;

      const params = new URLSearchParams({
        status,
        limit: String(LIMIT),
        offset: String((page - 1) * LIMIT),
      });
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`${API_URL}/admin/creators?${params.toString()}`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();

      if (json.success) {
        setCreators(json.data ?? []);
        setTotal(json.meta?.total ?? 0);
      }
    } catch (err) {
      console.error('Failed to fetch creators:', err);
    } finally {
      setLoading(false);
    }
  }, [status, searchQuery, page]);

  // ─── Fetch stats (for pills) ──────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const tk = localStorage.getItem('tl_token');
      if (!tk) return;
      const res = await fetch(`${API_URL}/admin/creators/stats`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  useEffect(() => { fetchCreators(); }, [fetchCreators, refreshKey]);

  // ⭐ Fetch track record untuk creators yang terload
  useEffect(() => {
    if (!creators.length) return;
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;

    Promise.all(
      creators.map(c =>
        fetch(`${API_URL}/funding/admin/creators/${c.id}/campaigns?limit=100`, {
          headers: { Authorization: `Bearer ${tk}` },
        }).then(r => r.json()).catch(() => null)
      )
    ).then(results => {
      const record: Record<string, { campaigns: number; active: number; total_collected: number }> = {};
      creators.forEach((c, i) => {
        const data = results[i]?.data ?? [];
        const total = results[i]?.meta?.total ?? data.length;
        const active = data.filter((cam: any) => cam.status === 'active').length;
        const collected = data.reduce((sum: number, cam: any) => sum + Number(cam.collected_amount ?? 0), 0);
        record[c.id] = { campaigns: total, active, total_collected: collected };
      });
      setTrackRecord(record);
    });
  }, [creators]);
  useEffect(() => { fetchStats(); }, [fetchStats, refreshKey]);

  // ─── Toast auto-hide ──────────────────────────────────
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ─── Action handlers ──────────────────────────────────
  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
  }

  async function handleApprove(creator: Creator) {
    setSubmitting(true);
    try {
      const tk = localStorage.getItem('tl_token');
      const res = await fetch(`${API_URL}/admin/creators/${creator.id}/verify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tk}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const json = await res.json();

      if (res.status === 429 && json.error?.code === 'THROTTLE_WARNING') {
        // Throttle warning — Batch D will handle this with proper UI
        // For now: simple confirm
        const ok = confirm(
          `⚠️ ${json.error.message}\n\nLanjutkan approve?`
        );
        if (!ok) {
          setSubmitting(false);
          return;
        }
        // Retry with warning_acknowledged=true
        const retry = await fetch(`${API_URL}/admin/creators/${creator.id}/verify`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tk}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ warning_acknowledged: true }),
        });
        const retryJson = await retry.json();
        if (!retry.ok || !retryJson.success) throw new Error(retryJson.error?.message ?? 'Gagal approve');
        showToast(true, `✓ ${creator.creator_full_name ?? creator.name} di-approve`);
      } else if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'Gagal approve');
      } else {
        showToast(true, `✓ ${creator.creator_full_name ?? creator.name} di-approve`);
      }

      setModal(null);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      showToast(false, `Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject(creator: Creator) {
    if (rejectReason === 'other' && rejectNotes.trim().length < 10) {
      showToast(false, 'Untuk reason "Lainnya", notes minimal 10 karakter');
      return;
    }

    setSubmitting(true);
    try {
      const tk = localStorage.getItem('tl_token');
      const res = await fetch(`${API_URL}/admin/creators/${creator.id}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tk}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: rejectReason,
          notes: rejectNotes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message ?? 'Gagal reject');

      showToast(true, `✓ ${creator.creator_full_name ?? creator.name} di-reject`);
      setModal(null);
      setRejectReason('ktp_not_clear');
      setRejectNotes('');
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      showToast(false, `Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  function openReview(creator: Creator) {
    setModal({ type: 'review', creator });
    setRejectReason('ktp_not_clear');
    setRejectNotes('');
  }

  // ─── Status pill computed ─────────────────────────────
  const statusCounts = useMemo(() => ({
    pending: stats.pending,
    verified: stats.verified,
    rejected: stats.rejected,
    all: stats.total_creators,
  }), [stats]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <AdminAuthGuard>
      <div style={{ minHeight: '100vh', background: t.mainBg, padding: '24px 28px' }}>
      <AdminFundingSubNav refreshKey={refreshKey} />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: t.textPrimary, marginBottom: 4 }}>
          Verifikasi Penggalang
        </h1>
        <p style={{ fontSize: 13, color: t.textDim }}>
          Verifikasi identitas penggalang dengan teliti. Setiap action tercatat di audit log.
        </p>
      </div>

      {/* Status Pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {(['pending', 'verified', 'rejected', 'all'] as StatusFilter[]).map(s => {
          const active = status === s;
          const count = statusCounts[s];
          const accentColor = s === 'pending' ? '#F59E0B' : s === 'verified' ? '#10B981' : s === 'rejected' ? '#EF4444' : '#6B7280';
          return (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', borderRadius: 999,
                border: `1.5px solid ${active ? accentColor : t.sidebarBorder}`,
                background: active ? `${accentColor}15` : 'transparent',
                color: active ? accentColor : t.textDim,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              {STATUS_LABELS[s]}
              <span style={{
                background: active ? accentColor : t.navHover,
                color: active ? '#fff' : t.textDim,
                fontSize: 10, fontWeight: 700,
                padding: '1px 7px', borderRadius: 999,
                minWidth: 18, textAlign: 'center',
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Cari nama atau nomor HP..."
          style={{
            width: '100%', maxWidth: 400, padding: '10px 14px',
            borderRadius: 10, border: `1px solid ${t.sidebarBorder}`,
            background: t.mainBg, color: t.textPrimary,
            fontSize: 13, outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ padding: 60, textAlign: 'center', color: t.textDim, fontSize: 13 }}>
          Memuat data penggalang...
        </div>
      )}

      {/* Empty state */}
      {!loading && creators.length === 0 && (
        <div style={{
          padding: 60, textAlign: 'center', borderRadius: 12,
          background: t.navHover, color: t.textDim,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, marginBottom: 4 }}>
            Tidak ada penggalang
          </p>
          <p style={{ fontSize: 12 }}>
            {status === 'pending' ? 'Belum ada penggalang yang menunggu verifikasi.' : `Tidak ada penggalang dengan status "${STATUS_LABELS[status]}".`}
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && creators.length > 0 && (
        <div style={{
          background: t.mainBg, borderRadius: 12,
          border: `1px solid ${t.sidebarBorder}`, overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: t.navHover }}>
              <tr>
                <th style={thStyle(t)}>Penggalang</th>
                <th style={thStyle(t)}>Phone</th>
                <th style={thStyle(t)}>Tgl Daftar</th>
                <th style={thStyle(t)}>KTP</th>
                <th style={thStyle(t)}>Track Record</th>
                <th style={thStyle(t)}>Status</th>
                <th style={{ ...thStyle(t), textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {creators.map(c => (
                <tr key={c.id} style={{ borderTop: `1px solid ${t.sidebarBorder}` }}>
                  <td style={tdStyle(t)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: '#003526', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, flexShrink: 0,
                      }}>
                        {(c.creator_full_name ?? c.name ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>
                          {c.creator_full_name ?? c.name ?? '(Belum diisi)'}
                        </p>
                        {c.name && c.creator_full_name && c.name !== c.creator_full_name && (
                          <p style={{ fontSize: 10, color: t.textMuted }}>
                            Akun: {c.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ ...tdStyle(t), fontFamily: 'monospace', fontSize: 12 }}>
                    {c.phone}
                  </td>
                  <td style={{ ...tdStyle(t), fontSize: 12, color: t.textDim }}>
                    {c.created_at ? new Date(c.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </td>
                  <td style={tdStyle(t)}>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: c.creator_id_documents && c.creator_id_documents.length > 0 ? '#10B981' : '#EF4444',
                    }}>
                      {c.creator_id_documents && c.creator_id_documents.length > 0
                        ? `📷 ${c.creator_id_documents.length} dokumen`
                        : '✗ Belum upload'}
                    </span>
                  </td>
                  <td style={tdStyle(t)}>
                    {trackRecord[c.id] ? (
                      <div style={{ fontSize: 11 }}>
                        <div style={{ fontWeight: 700, color: t.textPrimary }}>
                          {trackRecord[c.id].campaigns} kampanye
                          {trackRecord[c.id].active > 0 && (
                            <span style={{ marginLeft: 6, color: '#10B981', fontWeight: 600 }}>
                              ({trackRecord[c.id].active} aktif)
                            </span>
                          )}
                        </div>
                        {trackRecord[c.id].total_collected > 0 && (
                          <div style={{ color: '#EC4899', fontWeight: 600, marginTop: 2 }}>
                            Rp {Number(trackRecord[c.id].total_collected).toLocaleString('id-ID')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: t.textMuted }}>...</span>
                    )}
                  </td>
                  <td style={tdStyle(t)}>
                    <StatusBadge status={c.status} rejectedAt={c.creator_kyc_rejected_at} />
                  </td>
                  <td style={{ ...tdStyle(t), textAlign: 'right' }}>
                    {c.status === 'pending_verification' ? (
                      <button
                        onClick={() => openReview(c)}
                        style={{
                          padding: '7px 14px', borderRadius: 8,
                          border: 'none', background: '#003526', color: '#fff',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Review →
                      </button>
                    ) : (
                      <button
                        onClick={() => openReview(c)}
                        style={{
                          padding: '7px 14px', borderRadius: 8,
                          border: `1px solid ${t.sidebarBorder}`, background: 'transparent',
                          color: t.textDim, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Detail
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 8 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={paginationBtnStyle(t, page === 1)}
          >
            ← Sebelumnya
          </button>
          <span style={{ padding: '8px 14px', fontSize: 12, color: t.textDim, alignSelf: 'center' }}>
            Halaman {page} dari {totalPages} • {total} total
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={paginationBtnStyle(t, page === totalPages)}
          >
            Berikutnya →
          </button>
        </div>
      )}

      {/* Review Modal (basic version — Batch D will enhance with anti-error checklist) */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
          <div style={{
            background: t.mainBg, borderRadius: 16, padding: 0,
            maxWidth: 720, width: '100%', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
          }}>
            {/* Modal header */}
            <div style={{
              padding: '18px 24px', borderBottom: `1px solid ${t.sidebarBorder}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary }}>
                {modal.type === 'reject' ? '✗ Tolak Verifikasi' : '🔍 Review Penggalang'}
              </h2>
              <button onClick={() => setModal(null)} disabled={submitting} style={{
                width: 32, height: 32, borderRadius: 8, border: 'none',
                background: 'transparent', color: t.textDim, fontSize: 20, cursor: 'pointer',
              }}>
                ×
              </button>
            </div>

            {/* Modal body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              {modal.type === 'review' && (
                <>
                  <CreatorReviewBody creator={modal.creator} t={t} />

                  {modal.creator.status === 'pending_verification' && (
                    <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                      <button
                        onClick={() => setModal({ type: 'reject', creator: modal.creator })}
                        disabled={submitting}
                        style={{
                          flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none',
                          background: 'rgba(239,68,68,0.1)', color: '#EF4444',
                          fontWeight: 600, fontSize: 13, cursor: 'pointer',
                        }}
                      >
                        ✗ Tolak
                      </button>
                      <button
                        onClick={() => handleApprove(modal.creator)}
                        disabled={submitting}
                        style={{
                          flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none',
                          background: 'linear-gradient(135deg, #10B981, #059669)',
                          color: '#fff', fontWeight: 700, fontSize: 13,
                          cursor: submitting ? 'not-allowed' : 'pointer',
                          opacity: submitting ? 0.5 : 1,
                        }}
                      >
                        {submitting ? 'Memproses...' : '✓ Approve'}
                      </button>
                    </div>
                  )}

                  {modal.creator.status === 'verified' && (
                    <div style={{
                      marginTop: 16, padding: 14, borderRadius: 10,
                      background: 'rgba(16,185,129,0.08)', color: '#059669',
                      fontSize: 13, fontWeight: 600, textAlign: 'center',
                    }}>
                      ✓ Sudah diverifikasi pada {modal.creator.creator_verified_at ? new Date(modal.creator.creator_verified_at).toLocaleString('id-ID') : '-'}
                    </div>
                  )}

                  {modal.creator.creator_kyc_rejected_at && (
                    <div style={{
                      marginTop: 16, padding: 14, borderRadius: 10,
                      background: 'rgba(239,68,68,0.08)', color: '#DC2626',
                    }}>
                      <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                        ✗ Pernah ditolak {new Date(modal.creator.creator_kyc_rejected_at).toLocaleString('id-ID')}
                      </p>
                      <p style={{ fontSize: 11 }}>
                        Reason: {modal.creator.creator_kyc_rejection_reason}
                      </p>
                    </div>
                  )}
                </>
              )}

              {modal.type === 'reject' && (
                <>
                  <div style={{
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: 12, padding: 14, marginBottom: 16,
                  }}>
                    <p style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>
                      Penggalang: {modal.creator.creator_full_name ?? modal.creator.name}
                    </p>
                    <p style={{ fontSize: 11, color: '#EF4444', marginTop: 2 }}>
                      Reject akan mengirim sinyal ke penggalang untuk upload ulang.
                    </p>
                  </div>

                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: t.textPrimary, marginBottom: 8 }}>
                    Alasan <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    disabled={submitting}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      border: `1px solid ${t.sidebarBorder}`, background: t.mainBg,
                      color: t.textPrimary, fontSize: 13, marginBottom: 14,
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  >
                    {REJECT_REASONS.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>

                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: t.textPrimary, marginBottom: 8 }}>
                    Notes {rejectReason === 'other' && <span style={{ color: '#EF4444' }}>*</span>}
                  </label>
                  <textarea
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    placeholder={rejectReason === 'other' ? 'Wajib min 10 karakter...' : 'Optional, untuk penjelasan tambahan...'}
                    rows={3}
                    maxLength={500}
                    disabled={submitting}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 12,
                      border: `1px solid ${t.sidebarBorder}`, background: t.mainBg,
                      color: t.textPrimary, fontSize: 13, resize: 'none',
                      fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ fontSize: 10, color: t.textMuted, marginTop: 4, textAlign: 'right' }}>
                    {rejectNotes.length}/500
                  </p>

                  <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => setModal({ type: 'review', creator: modal.creator })}
                      disabled={submitting}
                      style={{
                        flex: 1, padding: '12px 16px', borderRadius: 12,
                        border: `1px solid ${t.sidebarBorder}`, background: 'transparent',
                        color: t.textPrimary, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                      }}
                    >
                      ← Kembali
                    </button>
                    <button
                      onClick={() => handleReject(modal.creator)}
                      disabled={submitting || (rejectReason === 'other' && rejectNotes.trim().length < 10)}
                      style={{
                        flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none',
                        background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                        color: '#fff', fontWeight: 700, fontSize: 13,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        opacity: submitting || (rejectReason === 'other' && rejectNotes.trim().length < 10) ? 0.5 : 1,
                      }}
                    >
                      {submitting ? 'Memproses...' : '✗ Tolak Verifikasi'}
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
    </AdminAuthGuard>
  );
}

// ── Sub Components ────────────────────────────────────────────────

function StatusBadge({ status, rejectedAt }: { status: string; rejectedAt: string | null }) {
  if (rejectedAt) {
    return (
      <span style={badgeStyle('#EF4444')}>
        ✗ Ditolak
      </span>
    );
  }
  if (status === 'verified') {
    return <span style={badgeStyle('#10B981')}>✓ Verified</span>;
  }
  if (status === 'pending_verification') {
    return <span style={badgeStyle('#F59E0B')}>🟡 Pending</span>;
  }
  return <span style={badgeStyle('#6B7280')}>Incomplete</span>;
}

function CreatorReviewBody({ creator, t }: { creator: Creator; t: any }) {
  return (
    <>
      {/* Profile header */}
      <div style={{
        display: 'flex', gap: 14, alignItems: 'center', marginBottom: 18,
        padding: 14, borderRadius: 12, background: t.navHover,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: '#003526', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 700, flexShrink: 0,
        }}>
          {(creator.creator_full_name ?? creator.name ?? '?').charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, marginBottom: 2 }}>
            {creator.creator_full_name ?? creator.name ?? '(Belum diisi)'}
          </p>
          <p style={{ fontSize: 12, color: t.textDim, fontFamily: 'monospace' }}>
            {creator.phone}
          </p>
        </div>
      </div>

      {/* KTP Section */}
      {creator.creator_id_documents && creator.creator_id_documents.length > 0 ? (
        <div style={{
          padding: 14, borderRadius: 12,
          background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🔒 Identitas Penggalang
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
            {/* KTP Photos */}
            <div>
              <p style={{ fontSize: 10, color: t.textMuted, marginBottom: 6, fontWeight: 600 }}>
                📷 Foto KTP ({creator.creator_id_documents.length})
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                {creator.creator_id_documents.map((url, i) => (
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

            {/* Typed Data */}
            <div>
              <p style={{ fontSize: 10, color: t.textMuted, marginBottom: 6, fontWeight: 600 }}>
                📝 Data Yang Diketik
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <p style={{ fontSize: 10, color: t.textMuted, marginBottom: 2 }}>Nama Lengkap (KTP):</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>
                    {creator.creator_full_name ?? '-'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 10, color: t.textMuted, marginBottom: 2 }}>Nama Akun:</p>
                  <p style={{ fontSize: 12, color: t.textPrimary }}>
                    {creator.name ?? '-'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 10, color: t.textMuted, marginBottom: 2 }}>Phone:</p>
                  <p style={{ fontSize: 12, color: t.textPrimary, fontFamily: 'monospace' }}>
                    {creator.phone}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 10, color: t.textMuted, marginBottom: 2 }}>Daftar:</p>
                  <p style={{ fontSize: 12, color: t.textPrimary }}>
                    {creator.created_at ? new Date(creator.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          padding: 14, borderRadius: 12,
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
          fontSize: 12, color: '#B45309',
        }}>
          ⚠️ Penggalang belum upload dokumen identitas.
        </div>
      )}
    </>
  );
}

// ── Style Helpers ─────────────────────────────────────────────────

function thStyle(t: any): React.CSSProperties {
  return {
    padding: '12px 16px', textAlign: 'left',
    fontSize: 11, fontWeight: 700, color: t.textDim,
    textTransform: 'uppercase', letterSpacing: '0.5px',
  };
}

function tdStyle(t: any): React.CSSProperties {
  return {
    padding: '14px 16px', verticalAlign: 'middle',
    color: t.textPrimary,
  };
}

function badgeStyle(color: string): React.CSSProperties {
  return {
    display: 'inline-block', padding: '4px 10px', borderRadius: 6,
    background: `${color}15`, color, fontSize: 11, fontWeight: 700,
  };
}

function paginationBtnStyle(t: any, disabled: boolean): React.CSSProperties {
  return {
    padding: '8px 14px', borderRadius: 8,
    border: `1px solid ${t.sidebarBorder}`, background: 'transparent',
    color: disabled ? t.textMuted : t.textPrimary,
    fontSize: 12, fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
}
