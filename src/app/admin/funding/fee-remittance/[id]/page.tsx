'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { formatRupiah } from '@/utils/format';
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, AlertCircle,
  UserRound, Calendar, Hash, MessageCircle, FileText,
  ExternalLink, ShieldCheck, Calculator, TrendingUp, Clock,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';
const ADMIN_ROLES = ['admin_funding', 'super_admin'];

// ═══════════════════════════════════════════════════════════════
// /admin/funding/fee-remittance/[id]
//
// Phase 4 Detail Admin: review setoran fee dari penggalang.
// Action:
//   - Verify (atomic FIFO match donations + mark remitted)
//   - Reject (with reason min 10 chars)
//
// Filosofi: Backend (Otak) handle FIFO + atomic transaction.
//           Frontend cuma display preview + collect admin notes/reason.
// ═══════════════════════════════════════════════════════════════

// ─── Types ───────────────────────────────────────────────────────

interface CoveredDonation {
  id: string;
  donation_code: string;
  donor_name: string;
  amount: number;
  fee_snapshot?: number;
  operational_fee_current?: number;
  operational_fee?: number;
  verified_at: string;
  campaign_id: string;
}

interface FifoPreview {
  donations: CoveredDonation[];
  total_fee: number;
  surplus: number;
}

interface RemittanceDetail {
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
  // Optional FIFO preview (kalau pending)
  fifo_preview?: FifoPreview;
  // Optional covered donations (kalau verified)
  covered_donations?: CoveredDonation[];
  // Reviewer info
  reviewer?: {
    id: string;
    name: string | null;
    role: string;
  } | null;
  // Owner info
  owner?: {
    id: string;
    name: string | null;
    phone: string;
  } | null;
}

// ─── Helpers ─────────────────────────────────────────────────────

