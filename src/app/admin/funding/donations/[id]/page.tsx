'use client';

import { useState, useEffect, useContext, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { formatRupiah } from '@/utils/format';
import { AdminThemeContext, type AdminTheme } from '@/components/admin/AdminThemeContext';
import TrialBalanceTable, { type TrialBalanceSection } from '@/components/admin/funding/TrialBalanceTable';
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, AlertCircle,
  UserRound, Calendar, Phone, Hash, MessageCircle, ImageIcon,
  ExternalLink, ShieldCheck, Calculator, TrendingDown, TrendingUp,
  Copy, Check, Landmark, ChevronDown,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';
const ADMIN_ROLES = ['admin_funding', 'super_admin'];

// ─── Helpers ─────────────────────────────────────────────────────

function formatRupiahInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits ? Number(digits).toLocaleString('id-ID') : '';
}

function parseRupiah(formatted: string): number {
  return Number(formatted.replace(/\D/g, '')) || 0;
}

// ─── Types ───────────────────────────────────────────────────────

interface DonationDetail {
  id: string;
  donor_name: string;
  donor_phone: string | null;
  is_anonymous: boolean;
  amount: number;
  operational_fee: number;
  penggalang_fee?: number;
  total_transfer: number;
  donation_code: string;
  display_id?: string;
  message: string | null;
  transfer_proof_url: string | null;
  verification_status: string;
  rejection_reason: string | null;
  verified_at: string | null;
  verified_by: string | null;
  escalated_to_admin_at: string | null;
  escalation_reason: string | null;
  // ⭐ Discrepancy tracking
  amount_received: number | null;
  discrepancy_amount: number | null;
  // FIX-G-C: Verifier info
  verifier?: {
    id: string;
    name: string | null;
    role: string;
  } | null;
  created_at: string;
  campaigns: {
    id: string;
    title: string;
    slug: string;
    bank_name: string;
    bank_account_number: string;
    bank_account_name: string;
    partner_name: string | null;
    cover_image_url: string | null;
    target_amount: number;
    collected_amount: number;
  };
}

