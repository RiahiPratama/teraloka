'use client';

import { useEffect, useState, useCallback, useContext } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import AdminFundingSubNav from '@/components/admin/funding/AdminFundingSubNav';
import AdminAuthGuard from '@/components/admin/funding/AdminAuthGuard';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ── Icons ──────────────────────────────────────────────────────
const Icons = {
  Check:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  X:        () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Flag:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  Eye:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Link:     () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  Wallet:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></svg>,
  Clock:    () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  AlertTri: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

// ── Types ──────────────────────────────────────────────────────
type DisbursementStatus = 'pending' | 'verified' | 'flagged' | 'rejected';

interface Campaign {
  id: string;
  title: string;
  slug: string;
  partner_name: string;
  beneficiary_name: string;
}

interface Disbursement {
  id: string;
  campaign_id: string;
  stage_number: number;
  amount: number;
  disbursed_to: string;
  disbursed_at: string;
  method: string;
  evidence_urls: string[];
  handover_photo_url: string | null;
  disbursement_notes: string | null;
  admin_review_notes: string | null;
  beneficiary_phone: string | null;
  beneficiary_ktp_url: string | null;
  status: DisbursementStatus;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  campaigns: Campaign | null;
}

type ModalType = 'detail' | 'verify' | 'reject' | 'flag';

// ── Helpers ────────────────────────────────────────────────────
function formatRupiah(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function shortRupiah(n: number): string {
  if (n >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000_000)     return 'Rp ' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (n >= 1_000)         return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const STATUS_CONFIG: Record<DisbursementStatus, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Menunggu Verifikasi', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  verified: { label: 'Tersalurkan',         color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  flagged:  { label: 'Sedang Direview',     color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
  rejected: { label: 'Tidak Diteruskan',    color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
};

const STATUS_TABS: { key: string; label: string }[] = [
  { key: 'pending',  label: 'Pending'  },
  { key: 'verified', label: 'Verified' },
  { key: 'flagged',  label: 'Flagged'  },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all',      label: 'Semua'    },
];

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════

export default function AdminDisbursementsPage() {
  const { t } = useContext(AdminThemeContext);
  const { token } = useAuth();

  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<string>('pending');
  const [page, setPage]       = useState(1);
  const [subNavKey, setSubNavKey] = useState(0);

  const [stats, setStats] = useState({
    pending: 0, verified_total: 0, flagged: 0,
  });

  const [modal, setModal] = useState<{ type: ModalType; item: Disbursement } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionNotes, setActionNotes]   = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const LIMIT = 20;

  // ── Fetch list ─────────────────────────────────────────────
  const fetchDisbursements = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: activeStatus,
        page: String(page),
        limit: String(LIMIT),
      });
      const res = await fetch(`${API_URL}/funding/admin/disbursements?${params}`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      if (json.success) {
        setDisbursements(json.data ?? []);
        setTotal(json.meta?.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [activeStatus, page]);

  // ── Fetch stats ────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    const headers = { Authorization: `Bearer ${tk}` };
    try {
      const [pendingRes, verifiedRes, flaggedRes] = await Promise.all([
        fetch(`${API_URL}/funding/admin/disbursements?status=pending&limit=1`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/funding/admin/disbursements?status=verified&limit=100`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/funding/admin/disbursements?status=flagged&limit=1`, { headers }).then(r => r.json()).catch(() => null),
      ]);
      const verifiedTotal = (verifiedRes?.data ?? []).reduce(
        (sum: number, d: Disbursement) => sum + Number(d.amount || 0), 0
      );
      setStats({
        pending:        pendingRes?.meta?.total ?? 0,
        verified_total: verifiedTotal,
        flagged:        flaggedRes?.meta?.total ?? 0,
      });
    } catch {}
  }, []);

  useEffect(() => {
    fetchDisbursements();
  }, [fetchDisbursements]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ── Toast helper ───────────────────────────────────────────
  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Actions ────────────────────────────────────────────────
  async function handleVerify() {
    if (!modal) return;
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/funding/admin/disbursements/${modal.item.id}/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: actionNotes.trim() || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(true, `Pencairan Tahap ${modal.item.stage_number} berhasil diverifikasi.`);
        setModal(null);
        setActionNotes('');
        setSubNavKey(k => k + 1);
        await Promise.all([fetchDisbursements(), fetchStats()]);
      } else {
        showToast(false, json.error?.message ?? 'Gagal memverifikasi pencairan.');
      }
    } catch {
      showToast(false, 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!modal) return;
    if (actionReason.trim().length < 10) {
      showToast(false, 'Alasan penolakan minimal 10 karakter.');
      return;
    }
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/funding/admin/disbursements/${modal.item.id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: actionReason.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(true, `Pencairan Tahap ${modal.item.stage_number} ditolak.`);
        setModal(null);
        setActionReason('');
        setSubNavKey(k => k + 1);
        await Promise.all([fetchDisbursements(), fetchStats()]);
      } else {
        showToast(false, json.error?.message ?? 'Gagal menolak pencairan.');
      }
    } catch {
      showToast(false, 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFlag() {
    if (!modal) return;
    if (actionReason.trim().length < 10) {
      showToast(false, 'Alasan flag minimal 10 karakter.');
      return;
    }
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/funding/admin/disbursements/${modal.item.id}/flag`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: actionReason.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(true, `Pencairan Tahap ${modal.item.stage_number} di-flag untuk review.`);
        setModal(null);
        setActionReason('');
        setSubNavKey(k => k + 1);
        await Promise.all([fetchDisbursements(), fetchStats()]);
      } else {
        showToast(false, json.error?.message ?? 'Gagal flag pencairan.');
      }
    } catch {
      showToast(false, 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  function openModal(type: ModalType, item: Disbursement) {
    setActionReason('');
    setActionNotes('');
    setModal({ type, item });
  }

  const totalPages = Math.ceil(total / LIMIT);

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <AdminAuthGuard>
      <div style={{ padding: '24px 32px', maxWidth: 1280, color: t.textPrimary }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#EC4899', letterSpacing: '0.1em', marginBottom: 4 }}>
            BADONASI
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: t.textPrimary, marginBottom: 4 }}>
            Pencairan Dana
          </h1>
          <p style={{ fontSize: 14, color: t.textDim }}>
            Verifikasi pencairan dana dari mitra penggalang ke penerima manfaat.
          </p>
        </div>

        <AdminFundingSubNav refreshKey={subNavKey} />

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
          <StatCard t={t} icon={<Icons.Clock />} label="Menunggu Verifikasi"
            value={stats.pending.toString()} accent="#F59E0B" highlight={stats.pending > 0} />
          <StatCard t={t} icon={<Icons.Wallet />} label="Total Tersalurkan"
            value={shortRupiah(stats.verified_total)} accent="#10B981" />
          <StatCard t={t} icon={<Icons.AlertTri />} label="Perlu Review"
            value={stats.flagged.toString()} accent="#F97316" highlight={stats.flagged > 0} />
        </div>

        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${t.sidebarBorder}` }}>
          {STATUS_TABS.map(tab => {
            const active = activeStatus === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveStatus(tab.key); setPage(1); }}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 600, border: 'none',
                  background: 'none', cursor: 'pointer',
                  color: active ? '#EC4899' : t.textDim,
                  borderBottom: active ? '2px solid #EC4899' : '2px solid transparent',
                  marginBottom: -1,
                  transition: 'color 150ms',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div style={{
          background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
          borderRadius: 16, overflow: 'hidden', marginBottom: 24,
        }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: t.textDim, fontSize: 14 }}>
              Memuat data pencairan...
            </div>
          ) : disbursements.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: t.textDim, fontSize: 14 }}>
              Tidak ada pencairan dengan status ini.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.sidebarBorder}` }}>
                    {['Tahap', 'Kampanye', 'Nominal', 'Penerima', 'Tanggal', 'Metode', 'Status', 'Aksi'].map(h => (
                      <th key={h} style={{
                        padding: '12px 16px', textAlign: 'left', fontSize: 11,
                        fontWeight: 700, color: t.textDim, letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                      }}>
                        {h.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {disbursements.map((d, i) => {
                    const cfg = STATUS_CONFIG[d.status];
                    return (
                      <tr key={d.id} style={{
                        borderBottom: i < disbursements.length - 1 ? `1px solid ${t.sidebarBorder}` : 'none',
                        transition: 'background 150ms',
                      }}>
                        {/* Tahap */}
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#EC4899', fontSize: 15 }}>
                          #{d.stage_number}
                        </td>

                        {/* Kampanye */}
                        <td style={{ padding: '14px 16px', maxWidth: 200 }}>
                          <div style={{ fontWeight: 600, color: t.textPrimary, fontSize: 13, marginBottom: 2 }}>
                            {d.campaigns?.title ?? '—'}
                          </div>
                          <div style={{ fontSize: 11, color: t.textDim }}>
                            {d.campaigns?.partner_name ?? ''}
                          </div>
                        </td>

                        {/* Nominal */}
                        <td style={{ padding: '14px 16px', fontWeight: 800, color: t.textPrimary, fontSize: 15 }}>
                          {formatRupiah(Number(d.amount))}
                        </td>

                        {/* Penerima */}
                        <td style={{ padding: '14px 16px', color: t.textPrimary, maxWidth: 160 }}>
                          <div style={{ fontWeight: 500 }}>{d.disbursed_to}</div>
                          {d.evidence_urls?.[0] && (
                            <a
                              href={d.evidence_urls[0]}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: 11, color: '#0891B2', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 2 }}
                            >
                              <Icons.Link /> Bukti Transfer
                            </a>
                          )}
                        </td>

                        {/* Tanggal */}
                        <td style={{ padding: '14px 16px', color: t.textDim, whiteSpace: 'nowrap', fontSize: 12 }}>
                          {formatDate(d.disbursed_at)}
                        </td>

                        {/* Metode */}
                        <td style={{ padding: '14px 16px', color: t.textDim, fontSize: 12, textTransform: 'capitalize' }}>
                          {d.method}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            background: cfg.bg, color: cfg.color,
                            fontSize: 11, fontWeight: 700, padding: '4px 10px',
                            borderRadius: 999, whiteSpace: 'nowrap',
                          }}>
                            {cfg.label}
                          </span>
                        </td>

                        {/* Aksi */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <ActionBtn label="Detail" color="#6366F1" onClick={() => openModal('detail', d)}>
                              <Icons.Eye />
                            </ActionBtn>
                            {d.status === 'pending' && (
                              <>
                                <ActionBtn label="Verify" color="#10B981" onClick={() => openModal('verify', d)}>
                                  <Icons.Check />
                                </ActionBtn>
                                <ActionBtn label="Flag" color="#F97316" onClick={() => openModal('flag', d)}>
                                  <Icons.Flag />
                                </ActionBtn>
                                <ActionBtn label="Tolak" color="#EF4444" onClick={() => openModal('reject', d)}>
                                  <Icons.X />
                                </ActionBtn>
                              </>
                            )}
                            {d.status === 'flagged' && (
                              <>
                                <ActionBtn label="Verify" color="#10B981" onClick={() => openModal('verify', d)}>
                                  <Icons.Check />
                                </ActionBtn>
                                <ActionBtn label="Tolak" color="#EF4444" onClick={() => openModal('reject', d)}>
                                  <Icons.X />
                                </ActionBtn>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            <PaginationBtn disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</PaginationBtn>
            <span style={{ padding: '8px 16px', fontSize: 13, color: t.textDim }}>
              {page} / {totalPages}
            </span>
            <PaginationBtn disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</PaginationBtn>
          </div>
        )}

      </div>

      {/* ── Toast ─────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toast.ok ? '#10B981' : '#EF4444',
          color: '#fff', borderRadius: 12, padding: '12px 20px',
          fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          maxWidth: 360,
        }}>
          {toast.ok ? '✅ ' : '❌ '}{toast.msg}
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────── */}
      {modal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 24,
          }}
          onClick={e => { if (e.target === e.currentTarget) { setModal(null); } }}
        >
          <div style={{
            background: '#1E293B', borderRadius: 20, padding: 32,
            width: '100%', maxWidth: modal.type === 'detail' ? 560 : 480,
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}>

            {/* DETAIL MODAL */}
            {modal.type === 'detail' && (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F8FAFC', marginBottom: 4 }}>
                  Detail Pencairan — Tahap #{modal.item.stage_number}
                </h2>
                <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 24 }}>
                  {modal.item.campaigns?.title ?? '—'}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <DetailRow label="Nominal" value={formatRupiah(Number(modal.item.amount))} bold />
                  <DetailRow label="Penerima" value={modal.item.disbursed_to} />
                  <DetailRow label="Tanggal Cair" value={formatDate(modal.item.disbursed_at)} />
                  <DetailRow label="Metode" value={modal.item.method} />
                  <DetailRow label="Status">
                    <span style={{
                      background: STATUS_CONFIG[modal.item.status].bg,
                      color: STATUS_CONFIG[modal.item.status].color,
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                    }}>
                      {STATUS_CONFIG[modal.item.status].label}
                    </span>
                  </DetailRow>
                  {modal.item.campaigns?.partner_name && (
                    <DetailRow label="Mitra" value={modal.item.campaigns.partner_name} />
                  )}
                  {modal.item.disbursement_notes && (
                    <DetailRow label="Catatan Mitra" value={modal.item.disbursement_notes} />
                  )}
                  {modal.item.admin_review_notes && (
                    <DetailRow label="Catatan Admin" value={modal.item.admin_review_notes} />
                  )}
                  {modal.item.beneficiary_phone && (
                    <DetailRow label="No. HP Penerima" value={modal.item.beneficiary_phone} />
                  )}
                  {modal.item.verified_at && (
                    <DetailRow label="Diverifikasi" value={formatDate(modal.item.verified_at)} />
                  )}

                  {/* Bukti Transfer */}
                  {modal.item.evidence_urls?.[0] && (
                    <div>
                      <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 8 }}>
                        BUKTI TRANSFER
                      </p>
                      <a
                        href={modal.item.evidence_urls[0]}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '8px 16px', borderRadius: 10,
                          background: 'rgba(8,145,178,0.15)', color: '#0891B2',
                          fontSize: 13, fontWeight: 600, textDecoration: 'none',
                          border: '1px solid rgba(8,145,178,0.3)',
                        }}
                      >
                        <Icons.Link /> Lihat Bukti Transfer
                      </a>
                    </div>
                  )}

                  {/* Foto Serah Terima */}
                  {modal.item.handover_photo_url && (
                    <div>
                      <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 8 }}>
                        FOTO SERAH TERIMA
                      </p>
                      <a
                        href={modal.item.handover_photo_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '8px 16px', borderRadius: 10,
                          background: 'rgba(16,185,129,0.15)', color: '#10B981',
                          fontSize: 13, fontWeight: 600, textDecoration: 'none',
                          border: '1px solid rgba(16,185,129,0.3)',
                        }}
                      >
                        <Icons.Link /> Lihat Foto Serah Terima
                      </a>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setModal(null)}
                  style={{
                    marginTop: 24, width: '100%', padding: '12px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, color: '#94A3B8', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Tutup
                </button>
              </>
            )}

            {/* VERIFY MODAL */}
            {modal.type === 'verify' && (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F8FAFC', marginBottom: 4 }}>
                  Verifikasi Pencairan
                </h2>
                <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24 }}>
                  Tahap #{modal.item.stage_number} — {modal.item.campaigns?.title ?? '—'}
                </p>

                <div style={{
                  background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                  borderRadius: 12, padding: 16, marginBottom: 20,
                }}>
                  <p style={{ fontSize: 13, color: '#10B981', fontWeight: 600, marginBottom: 4 }}>
                    Konfirmasi Pencairan
                  </p>
                  <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.6 }}>
                    Nominal: <strong style={{ color: '#F8FAFC' }}>{formatRupiah(Number(modal.item.amount))}</strong>
                    {' '}kepada <strong style={{ color: '#F8FAFC' }}>{modal.item.disbursed_to}</strong>
                    {' '}pada {formatDate(modal.item.disbursed_at)}.
                  </p>
                  {modal.item.evidence_urls?.[0] && (
                    <a
                      href={modal.item.evidence_urls[0]}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 12, color: '#0891B2', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, textDecoration: 'none' }}
                    >
                      <Icons.Link /> Cek Bukti Transfer
                    </a>
                  )}
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: 8 }}>
                    CATATAN ADMIN (opsional)
                  </label>
                  <textarea
                    value={actionNotes}
                    onChange={e => setActionNotes(e.target.value)}
                    placeholder="Misal: Sudah dicek sesuai bukti transfer..."
                    rows={3}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                      color: '#F8FAFC', fontSize: 13, resize: 'vertical', boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setModal(null)}
                    disabled={submitting}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#94A3B8', fontSize: 13, fontWeight: 600,
                    }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleVerify}
                    disabled={submitting}
                    style={{
                      flex: 2, padding: '12px', borderRadius: 12, cursor: submitting ? 'not-allowed' : 'pointer',
                      background: submitting ? 'rgba(16,185,129,0.4)' : '#10B981',
                      border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                    }}
                  >
                    {submitting ? 'Memverifikasi...' : '✓ Verifikasi Pencairan'}
                  </button>
                </div>
              </>
            )}

            {/* REJECT MODAL */}
            {modal.type === 'reject' && (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F8FAFC', marginBottom: 4 }}>
                  Tolak Pencairan
                </h2>
                <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24 }}>
                  Tahap #{modal.item.stage_number} — {modal.item.campaigns?.title ?? '—'}
                </p>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#EF4444', display: 'block', marginBottom: 8 }}>
                    ALASAN PENOLAKAN <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={e => setActionReason(e.target.value)}
                    placeholder="Jelaskan alasan penolakan (min. 10 karakter)..."
                    rows={4}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.06)', border: `1px solid ${actionReason.length > 0 && actionReason.length < 10 ? '#EF4444' : 'rgba(255,255,255,0.12)'}`,
                      color: '#F8FAFC', fontSize: 13, resize: 'vertical', boxSizing: 'border-box',
                    }}
                  />
                  {actionReason.length > 0 && actionReason.length < 10 && (
                    <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>
                      Minimal 10 karakter ({actionReason.length}/10)
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setModal(null)}
                    disabled={submitting}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#94A3B8', fontSize: 13, fontWeight: 600,
                    }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={submitting || actionReason.trim().length < 10}
                    style={{
                      flex: 2, padding: '12px', borderRadius: 12,
                      cursor: (submitting || actionReason.trim().length < 10) ? 'not-allowed' : 'pointer',
                      background: (submitting || actionReason.trim().length < 10) ? 'rgba(239,68,68,0.4)' : '#EF4444',
                      border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                    }}
                  >
                    {submitting ? 'Menolak...' : '✕ Tolak Pencairan'}
                  </button>
                </div>
              </>
            )}

            {/* FLAG MODAL */}
            {modal.type === 'flag' && (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F8FAFC', marginBottom: 4 }}>
                  Flag untuk Review
                </h2>
                <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24 }}>
                  Tahap #{modal.item.stage_number} — {modal.item.campaigns?.title ?? '—'}
                </p>

                <div style={{
                  background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)',
                  borderRadius: 12, padding: 14, marginBottom: 20,
                }}>
                  <p style={{ fontSize: 12, color: '#F97316', lineHeight: 1.6 }}>
                    Pencairan akan ditandai sebagai "Sedang Direview". Mitra masih bisa melihat status ini.
                    Setelah review selesai, verifikasi atau tolak pencairan.
                  </p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: 8 }}>
                    ALASAN FLAG <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={e => setActionReason(e.target.value)}
                    placeholder="Misal: Bukti transfer tidak terbaca, perlu dokumen tambahan..."
                    rows={4}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.06)', border: `1px solid ${actionReason.length > 0 && actionReason.length < 10 ? '#EF4444' : 'rgba(255,255,255,0.12)'}`,
                      color: '#F8FAFC', fontSize: 13, resize: 'vertical', boxSizing: 'border-box',
                    }}
                  />
                  {actionReason.length > 0 && actionReason.length < 10 && (
                    <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>
                      Minimal 10 karakter ({actionReason.length}/10)
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setModal(null)}
                    disabled={submitting}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#94A3B8', fontSize: 13, fontWeight: 600,
                    }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleFlag}
                    disabled={submitting || actionReason.trim().length < 10}
                    style={{
                      flex: 2, padding: '12px', borderRadius: 12,
                      cursor: (submitting || actionReason.trim().length < 10) ? 'not-allowed' : 'pointer',
                      background: (submitting || actionReason.trim().length < 10) ? 'rgba(249,115,22,0.4)' : '#F97316',
                      border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                    }}
                  >
                    {submitting ? 'Memflag...' : '⚑ Flag untuk Review'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </AdminAuthGuard>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function StatCard({ t, icon, label, value, accent, highlight }: {
  t: any; icon: React.ReactNode; label: string; value: string;
  accent: string; highlight?: boolean;
}) {
  return (
    <div style={{
      background: t.mainBg, border: `1px solid ${highlight ? accent + '55' : t.sidebarBorder}`,
      borderRadius: 16, padding: 20,
      boxShadow: highlight ? `0 0 0 3px ${accent}10` : 'none',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: accent + '18',
        color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
      }}>
        {icon}
      </div>
      <p style={{ fontSize: 12, color: t.textDim, fontWeight: 500, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 800, color: t.textPrimary }}>{value}</p>
    </div>
  );
}

function ActionBtn({ children, label, color, onClick }: {
  children: React.ReactNode; label: string; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '5px 10px', borderRadius: 8, border: `1px solid ${color}33`,
        background: color + '15', color, fontSize: 11, fontWeight: 600,
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {children} {label}
    </button>
  );
}

function DetailRow({ label, value, bold, children }: {
  label: string; value?: string; bold?: boolean; children?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, minWidth: 130, paddingTop: 2 }}>
        {label.toUpperCase()}
      </span>
      {children ?? (
        <span style={{ fontSize: 13, color: '#F8FAFC', fontWeight: bold ? 700 : 400, flex: 1 }}>
          {value ?? '—'}
        </span>
      )}
    </div>
  );
}

function PaginationBtn({ onClick, disabled, children }: {
  onClick: () => void; disabled: boolean; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
        border: '1px solid rgba(255,255,255,0.1)',
        background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
        color: disabled ? '#475569' : '#CBD5E1',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}
