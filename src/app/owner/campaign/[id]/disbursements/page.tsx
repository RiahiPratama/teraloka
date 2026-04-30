'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { formatRupiah } from '@/utils/format';
import ImageUpload from '@/components/ui/ImageUpload';
import {
  ArrowLeft, Plus, Trash2, Loader2, AlertCircle,
  Banknote, Camera, CheckCircle2, HeartHandshake,
  Info, Clock, Flag, XCircle, Phone,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

type DisbursementStatus = 'pending' | 'verified' | 'flagged' | 'rejected';

interface Disbursement {
  id: string;
  stage_number: number;
  amount: number;
  disbursed_to: string;
  disbursed_at: string;
  method: string;
  evidence_urls: string[];
  disbursement_notes: string | null;
  beneficiary_phone: string | null;
  status: DisbursementStatus;
  admin_review_notes: string | null;
  created_at: string;
}

interface Campaign {
  id: string;
  title: string;
  collected_amount: number;
  status: string;
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function formatRupiahInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits ? Number(digits).toLocaleString('id-ID') : '';
}

function parseRupiah(formatted: string): number {
  return Number(formatted.replace(/\D/g, '')) || 0;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

const STATUS_CONFIG: Record<DisbursementStatus, {
  label: string; color: string; bg: string; Icon: any;
}> = {
  pending:  { label: 'Menunggu Verifikasi', color: '#B45309', bg: 'bg-amber-100',   Icon: Clock },
  verified: { label: 'Disetujui',           color: '#047857', bg: 'bg-emerald-100', Icon: CheckCircle2 },
  flagged:  { label: 'Sedang Direview',     color: '#C2410C', bg: 'bg-orange-100',  Icon: Flag },
  rejected: { label: 'Ditolak',             color: '#DC2626', bg: 'bg-red-100',     Icon: XCircle },
};

const METHOD_OPTIONS = [
  { value: 'transfer', label: 'Transfer Bank' },
  { value: 'tunai',    label: 'Tunai / Cash' },
  { value: 'ewallet',  label: 'E-Wallet' },
];

// ═══════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════

export default function OwnerDisbursementsPage() {
  const router   = useRouter();
  const params   = useParams();
  const campaignId = params?.id as string;
  const { user, token, isLoading: authLoading } = useAuth();

  // Data
  const [campaign, setCampaign]           = useState<Campaign | null>(null);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [loading, setLoading]             = useState(true);

  // Form state
  const [showForm, setShowForm]         = useState(false);
  const [disbursedTo, setDisbursedTo]   = useState('');
  const [amount, setAmount]             = useState('');
  const [disbursedAt, setDisbursedAt]   = useState(
    new Date().toISOString().split('T')[0]
  );
  const [method, setMethod]             = useState('transfer');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [phone, setPhone]               = useState('');
  const [notes, setNotes]               = useState('');

  // Submit state
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast]             = useState<{ ok: boolean; msg: string } | null>(null);

  // ── Fetch data ────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!token || !campaignId) return;
    setLoading(true);
    try {
      const [campRes, disbRes] = await Promise.all([
        fetch(`${API}/funding/my/campaigns/${campaignId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()),
        fetch(`${API}/funding/my/campaigns/${campaignId}/disbursements`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()),
      ]);
      if (campRes.success) setCampaign(campRes.data);
      if (disbRes.success) setDisbursements(disbRes.data ?? []);
    } catch { }
    finally { setLoading(false); }
  }, [token, campaignId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Toast ─────────────────────────────────────────────────────
  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Reset form ────────────────────────────────────────────────
  function resetForm() {
    setDisbursedTo(''); setAmount('');
    setDisbursedAt(new Date().toISOString().split('T')[0]);
    setMethod('transfer'); setEvidenceUrls([]);
    setPhone(''); setNotes(''); setSubmitError('');
    setShowForm(false); setShowConfirm(false);
  }

  // ── Validation ────────────────────────────────────────────────
  const amountNum = parseRupiah(amount);
  const isValid   = (
    disbursedTo.trim().length >= 3 &&
    amountNum > 0 &&
    disbursedAt &&
    evidenceUrls.length > 0 &&
    phone.trim().length >= 9  // phone sebagai identitas penerima (one-of)
  );

  const validationMsg = !disbursedTo.trim() ? 'Isi nama penerima'
    : amountNum <= 0              ? 'Isi nominal pencairan'
    : !disbursedAt                ? 'Pilih tanggal pencairan'
    : evidenceUrls.length === 0   ? 'Upload minimal 1 bukti transfer'
    : phone.trim().length < 9     ? 'Isi nomor HP penerima (identitas wajib)'
    : '';

  // ── Submit create ─────────────────────────────────────────────
  async function handleSubmit() {
    if (!token || !campaign || !isValid) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch(`${API}/funding/my/disbursements`, {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaign_id:       campaignId,
          amount:            amountNum,
          disbursed_to:      disbursedTo.trim(),
          disbursed_at:      new Date(disbursedAt).toISOString(),
          method,
          evidence_urls:     evidenceUrls,
          beneficiary_phone: phone.trim() || undefined,
          disbursement_notes: notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(true, `Pencairan Tahap berhasil diajukan. Menunggu verifikasi admin.`);
        resetForm();
        await fetchData();
      } else {
        setSubmitError(json.error?.message ?? 'Gagal mengajukan pencairan.');
        setShowConfirm(false);
      }
    } catch {
      setSubmitError('Koneksi bermasalah. Coba lagi.');
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!token) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API}/funding/my/disbursements/${id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(true, 'Pencairan berhasil dihapus.');
        await fetchData();
      } else {
        showToast(false, json.error?.message ?? 'Gagal menghapus.');
      }
    } catch {
      showToast(false, 'Koneksi bermasalah.');
    } finally {
      setDeletingId(null);
    }
  }

  // ── Auth guards ───────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#003526]" />
      </div>
    );
  }

  if (!user || !token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <HeartHandshake size={28} className="text-[#003526] mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-3">Login Dulu</h2>
          <button
            onClick={() => router.push(`/login?redirect=/owner/campaign/${campaignId}/disbursements`)}
            className="w-full rounded-xl bg-[#003526] px-6 py-3 text-sm font-bold text-white"
          >
            Login Sekarang
          </button>
        </div>
      </div>
    );
  }

  const pendingCount  = disbursements.filter(d => d.status === 'pending').length;
  const verifiedTotal = disbursements
    .filter(d => d.status === 'verified')
    .reduce((sum, d) => sum + Number(d.amount), 0);

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#f9f9f8] pb-24">

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-[#003526] via-[#003526] to-[#1B6B4A] px-4 pt-6 pb-14 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[#EC4899]/15 blur-3xl -translate-y-1/3 translate-x-1/3" />
        <div className="relative mx-auto max-w-lg">
          <Link
            href={`/owner/campaign/${campaignId}`}
            className="inline-flex items-center gap-1.5 text-[#95d3ba] text-xs mb-3 hover:text-white transition-colors"
          >
            <ArrowLeft size={13} />
            {campaign?.title ?? 'Detail Kampanye'}
          </Link>
          <div className="flex items-start gap-2">
            <Banknote size={18} className="text-[#F472B6] mt-0.5 shrink-0" strokeWidth={2.2} />
            <div>
              <p className="text-[10px] font-bold text-[#F472B6] uppercase tracking-widest mb-0.5">
                BADONASI · Pencairan Dana
              </p>
              <h1 className="text-base font-extrabold text-white leading-tight">
                Ajukan Pencairan Dana
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 -mt-8 relative z-10 space-y-4">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Menunggu Verifikasi
            </p>
            <p className="text-xl font-extrabold text-amber-600">{pendingCount}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Total Disetujui
            </p>
            <p className="text-base font-extrabold text-emerald-700 leading-tight">
              {formatRupiah(verifiedTotal)}
            </p>
          </div>
        </div>

        {/* ── Info banner ── */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
          <Info size={15} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-blue-900 mb-1">Cara kerja pencairan</p>
            <p className="text-xs text-blue-700 leading-relaxed">
              Ajukan pencairan dengan bukti transfer. Admin TeraLoka akan memverifikasi dalam 1×24 jam kerja. Dana yang dicairkan tidak bisa melebihi total donasi yang terkumpul.
            </p>
          </div>
        </div>

        {/* ── Tombol ajukan baru ── */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-sm font-extrabold text-white shadow-md hover:opacity-90 transition-opacity"
          >
            <Plus size={15} />
            Ajukan Pencairan Baru
          </button>
        )}

        {/* ── Form pencairan ── */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                <Banknote size={14} className="text-[#EC4899]" />
                Form Pencairan Baru
              </h2>
              <button
                onClick={resetForm}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Batal
              </button>
            </div>

            {/* Nama Penerima */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                Nama Penerima Dana <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={disbursedTo}
                onChange={e => setDisbursedTo(e.target.value)}
                placeholder="Nama lengkap penerima"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003526]/25 focus:border-[#003526]"
              />
            </div>

            {/* Nominal */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                Nominal Pencairan <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={e => setAmount(formatRupiahInput(e.target.value))}
                  placeholder="0"
                  className="w-full rounded-xl border border-gray-200 pl-9 pr-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#003526]/25 focus:border-[#003526]"
                />
              </div>
              {campaign && (
                <p className="text-[11px] text-gray-400 mt-1">
                  Dana terkumpul:{' '}
                  <span className="font-semibold">{formatRupiah(campaign.collected_amount)}</span>
                </p>
              )}
            </div>

            {/* Tanggal + Metode */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">
                  Tanggal Cair <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={disbursedAt}
                  onChange={e => setDisbursedAt(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-[#003526]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">
                  Metode
                </label>
                <select
                  value={method}
                  onChange={e => setMethod(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-[#003526] bg-white"
                >
                  {METHOD_OPTIONS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* No HP Penerima */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1.5">
                <Phone size={11} />
                No. HP Penerima <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="08xxxxxxxxxx"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003526]/25 focus:border-[#003526]"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Wajib untuk verifikasi identitas penerima
              </p>
            </div>

            {/* Catatan */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                Catatan <span className="text-gray-400 font-normal">(opsional)</span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Keterangan tambahan pencairan..."
                rows={2}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003526]/25 focus:border-[#003526] resize-none"
              />
            </div>

            {/* Bukti Transfer */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1.5">
                <Camera size={11} />
                Bukti Transfer <span className="text-red-500">*</span>
              </label>
              <p className="text-[11px] text-gray-400 mb-2">
                Upload struk transfer atau bukti pembayaran (min. 1 foto)
              </p>
              <ImageUpload
                bucket="campaigns"
                label=""
                maxFiles={3}
                maxSizeMB={5}
                onUpload={(urls: string[]) => setEvidenceUrls(urls)}
                existingUrls={evidenceUrls}
              />
              {evidenceUrls.length > 0 && (
                <p className="text-xs text-emerald-700 font-semibold mt-1.5">
                  ✓ {evidenceUrls.length} bukti tersimpan
                </p>
              )}
            </div>

            {/* Error */}
            {submitError && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 flex gap-2 items-start">
                <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{submitError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              disabled={!isValid || submitting}
              onClick={() => { setSubmitError(''); setShowConfirm(true); }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-sm font-extrabold text-white shadow-md disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              <Banknote size={15} />
              Ajukan Pencairan
            </button>

            {!isValid && validationMsg && (
              <p className="text-center text-[11px] text-gray-400">{validationMsg}</p>
            )}
          </div>
        )}

        {/* ── Riwayat Pencairan ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              Riwayat Pencairan ({disbursements.length})
            </h2>
          </div>

          {disbursements.length === 0 ? (
            <div className="p-10 text-center">
              <Banknote size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-700 mb-1">
                Belum ada pencairan
              </p>
              <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
                Ajukan pencairan setelah dana sudah diterima dan siap disalurkan ke penerima manfaat.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {disbursements.map(d => {
                const cfg    = STATUS_CONFIG[d.status];
                const Icon   = cfg.Icon;
                const isDel  = deletingId === d.id;

                return (
                  <div key={d.id} className="px-5 py-4">
                    {/* Row header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <p className="text-[10px] font-bold text-[#EC4899]">
                            Tahap #{d.stage_number}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${cfg.bg}`}
                            style={{ color: cfg.color }}
                          >
                            <Icon size={8} />
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {d.disbursed_to}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(d.disbursed_at)} · {d.method}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-base font-extrabold text-[#003526]">
                          {formatRupiah(Number(d.amount))}
                        </p>

                        {/* Delete — only for pending */}
                        {d.status === 'pending' && (
                          <button
                            onClick={() => handleDelete(d.id)}
                            disabled={isDel}
                            className="mt-1 text-[10px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1 ml-auto disabled:opacity-50"
                          >
                            {isDel ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <Trash2 size={10} />
                            )}
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Evidence links */}
                    {d.evidence_urls?.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {d.evidence_urls.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-semibold text-[#0891B2] hover:underline"
                          >
                            📎 Bukti {i + 1}
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Admin notes — if flagged/rejected */}
                    {d.admin_review_notes && (
                      <div className="mt-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                        <p className="text-[10px] font-bold text-red-700 mb-0.5">
                          Catatan Admin
                        </p>
                        <p className="text-xs text-red-600 leading-relaxed">
                          {d.admin_review_notes}
                        </p>
                      </div>
                    )}

                    {/* Notes */}
                    {d.disbursement_notes && (
                      <p className="text-[11px] text-gray-500 mt-1.5 italic">
                        {d.disbursement_notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toast.ok ? '#10B981' : '#EF4444',
          color: '#fff', borderRadius: 12, padding: '12px 20px',
          fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}>
          {toast.ok ? '✅ ' : '❌ '}{toast.msg}
        </div>
      )}

      {/* ── Confirm Modal ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl">
            <div className="mx-auto w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center mb-3">
              <Banknote size={22} className="text-[#BE185D]" />
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-2">
              Ajukan Pencairan?
            </h3>
            <p className="text-xs text-gray-500 text-center mb-4 leading-relaxed">
              Pencairan ini akan diverifikasi admin TeraLoka sebelum dicatat sebagai resmi.
            </p>

            {/* Summary */}
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3.5 mb-4 space-y-2">
              <SummaryRow label="Penerima"  value={disbursedTo} />
              <SummaryRow label="Nominal"   value={formatRupiah(amountNum)} bold />
              <SummaryRow label="Tanggal"   value={formatDate(new Date(disbursedAt).toISOString())} />
              <SummaryRow label="Metode"    value={METHOD_OPTIONS.find(m => m.value === method)?.label ?? method} />
              <SummaryRow label="Bukti"     value={`${evidenceUrls.length} foto`} />
            </div>

            {submitError && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 mb-3">
                <p className="text-xs text-red-700">{submitError}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-[#003526] text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <><Loader2 size={13} className="animate-spin" /> Mengirim...</>
                ) : 'Ya, Ajukan'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function SummaryRow({ label, value, bold = false }: {
  label: string; value: string; bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className={`text-xs text-right truncate max-w-[60%] ${
        bold ? 'font-extrabold text-[#BE185D]' : 'font-medium text-gray-800'
      }`}>
        {value}
      </span>
    </div>
  );
}