function fmtFull(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtShort(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function isPdf(url: string | null) {
  return !!url && url.toLowerCase().endsWith('.pdf');
}

// ─── Main Page ───────────────────────────────────────────────────

export default function AdminFeeRemittanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { user, token, isLoading: authLoading } = useAuth();

  const [detail, setDetail] = useState<RemittanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (!ADMIN_ROLES.includes(user.role)) { router.push('/'); return; }
  }, [user, authLoading, router]);

  // Fetch detail
  useEffect(() => {
    if (!user || !ADMIN_ROLES.includes(user.role) || !token) return;

    async function fetchDetail() {
      try {
        const res = await fetch(`${API}/funding/admin/fee-remittances/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success && json.data) {
          setDetail(json.data);
        } else {
          setFetchError(json?.error?.message || 'Setoran tidak ditemukan.');
        }
      } catch {
        setFetchError('Gagal memuat detail setoran.');
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [id, user, token]);

  // ─── Action handlers ───

  async function handleVerify() {
    if (!token || !detail) return;
    setSubmitting(true);
    setActionError('');

    try {
      const res = await fetch(`${API}/funding/admin/fee-remittances/${id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          admin_notes: adminNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setActionSuccess('✅ Setoran terverifikasi! Donations terkait sudah ditandai sebagai remitted.');
        setShowVerifyModal(false);
        setTimeout(() => router.push('/admin/funding/fee-remittance'), 1500);
      } else {
        setActionError(json?.error?.message || 'Gagal verify setoran.');
      }
    } catch {
      setActionError('Koneksi bermasalah.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!token || !detail) return;
    if (!rejectReason.trim() || rejectReason.trim().length < 10) {
      setActionError('Alasan penolakan minimal 10 karakter.');
      return;
    }

    setSubmitting(true);
    setActionError('');

    try {
      const res = await fetch(`${API}/funding/admin/fee-remittances/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: rejectReason.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setActionSuccess('❌ Setoran ditolak. Owner akan dapat notifikasi (Phase 5).');
        setShowRejectModal(false);
        setTimeout(() => router.push('/admin/funding/fee-remittance'), 1500);
      } else {
        setActionError(json?.error?.message || 'Gagal reject setoran.');
      }
    } catch {
      setActionError('Koneksi bermasalah.');
    } finally {
      setSubmitting(false);
    }
  }

  // ─── States ───

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0F172A' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#EC4899' }} />
      </div>
    );
  }

  if (fetchError || !detail) {
    return (
      <div style={{ padding: 32, background: '#0F172A', minHeight: '100vh', color: '#fff' }}>
        <Link href="/admin/funding/fee-remittance" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#94A3B8', fontSize: 13, textDecoration: 'none', marginBottom: 16 }}>
          <ArrowLeft size={14} /> Kembali ke daftar setoran
        </Link>
        <div style={{ background: '#1E293B', borderRadius: 12, padding: 32, textAlign: 'center', maxWidth: 480, margin: '60px auto' }}>
          <AlertCircle size={40} style={{ color: '#EF4444', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
            {fetchError || 'Setoran tidak ditemukan'}
          </p>
        </div>
      </div>
    );
  }

  const isPending = detail.status === 'pending';
  const isVerified = detail.status === 'verified';
  const isRejected = detail.status === 'rejected';
  const isLegacy = isVerified && !detail.submitted_at;

  return (
    <div style={{ background: '#0F172A', minHeight: '100vh', color: '#E2E8F0', paddingBottom: 60 }}>
      <div style={{ maxWidth: 1024, margin: '0 auto', padding: '24px 32px' }}>

        {/* Back button */}
        <Link
          href="/admin/funding/fee-remittance"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: '#94A3B8', fontSize: 13, textDecoration: 'none', marginBottom: 16,
          }}
        >
          <ArrowLeft size={14} /> Kembali ke daftar setoran
        </Link>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
            Detail Setoran Fee
          </h1>
          <p style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'monospace' }}>
            ID: {detail.id}
          </p>
        </div>

        {/* Status banner */}
        <StatusBanner status={detail.status} isLegacy={isLegacy} />

        {/* Action result */}
        {actionSuccess && (
          <div style={{ marginBottom: 16, padding: 14, background: '#064E3B', border: '1px solid #047857', borderRadius: 10, color: '#A7F3D0', fontSize: 13 }}>
            {actionSuccess}
          </div>
        )}

        {/* Grid layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {/* Amount card */}
          <Card title="Jumlah Setoran" icon={Calculator}>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>
              {formatRupiah(detail.amount)}
            </p>
            {detail.donation_count > 0 && (
              <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                Cover <strong>{detail.donation_count}</strong> donasi
              </p>
            )}
          </Card>

          {/* Penggalang info */}
          <Card title="Penggalang" icon={UserRound}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
              {detail.partner_name}
            </p>
            {detail.owner?.phone && (
              <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4, fontFamily: 'monospace' }}>
                {detail.owner.phone}
              </p>
            )}
          </Card>
        </div>

        {/* Submission info */}
        <Card title="Informasi Submission" icon={Calendar} fullWidth>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <InfoRow label="Disubmit" value={fmtFull(detail.submitted_at)} />
            {detail.reviewed_at && (
              <InfoRow label={isVerified ? 'Diverifikasi' : 'Direview'} value={fmtFull(detail.reviewed_at)} />
            )}
            {detail.reviewer && (
              <InfoRow label="Direview oleh" value={detail.reviewer.name ?? detail.reviewer.role} />
            )}
            {detail.reference_code && (
              <InfoRow label="Kode Referensi" value={detail.reference_code} mono />
            )}
            {detail.notes && (
              <InfoRow label="Catatan Owner" value={detail.notes} fullWidth />
            )}
          </div>
        </Card>

        {/* Reject reason kalau rejected */}
        {isRejected && detail.review_notes && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 16, marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <XCircle size={18} style={{ color: '#EF4444', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#FCA5A5', textTransform: 'uppercase', marginBottom: 4 }}>
                  Alasan Penolakan
                </p>
                <p style={{ fontSize: 14, color: '#FECACA', lineHeight: 1.5 }}>
                  {detail.review_notes}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bukti transfer */}
        {detail.receipt_url && (
          <Card title="Bukti Transfer" icon={FileText} fullWidth>
            {isPdf(detail.receipt_url) ? (
              <a
                href={detail.receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: 12, background: '#0F172A',
                  border: '1px solid #334155', borderRadius: 10,
                  textDecoration: 'none',
                }}
              >
                <div style={{ width: 48, height: 48, background: '#7F1D1D', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={20} style={{ color: '#FCA5A5' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Bukti Transfer (PDF)</p>
                  <p style={{ fontSize: 11, color: '#94A3B8' }}>Klik untuk buka di tab baru</p>
                </div>
                <ExternalLink size={16} style={{ color: '#94A3B8' }} />
              </a>
            ) : (
              <a href={detail.receipt_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={detail.receipt_url}
                  alt="Bukti transfer"
                  style={{
                    width: '100%', maxHeight: 480, objectFit: 'contain',
                    borderRadius: 10, border: '1px solid #334155',
                  }}
                />
              </a>
            )}
          </Card>
        )}

        {/* FIFO Preview kalau pending */}
        {isPending && detail.fifo_preview && detail.fifo_preview.donations.length > 0 && (
          <Card title="Preview FIFO Match" icon={TrendingUp} fullWidth>
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12 }}>
              Saat verify, {detail.fifo_preview.donations.length} donasi berikut akan otomatis ditandai sebagai remitted (FIFO greedy full-only):
            </p>
            <CoveredDonationsList donations={detail.fifo_preview.donations} />
            <div style={{ marginTop: 12, padding: 12, background: '#0F172A', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>Total Fee Yang Akan Tercover</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#10B981', fontFamily: 'monospace' }}>
                {formatRupiah(detail.fifo_preview.total_fee)}
              </span>
            </div>
            {detail.fifo_preview.surplus > 0 && (
              <div style={{ marginTop: 8, padding: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8 }}>
                <p style={{ fontSize: 11, color: '#FCD34D' }}>
                  ⚠️ Surplus <strong>{formatRupiah(detail.fifo_preview.surplus)}</strong> (5% rounding tolerance) — akan otomatis di-credit ke balance owner.
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Covered donations kalau verified */}
        {isVerified && detail.covered_donations && detail.covered_donations.length > 0 && (
          <Card title={`Donasi Tercover (${detail.covered_donations.length})`} icon={ShieldCheck} fullWidth>
            <CoveredDonationsList donations={detail.covered_donations} />
          </Card>
        )}

        {/* Action buttons (kalau pending) */}
        {isPending && (
          <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowRejectModal(true)}
              style={{
                padding: '12px 24px', fontSize: 13, fontWeight: 700,
                color: '#EF4444', background: 'transparent',
                border: '1px solid #EF4444', borderRadius: 8, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              <XCircle size={14} /> Reject
            </button>
            <button
              onClick={() => setShowVerifyModal(true)}
              style={{
                padding: '12px 24px', fontSize: 13, fontWeight: 700,
                color: '#fff', background: '#10B981',
                border: 'none', borderRadius: 8, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              <CheckCircle2 size={14} /> Verify Setoran
            </button>
          </div>
        )}

        {/* Verify Modal */}
        {showVerifyModal && (
          <Modal title="Verify Setoran" onClose={() => setShowVerifyModal(false)}>
            <p style={{ fontSize: 13, color: '#CBD5E1', marginBottom: 12, lineHeight: 1.6 }}>
              Konfirmasi verify setoran <strong>{formatRupiah(detail.amount)}</strong> dari <strong>{detail.partner_name}</strong>?
            </p>
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16, lineHeight: 1.6 }}>
              Aksi ini akan: (1) mark donations terkait sebagai remitted via FIFO, (2) update fee_remitted di financial summary penggalang. <strong>Tidak bisa di-undo.</strong>
            </p>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
              Catatan Admin (opsional)
            </label>
            <textarea
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              placeholder="Misal: Verified, bukti BCA cocok dengan amount"
              rows={3}
              maxLength={500}
              style={{
                width: '100%', padding: 10, fontSize: 13, color: '#fff',
                background: '#0F172A', border: '1px solid #334155',
                borderRadius: 8, resize: 'vertical', fontFamily: 'inherit',
              }}
              disabled={submitting}
            />

            {actionError && (
              <p style={{ fontSize: 12, color: '#FCA5A5', marginTop: 8 }}>{actionError}</p>
            )}

            <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowVerifyModal(false)}
                disabled={submitting}
                style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, color: '#94A3B8', background: 'transparent', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                onClick={handleVerify}
                disabled={submitting}
                style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, color: '#fff', background: '#10B981', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                {submitting ? 'Memproses...' : 'Konfirmasi Verify'}
              </button>
            </div>
          </Modal>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <Modal title="Reject Setoran" onClose={() => setShowRejectModal(false)}>
            <p style={{ fontSize: 13, color: '#CBD5E1', marginBottom: 12, lineHeight: 1.6 }}>
              Reject setoran <strong>{formatRupiah(detail.amount)}</strong> dari <strong>{detail.partner_name}</strong>?
            </p>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
              Alasan Penolakan <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Misal: Bukti transfer tidak jelas, nominal tidak cocok, dll. (minimal 10 karakter)"
              rows={4}
              maxLength={500}
              style={{
                width: '100%', padding: 10, fontSize: 13, color: '#fff',
                background: '#0F172A', border: '1px solid #334155',
                borderRadius: 8, resize: 'vertical', fontFamily: 'inherit',
              }}
              disabled={submitting}
            />
            <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
              {rejectReason.length}/500 karakter (min 10)
            </p>

            {actionError && (
              <p style={{ fontSize: 12, color: '#FCA5A5', marginTop: 8 }}>{actionError}</p>
            )}

            <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={submitting}
                style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, color: '#94A3B8', background: 'transparent', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                disabled={submitting || rejectReason.trim().length < 10}
                style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, color: '#fff', background: '#EF4444', border: 'none', borderRadius: 6, cursor: rejectReason.trim().length < 10 ? 'not-allowed' : 'pointer', opacity: rejectReason.trim().length < 10 ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                {submitting ? 'Memproses...' : 'Konfirmasi Reject'}
              </button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function StatusBanner({ status, isLegacy }: { status: string | null; isLegacy: boolean }) {
  if (isLegacy) {
    return (
      <div style={{ marginBottom: 16, padding: 16, background: '#1E293B', border: '1px solid #334155', borderRadius: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, background: '#334155', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={18} style={{ color: '#94A3B8' }} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>STATUS</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#94A3B8' }}>Legacy (Admin Direct-Entry)</p>
          </div>
        </div>
        <p style={{ fontSize: 12, color: '#64748B', marginTop: 8, lineHeight: 1.5 }}>
          Record ini dimasukkan admin secara langsung sebelum Phase 2. Tidak ada bukti transfer dari owner.
        </p>
      </div>
    );
  }

  const config: Record<string, { label: string; color: string; bg: string; border: string; description: string; Icon: any }> = {
    pending: {
      label: 'Menunggu Review',
      color: '#FCD34D', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)',
      description: 'Setoran ini menunggu verifikasi admin. Review bukti transfer + verify atau reject.',
      Icon: Clock,
    },
    verified: {
      label: 'Terverifikasi',
      color: '#34D399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)',
      description: 'Setoran sudah dikonfirmasi. Donasi terkait sudah ditandai sebagai remitted.',
      Icon: CheckCircle2,
    },
    rejected: {
      label: 'Ditolak',
      color: '#FCA5A5', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)',
      description: 'Setoran ditolak admin. Owner perlu submit ulang dengan bukti yang benar.',
      Icon: XCircle,
    },
  };
  const c = config[status ?? 'pending'] ?? config.pending;
  const Icon = c.Icon;

  return (
    <div style={{ marginBottom: 16, padding: 16, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} style={{ color: c.color }} />
        </div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: c.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>STATUS</p>
          <p style={{ fontSize: 16, fontWeight: 800, color: c.color }}>{c.label}</p>
        </div>
      </div>
      <p style={{ fontSize: 12, color: c.color, marginTop: 8, lineHeight: 1.5, opacity: 0.85 }}>
        {c.description}
      </p>
    </div>
  );
}

function Card({ title, icon: Icon, children, fullWidth }: { title: string; icon: any; children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div style={{
      background: '#1E293B',
      border: '1px solid #334155',
      borderRadius: 12,
      padding: 16,
      gridColumn: fullWidth ? '1 / -1' : 'auto',
      marginTop: fullWidth ? 16 : 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Icon size={14} style={{ color: '#94A3B8' }} />
        <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </p>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, mono, fullWidth }: { label: string; value: string; mono?: boolean; fullWidth?: boolean }) {
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : 'auto' }}>
      <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 13, color: '#fff', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-word' }}>
        {value}
      </p>
    </div>
  );
}

function CoveredDonationsList({ donations }: { donations: CoveredDonation[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {donations.map(d => {
        const fee = d.fee_snapshot ?? d.operational_fee_current ?? d.operational_fee ?? 0;
        return (
          <div key={d.id} style={{
            padding: 12, background: '#0F172A',
            border: '1px solid #334155', borderRadius: 8,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{d.donor_name}</p>
              <p style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace', marginTop: 2 }}>
                {d.donation_code} · {fmtShort(d.verified_at)}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: '#94A3B8' }}>Donasi: {formatRupiah(d.amount)}</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#10B981', fontFamily: 'monospace' }}>
                Fee: {formatRupiah(fee)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#1E293B', border: '1px solid #334155', borderRadius: 12, padding: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