function formatFullDate(date: string): string {
  return new Date(date).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function maskPhone(phone: string | null): string {
  if (!phone) return '-';
  if (phone.length < 8) return phone;
  return phone.slice(0, 4) + '*'.repeat(phone.length - 8) + phone.slice(-4);
}

// [C3-PREMIUM-UI] Status → label + warna semantik (chip header)
function statusMeta(status: string): { label: string; color: string } {
  switch (status) {
    case 'verified':    return { label: 'Terverifikasi',       color: '#10B981' };
    case 'rejected':    return { label: 'Ditolak',             color: '#EF4444' };
    case 'under_audit': return { label: 'Tahan Audit',         color: '#8B5CF6' };
    default:            return { label: 'Menunggu Verifikasi', color: '#F59E0B' };
  }
}

// ─── Main Page ───────────────────────────────────────────────────

export default function AdminDonationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { user, token, isLoading: authLoading } = useAuth();
  const { t, dark } = useContext(AdminThemeContext);

  const [donation, setDonation] = useState<DonationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  // [BADONASI-FINANCIAL-TABLE] Jurnal akuntansi (accordion, lazy fetch saat expand)
  const [tbOpen, setTbOpen] = useState(false);
  const [tb, setTb] = useState<any>(null);
  const [tbLoading, setTbLoading] = useState(false);
  const [tbError, setTbError] = useState('');
  const [tbLoaded, setTbLoaded] = useState(false);

  // ⭐ Discrepancy: nominal yang masuk ke rekening (input admin)
  const [amountReceived, setAmountReceived] = useState('');
  // [REMEDIASI-02C3] Keputusan selisih (admin: hanya 2 opsi valid)
  const [decision, setDecision] = useState<'' | 'accepted_partial' | 'accepted_excess'>('');

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (!ADMIN_ROLES.includes(user.role)) { router.push('/'); return; }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !ADMIN_ROLES.includes(user.role)) return;

    async function fetchDonation() {
      try {
        const res = await fetch(`${API}/funding/donations/${id}`);
        const json = await res.json();
        if (json.success && json.data) {
          setDonation(json.data);
          // Pre-fill kalau sudah pernah diisi sebelumnya
          if (json.data.amount_received) {
            setAmountReceived(Number(json.data.amount_received).toLocaleString('id-ID'));
          }
        } else {
          setFetchError(json?.error?.message || 'Donasi tidak ditemukan.');
        }
      } catch {
        setFetchError('Gagal memuat donasi.');
      } finally {
        setLoading(false);
      }
    }
    fetchDonation();
  }, [id, user]);

  async function handleAction(action: 'verify' | 'reject') {
    if (!token || !donation) return;
    if (action === 'reject' && !rejectReason.trim()) {
      setActionError('Alasan reject wajib diisi.');
      return;
    }

    const amountReceivedNum = parseRupiah(amountReceived);
    // [REMEDIASI-02C3] Selisih nominal → wajib pilih keputusan sebelum verify
    const isMismatchSubmit = amountReceivedNum > 0 && amountReceivedNum !== donation.total_transfer;
    if (action === 'verify' && isMismatchSubmit && !decision) {
      setActionError('Pilih keputusan untuk selisih nominal dulu.');
      return;
    }

    setSubmitting(true);
    setActionError('');

    try {
      const res = await fetch(`${API}/funding/donations/${id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          reason: action === 'reject' ? rejectReason.trim() : undefined,
          // ⭐ Kirim amount_received kalau ada
          amount_received: amountReceivedNum > 0 ? amountReceivedNum : undefined,
          // [REMEDIASI-02C3] Kirim keputusan hanya saat verify mismatch (exact → undefined)
          discrepancy_decision: (action === 'verify' && isMismatchSubmit && decision) ? decision : undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setActionSuccess(
          action === 'verify'
            ? '✅ Donasi berhasil diverifikasi. Total campaign sudah auto-increment.'
            : '❌ Donasi berhasil di-reject.'
        );
        setShowRejectModal(false);
        setTimeout(() => router.push('/admin/funding/donations'), 1500);
      } else {
        // [REMEDIASI-02C3] Error map kontrak backend C2
        const code = json?.error?.code;
        if (code === 'DECISION_REQUIRED') {
          setActionError('Donasi ini selisih nominal — pilih keputusan (terima sebagian / kelebihan jadi tip) lalu verify lagi.');
        } else if (code === 'VALIDATION_ERROR') {
          setActionError(json?.error?.message || 'Nominal tidak sesuai jenis keputusan.');
        } else if (code === 'DECISION_NOT_ALLOWED_ADMIN') {
          setActionError('Keputusan ini hanya tersedia via jalur penggalang.');
        } else {
          setActionError(json?.error?.message || 'Gagal memproses.');
        }
      }
    } catch {
      setActionError('Koneksi bermasalah.');
    } finally {
      setSubmitting(false);
    }
  }

  // [C3-PREMIUM-UI] Salin no rekening tujuan (visual affordance, no logic)
  function copyAccount() {
    const num = donation?.campaigns?.bank_account_number;
    if (!num) return;
    navigator.clipboard?.writeText(String(num))
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })
      .catch(() => {});
  }

  // [BADONASI-FINANCIAL-TABLE] Lazy fetch jurnal Db/Cr (admin trial-balance) sekali saja
  async function loadTrialBalance() {
    if (!token) return;
    setTbLoading(true);
    setTbError('');
    try {
      const res = await fetch(`${API}/funding/admin/donations/${id}/trial-balance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.success) setTb(json.data);
      else setTbError(json?.error?.message || 'Gagal memuat jurnal.');
    } catch {
      setTbError('Koneksi bermasalah.');
    } finally {
      setTbLoading(false);
      setTbLoaded(true);
    }
  }

  function toggleTrialBalance() {
    const next = !tbOpen;
    setTbOpen(next);
    if (next && !tbLoaded && !tbLoading) loadTrialBalance();
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin" style={{ color: t.accent }} />
      </div>
    );
  }

  if (!user || !ADMIN_ROLES.includes(user.role)) return null;

  if (fetchError || !donation) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Link href="/admin/funding/donations" className="inline-flex items-center gap-1.5 text-sm font-semibold mb-4" style={{ color: t.textMuted }}>
          <ArrowLeft size={16} /> Kembali ke Daftar
        </Link>
        <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertCircle size={32} style={{ color: '#EF4444' }} className="mx-auto mb-2" />
          <p className="text-sm font-bold" style={{ color: '#F87171' }}>{fetchError || 'Donasi tidak ditemukan'}</p>
        </div>
      </div>
    );
  }

  const isPending = donation.verification_status === 'pending_review' || donation.verification_status === 'pending';
  const isVerified = donation.verification_status === 'verified';
  const isRejected = donation.verification_status === 'rejected';

  // ⭐ Discrepancy calculation
  const amountReceivedNum = parseRupiah(amountReceived);
  const hasAmountInput = amountReceivedNum > 0;
  const discrepancy = hasAmountInput ? amountReceivedNum - donation.total_transfer : 0;
  const isUnderPaid = discrepancy < 0;
  const isOverPaid = discrepancy > 0;
  const isExact = discrepancy === 0 && hasAmountInput;

  const statMeta = statusMeta(donation.verification_status);
  const card: React.CSSProperties = { background: t.card, border: `1px solid ${t.cardBorder}` };
  const verifyTextColor = dark ? '#06231A' : '#FFFFFF'; // kontras di atas solid accent

  // [BADONASI-FINANCIAL-TABLE] Map payload books → sections TrialBalanceTable
  const bookLabel = (p: string) =>
    p === 'partner' ? 'Buku Partner' : p === 'badonasi' ? 'Buku BADONASI' : p;
  const tbSections: TrialBalanceSection[] = (tb?.books ?? []).map((b: any) => ({
    label: bookLabel(b.perspective),
    rows: b.rows ?? [],
    total_debit: b.totals?.debit ?? 0,
    total_credit: b.totals?.credit ?? 0,
    balanced: !!b.totals?.balanced,
  }));

  // [C3-PREMIUM-UI] Progress kampanye (sekunder) — guard bagi-nol / NaN
  const campTarget = Number(donation.campaigns?.target_amount) || 0;
  const campCollected = Number(donation.campaigns?.collected_amount) || 0;
  const campHasTarget = campTarget > 0;
  const campPct = campHasTarget ? Math.min(100, Math.round((campCollected / campTarget) * 100)) : 0;

  return (
    <div className="p-6 max-w-3xl mx-auto pb-8" style={{ color: t.textPrimary }}>
      {/* Back */}
      <Link
        href="/admin/funding/donations"
        className="inline-flex items-center gap-1.5 text-sm font-semibold mb-5 hover:opacity-80 transition-opacity"
        style={{ color: t.textMuted }}
      >
        <ArrowLeft size={16} /> Kembali ke Daftar
      </Link>

      {/* Header */}
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold" style={{ color: t.textPrimary }}>Review Donasi</h1>
          <p className="text-sm mt-1" style={{ color: t.textDim }}>
            Kode <span className="font-mono" style={{ color: t.textMuted }}>{donation.display_id ?? donation.donation_code}</span>
            {' · '}ID <span className="font-mono">{donation.id.slice(0, 8)}…</span>
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider shrink-0"
          style={{ background: `${statMeta.color}1f`, color: statMeta.color }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: statMeta.color }} />
          {statMeta.label}
        </span>
      </div>

      {/* ⭐ HERO — angka yang harus dicocokkan admin + rekening tujuan */}
      <div className="rounded-2xl p-5 mb-4" style={{ background: t.card, border: `1px solid ${t.accentDim}` }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider font-semibold mb-1" style={{ color: t.textMuted }}>
              Total transfer harus cocok
            </p>
            <p className="text-3xl font-extrabold leading-tight" style={{ color: t.accent, fontVariantNumeric: 'tabular-nums' }}>
              {formatRupiah(donation.total_transfer)}
            </p>
            <p className="text-xs mt-1.5" style={{ color: t.textDim }}>
              Cocokkan PERSIS dengan mutasi rekening tujuan.
            </p>
          </div>

          {donation.campaigns?.bank_account_number && (
            <div className="rounded-xl px-3.5 py-3 min-w-[200px]" style={{ background: t.cardInner, border: `1px solid ${t.cardBorder}` }}>
              <div className="flex items-center gap-1.5 mb-1.5" style={{ color: t.textMuted }}>
                <Landmark size={13} />
                <span className="text-[10px] uppercase tracking-wider font-semibold">Rekening Tujuan</span>
              </div>
              <p className="text-sm font-bold" style={{ color: t.textPrimary }}>{donation.campaigns?.bank_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-mono" style={{ color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                  {donation.campaigns?.bank_account_number}
                </span>
                <button
                  onClick={copyAccount}
                  title="Salin nomor rekening"
                  className="inline-flex items-center justify-center rounded-md transition-colors"
                  style={{ width: 24, height: 24, background: t.card, border: `1px solid ${t.cardBorder}`, color: copied ? t.accent : t.textMuted, cursor: 'pointer' }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
              {donation.campaigns?.bank_account_name && (
                <p className="text-[11px] mt-1" style={{ color: t.textDim }}>a.n. {donation.campaigns?.bank_account_name}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Escalation banner */}
      {donation.escalated_to_admin_at && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <div className="flex items-center gap-2.5 mb-1">
            <AlertCircle size={16} style={{ color: '#F59E0B' }} />
            <p className="text-sm font-bold" style={{ color: '#FBBF24' }}>Auto-Escalated ke Admin</p>
          </div>
          {donation.escalation_reason && (
            <p className="text-xs leading-relaxed pl-[26px]" style={{ color: t.textMuted }}>
              <strong style={{ color: t.textPrimary }}>Alasan:</strong> {donation.escalation_reason}
            </p>
          )}
          <p className="text-[10px] pl-[26px] mt-1" style={{ color: t.textDim }}>
            Di-escalate {formatFullDate(donation.escalated_to_admin_at)}
          </p>
        </div>
      )}

      {/* Status banner — verified */}
      {isVerified && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} style={{ color: '#10B981' }} className="shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="text-sm font-bold" style={{ color: '#34D399' }}>Sudah Terverifikasi</p>
                {donation.verifier && <RoleBadge role={donation.verifier.role} />}
              </div>
              <p className="text-xs" style={{ color: t.textMuted }}>
                Diverifikasi pada {formatFullDate(donation.verified_at!)}
              </p>
              {donation.verifier && (
                <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
                  oleh <strong style={{ color: t.textPrimary }}>{donation.verifier.name || 'Admin'}</strong>
                </p>
              )}
              {/* Show recorded discrepancy if any */}
              {donation.amount_received && (
                <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(16,185,129,0.2)' }}>
                  <p className="text-xs" style={{ color: t.textMuted }}>
                    Nominal diterima: <strong style={{ color: t.textPrimary }}>{formatRupiah(donation.amount_received)}</strong>
                    {donation.discrepancy_amount !== null && donation.discrepancy_amount !== 0 && (
                      <span className="ml-2 font-bold" style={{ color: donation.discrepancy_amount < 0 ? '#EF4444' : '#F59E0B' }}>
                        ({donation.discrepancy_amount > 0 ? '+' : ''}{formatRupiah(donation.discrepancy_amount)})
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status banner — rejected */}
      {isRejected && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <div className="flex items-start gap-3">
            <XCircle size={20} style={{ color: '#EF4444' }} className="shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="text-sm font-bold" style={{ color: '#F87171' }}>Di-reject</p>
                {donation.verifier && <RoleBadge role={donation.verifier.role} />}
              </div>
              {donation.verifier && (
                <p className="text-xs mb-1" style={{ color: t.textMuted }}>
                  oleh <strong style={{ color: t.textPrimary }}>{donation.verifier.name || 'Admin'}</strong>
                  {donation.verified_at && ` · ${formatFullDate(donation.verified_at)}`}
                </p>
              )}
              {donation.rejection_reason && (
                <p className="text-xs mt-1" style={{ color: t.textMuted }}>
                  <strong style={{ color: t.textPrimary }}>Alasan:</strong> {donation.rejection_reason}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success toast */}
      {actionSuccess && (
        <div className="rounded-2xl p-4 mb-4 flex items-center gap-3" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <CheckCircle2 size={20} style={{ color: '#10B981' }} />
          <p className="text-sm font-bold" style={{ color: '#34D399' }}>{actionSuccess}</p>
        </div>
      )}

      {/* Context sekunder — campaign + donor (diciutkan) */}
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        {/* Campaign */}
        <Link
          href={`/fundraising/${donation.campaigns?.slug ?? ''}`}
          target="_blank"
          className="rounded-2xl p-4 flex items-start gap-3 hover:opacity-90 transition-opacity"
          style={card}
        >
          {donation.campaigns?.cover_image_url ? (
            <img src={donation.campaigns?.cover_image_url} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-11 h-11 rounded-xl shrink-0" style={{ background: t.cardInner }} />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: t.textMuted }}>Campaign</p>
            <p className="text-sm font-bold truncate" style={{ color: t.textPrimary }}>{donation.campaigns?.title}</p>
            {donation.campaigns?.partner_name && (
              <p className="text-xs truncate mt-0.5" style={{ color: t.textDim }}>{donation.campaigns?.partner_name}</p>
            )}
            {/* [C3-PREMIUM-UI] Progress kampanye — sekunder, guard target 0/null */}
            {campHasTarget ? (
              <div className="mt-2">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: t.cardInner }}>
                  <div className="h-full rounded-full" style={{ width: `${campPct}%`, background: t.accent }} />
                </div>
                <p className="text-[10px] mt-1" style={{ color: t.textDim }}>
                  {formatRupiah(campCollected)} / {formatRupiah(campTarget)} · {campPct}%
                </p>
              </div>
            ) : campCollected > 0 ? (
              <p className="text-[10px] mt-2" style={{ color: t.textDim }}>
                Terkumpul {formatRupiah(campCollected)}
              </p>
            ) : null}
          </div>
          <ExternalLink size={14} style={{ color: t.textDim }} className="shrink-0 mt-0.5" />
        </Link>

        {/* Donor */}
        <div className="rounded-2xl p-4" style={card}>
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: t.textMuted }}>Donor</p>
          <div className="flex items-center gap-2.5 mb-1.5">
            <UserRound size={15} style={{ color: t.textDim }} className="shrink-0" />
            <p className="text-sm font-bold truncate" style={{ color: t.textPrimary }}>{donation.donor_name}</p>
            {donation.is_anonymous && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: t.cardInner, color: t.textMuted }}>ANONIM</span>
            )}
          </div>
          {donation.donor_phone && (
            <div className="flex items-center gap-2.5 mb-1.5">
              <Phone size={15} style={{ color: t.textDim }} className="shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-mono" style={{ color: t.textMuted }}>{donation.donor_phone}</p>
                <p className="text-[10px]" style={{ color: t.textDim }}>Publik: {maskPhone(donation.donor_phone)}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <Calendar size={15} style={{ color: t.textDim }} className="shrink-0" />
            <span className="text-xs" style={{ color: t.textMuted }}>{formatFullDate(donation.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Rincian Transfer — struk */}
      <div className="rounded-2xl p-5 mb-4" style={card}>
        <div className="flex items-center gap-2 mb-3">
          <Calculator size={15} style={{ color: t.textMuted }} />
          <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: t.textMuted }}>Rincian Transfer</p>
        </div>
        <div className="text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <StrukRow label="Donasi" value={formatRupiah(donation.amount)} t={t} />
          {donation.operational_fee > 0 && (
            <StrukRow label="Biaya operasional" value={formatRupiah(donation.operational_fee)} t={t} />
          )}
          {(donation.penggalang_fee ?? 0) > 0 && (
            <StrukRow label="Fee penggalang" value={formatRupiah(donation.penggalang_fee!)} t={t} />
          )}
          <StrukRow
            label={<span className="inline-flex items-center gap-1.5"><Hash size={11} /> Kode unik</span>}
            value={<span className="font-mono">{donation.display_id ?? donation.donation_code}</span>}
            t={t}
          />
          <div className="flex justify-between items-baseline pt-2.5 mt-1" style={{ borderTop: `1px solid ${t.cardBorder}` }}>
            <span className="text-sm font-bold" style={{ color: t.textPrimary }}>TOTAL TRANSFER</span>
            <span className="text-base font-extrabold" style={{ color: t.accent, fontVariantNumeric: 'tabular-nums' }}>
              {formatRupiah(donation.total_transfer)}
            </span>
          </div>
        </div>
      </div>

      {/* ⭐ Discrepancy Input + Picker C3 (LOGIKA TIDAK DIUBAH) */}
      {isPending && (
        <div className="rounded-2xl p-5 mb-4" style={card}>
          <div className="flex items-center gap-2 mb-1">
            <Calculator size={15} style={{ color: t.textMuted }} />
            <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: t.textMuted }}>
              Nominal Diterima di Rekening
            </p>
            <span className="ml-auto text-[10px] font-medium" style={{ color: t.textDim }}>Opsional — dianjurkan</span>
          </div>
          <p className="text-[11px] mb-3" style={{ color: t.textDim }}>
            Input nominal dari mutasi rekening untuk cek selisih otomatis.
          </p>

          <div className="relative mb-3">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: t.textDim }}>Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={amountReceived}
              onChange={e => { setAmountReceived(formatRupiahInput(e.target.value)); setDecision(''); }}
              placeholder={donation.total_transfer.toLocaleString('id-ID')}
              className="w-full pl-9 pr-4 py-3 rounded-xl text-sm font-mono focus:outline-none"
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }}
            />
          </div>

          {/* Analysis card */}
          {isExact && (
            <div className="rounded-xl px-4 py-3 flex items-center gap-2.5" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <CheckCircle2 size={16} style={{ color: '#10B981' }} className="shrink-0" />
              <div>
                <p className="text-sm font-bold" style={{ color: '#34D399' }}>Sesuai persis</p>
                <p className="text-xs" style={{ color: t.textMuted }}>Nominal transfer cocok. Aman untuk di-verify.</p>
              </div>
            </div>
          )}

          {isUnderPaid && (
            <div className="space-y-2.5">
              <div className="rounded-xl px-4 py-3 flex items-start gap-2.5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <TrendingDown size={16} style={{ color: '#EF4444' }} className="shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-bold" style={{ color: '#F87171' }}>Kurang bayar {formatRupiah(Math.abs(discrepancy))}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: t.textMuted }}>
                    Nominal masuk <strong style={{ color: t.textPrimary }}>{formatRupiah(amountReceivedNum)}</strong> — dari seharusnya {formatRupiah(donation.total_transfer)}.
                  </p>
                </div>
              </div>
              {/* [REMEDIASI-02C3] Picker keputusan — underpaid → accepted_partial (full-width) */}
              <button
                type="button"
                onClick={() => setDecision(decision === 'accepted_partial' ? '' : 'accepted_partial')}
                className="w-full text-left rounded-xl px-4 py-3 transition"
                style={{
                  border: `2px solid ${decision === 'accepted_partial' ? t.accent : t.cardBorder}`,
                  background: decision === 'accepted_partial' ? `${t.accent}14` : t.cardInner,
                }}
              >
                <p className="text-xs font-bold" style={{ color: t.textPrimary }}>
                  {decision === 'accepted_partial' ? '✓ ' : ''}Terima sebagian (kurang bayar)
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: t.textMuted }}>
                  Dana tercatat = nominal diterima ({formatRupiah(amountReceivedNum)}).
                </p>
              </button>
              <p className="text-[11px]" style={{ color: t.textDim }}>
                Atau REJECT (tombol di bawah) untuk minta donor transfer ulang dengan nominal persis.
              </p>
            </div>
          )}

          {isOverPaid && (
            <div className="space-y-2.5">
              <div className="rounded-xl px-4 py-3 flex items-start gap-2.5" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <TrendingUp size={16} style={{ color: '#F59E0B' }} className="shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-bold" style={{ color: '#FBBF24' }}>Lebih bayar {formatRupiah(discrepancy)}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: t.textMuted }}>
                    Nominal masuk <strong style={{ color: t.textPrimary }}>{formatRupiah(amountReceivedNum)}</strong> — lebih dari seharusnya. Kelebihan dicatat otomatis.
                  </p>
                </div>
              </div>
              {/* [REMEDIASI-02C3] Picker keputusan — overpaid → accepted_excess (full-width) */}
              <button
                type="button"
                onClick={() => setDecision(decision === 'accepted_excess' ? '' : 'accepted_excess')}
                className="w-full text-left rounded-xl px-4 py-3 transition"
                style={{
                  border: `2px solid ${decision === 'accepted_excess' ? t.accent : t.cardBorder}`,
                  background: decision === 'accepted_excess' ? `${t.accent}14` : t.cardInner,
                }}
              >
                <p className="text-xs font-bold" style={{ color: t.textPrimary }}>
                  {decision === 'accepted_excess' ? '✓ ' : ''}Terima + kelebihan jadi tip
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: t.textMuted }}>
                  Beneficiary terima penuh; kelebihan {formatRupiah(discrepancy)} dicatat sebagai tip.
                </p>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Message */}
      {donation.message && (
        <div className="rounded-2xl p-5 mb-4" style={card}>
          <div className="flex items-center gap-2 mb-2.5">
            <MessageCircle size={15} style={{ color: t.textMuted }} />
            <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: t.textMuted }}>Doa / Harapan</p>
          </div>
          <p className="text-sm italic leading-relaxed rounded-xl p-3" style={{ color: t.textMuted, background: t.cardInner, border: `1px solid ${t.cardBorder}` }}>
            &ldquo;{donation.message}&rdquo;
          </p>
        </div>
      )}

      {/* Bukti transfer */}
      <div className="rounded-2xl p-5 mb-4" style={card}>
        <div className="flex items-center gap-2 mb-3">
          <ImageIcon size={15} style={{ color: t.textMuted }} />
          <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: t.textMuted }}>Bukti Transfer</p>
        </div>
        {donation.transfer_proof_url ? (
          <a href={donation.transfer_proof_url} target="_blank" rel="noopener noreferrer"
            className="block rounded-xl overflow-hidden transition-colors"
            style={{ background: t.cardInner, border: `1px solid ${t.cardBorder}` }}>
            <img src={donation.transfer_proof_url} alt="Bukti transfer"
              className="w-full max-h-[500px] object-contain" style={{ background: t.deepBg }} />
            <div className="py-2 text-center" style={{ background: t.cardInner, borderTop: `1px solid ${t.cardBorder}` }}>
              <p className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: t.textMuted }}>
                <ExternalLink size={11} /> Klik untuk ukuran penuh
              </p>
            </div>
          </a>
        ) : (
          <div className="py-8 text-center rounded-xl" style={{ background: t.cardInner }}>
            <AlertCircle size={24} style={{ color: t.textDim }} className="mx-auto mb-2" />
            <p className="text-sm" style={{ color: t.textMuted }}>Bukti transfer belum di-upload</p>
          </div>
        )}
      </div>

      {/* [BADONASI-FINANCIAL-TABLE] Jurnal Akuntansi · Trial Balance (accordion, lazy, audit) */}
      <div className="rounded-2xl mb-4 overflow-hidden" style={card}>
        <button
          onClick={toggleTrialBalance}
          className="w-full flex items-center justify-between p-5"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <span className="flex items-center gap-2">
            <Calculator size={15} style={{ color: t.textMuted }} />
            <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: t.textMuted }}>
              Jurnal Akuntansi · Trial Balance
            </span>
          </span>
          <span style={{
            display: 'inline-flex', color: t.textDim,
            transform: tbOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms',
          }}>
            <ChevronDown size={16} />
          </span>
        </button>
        {tbOpen && (
          <div className="px-5 pb-5">
            {tbLoading ? (
              <p className="text-xs" style={{ color: t.textDim }}>Memuat jurnal…</p>
            ) : tbError ? (
              <div className="text-xs rounded-xl px-3 py-2" style={{ color: '#F87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                ⚠ {tbError}
              </div>
            ) : (tb?.flags?.no_journal || tbSections.length === 0) ? (
              <p className="text-xs" style={{ color: t.textDim }}>
                Jurnal terbit setelah donasi diverifikasi.
              </p>
            ) : (
              <TrialBalanceTable sections={tbSections} t={t} />
            )}
          </div>
        )}
      </div>

      {/* Action error */}
      {actionError && (
        <div className="rounded-xl p-3 mb-4 flex items-start gap-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertCircle size={14} style={{ color: '#EF4444' }} className="shrink-0 mt-0.5" />
          <p className="text-xs" style={{ color: '#F87171' }}>{actionError}</p>
        </div>
      )}

      {/* ⭐ Action bar — sticky bottom */}
      {isPending && !actionSuccess && (
        <div className="sticky bottom-0 z-30 mt-2 rounded-t-2xl" style={{ background: t.mainBg, borderTop: `1px solid ${t.cardBorder}`, boxShadow: '0 -8px 24px rgba(0,0,0,0.25)' }}>
          {/* [C3-PREMIUM-UI] Sticky (bukan fixed): bar jadi child wrapper max-w-3xl yg SAMA dgn kartu → left/right edge identik otomatis. fixed+left-0 dulu mengabaikan sidebar layout (md:ml-[256px]) → tombol nyembul/melar. */}
            {/* Discrepancy warning strip di atas tombol */}
            {isUnderPaid && (
              <div className="py-2 flex items-center gap-2" style={{ color: '#F87171' }}>
                <TrendingDown size={13} className="shrink-0" />
                <p className="text-xs font-bold">
                  KURANG BAYAR {formatRupiah(Math.abs(discrepancy))} — {decision === 'accepted_partial' ? 'Terima sebagian dipilih' : 'Pilih keputusan atau REJECT'}
                </p>
              </div>
            )}
            {isOverPaid && (
              <div className="py-2 flex items-center gap-2" style={{ color: '#FBBF24' }}>
                <TrendingUp size={13} className="shrink-0" />
                <p className="text-xs font-bold">
                  LEBIH BAYAR {formatRupiah(discrepancy)} — {decision === 'accepted_excess' ? 'Terima kelebihan dipilih' : 'Pilih keputusan dulu'}
                </p>
              </div>
            )}
            {isExact && (
              <div className="py-2 flex items-center gap-2" style={{ color: '#34D399' }}>
                <CheckCircle2 size={13} className="shrink-0" />
                <p className="text-xs font-bold">SESUAI PERSIS — Aman untuk di-verify</p>
              </div>
            )}

            <div className="py-4 flex gap-3">
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={submitting}
                className="flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl text-sm font-bold transition-colors disabled:opacity-50 hover:opacity-80"
                style={{ background: 'transparent', border: `1px solid ${t.cardBorder}`, color: '#F87171' }}
              >
                <XCircle size={18} />
                Tolak
              </button>
              <button
                onClick={() => handleAction('verify')}
                disabled={submitting || ((isUnderPaid || isOverPaid) && !decision)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold shadow-md hover:opacity-95 transition-all disabled:opacity-50"
                style={{ background: t.accent, color: verifyTextColor }}
              >
                {submitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    Verifikasi Donasi
                  </>
                )}
              </button>
            </div>
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => !submitting && setShowRejectModal(false)}>
          <div className="rounded-2xl max-w-md w-full p-6" style={{ background: t.card, border: `1px solid ${t.cardBorder}` }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.12)' }}>
                <XCircle size={22} style={{ color: '#EF4444' }} />
              </div>
              <h3 className="text-lg font-bold" style={{ color: t.textPrimary }}>Reject Donasi</h3>
            </div>

            {/* Show discrepancy context in reject modal */}
            {isUnderPaid && (
              <div className="mb-3 rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <p className="text-xs font-bold" style={{ color: '#F87171' }}>
                  Kurang bayar {formatRupiah(Math.abs(discrepancy))} — cantumkan di alasan reject di bawah.
                </p>
              </div>
            )}

            <p className="text-sm mb-4 leading-relaxed" style={{ color: t.textMuted }}>
              Alasan akan dikirim ke donor. Pastikan jelas agar donor bisa memperbaiki.
            </p>

            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder={isUnderPaid
                ? `Nominal transfer Rp ${amountReceivedNum.toLocaleString('id-ID')} tidak sesuai (seharusnya Rp ${donation.total_transfer.toLocaleString('id-ID')}). Mohon transfer ulang dengan nominal persis termasuk kode unik.`
                : 'Contoh: Nominal transfer tidak sesuai. Mohon transfer ulang dengan nominal persis.'}
              rows={4}
              maxLength={500}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }}
            />
            <p className="text-right text-xs mt-1" style={{ color: t.textDim }}>{rejectReason.length}/500</p>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 hover:opacity-80"
                style={{ background: t.cardInner, color: t.textPrimary }}
              >
                Batal
              </button>
              <button
                onClick={() => handleAction('reject')}
                disabled={submitting || !rejectReason.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 hover:opacity-90"
                style={{ background: '#DC2626', color: '#fff' }}
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Kirim Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Struk row (rincian transfer) ────────────────────────────────

function StrukRow({ label, value, t }: { label: React.ReactNode; value: React.ReactNode; t: AdminTheme }) {
  return (
    <div className="flex justify-between items-baseline py-1">
      <span style={{ color: t.textMuted }}>{label}</span>
      <span className="font-semibold" style={{ color: t.textPrimary }}>{value}</span>
    </div>
  );
}

// ─── RoleBadge ───────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const meta = (() => {
    switch (role) {
      case 'super_admin':    return { label: 'Super Admin',     color: '#A78BFA', bg: 'rgba(124,58,237,0.18)', icon: '⭐' };
      case 'admin_funding':  return { label: 'Admin BADONASI',  color: '#34D399', bg: 'rgba(16,185,129,0.18)', icon: '🛡️' };
      case 'admin_content':  return { label: 'Admin Konten',    color: '#60A5FA', bg: 'rgba(37,99,235,0.18)',  icon: '📝' };
      case 'user':           return { label: 'Penggalang',      color: '#9CA3AF', bg: 'rgba(156,163,175,0.18)', icon: '👤' };
      default:               return { label: role,              color: '#9CA3AF', bg: 'rgba(156,163,175,0.18)', icon: '🔹' };
    }
  })();
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ background: meta.bg, color: meta.color }}>
      <span style={{ fontSize: 9 }}>{meta.icon}</span>
      {meta.label}
    </span>
  );
}
