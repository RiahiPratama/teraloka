'use client';

// ═══════════════════════════════════════════════════════════════
// /owner/campaign/[id]/disbursements/[disbId]/page.tsx
// Detail page pencairan dana (owner view)
//
// Backend endpoint: GET /funding/my/disbursements/:id
// Action buttons: Edit (kalau pending), Delete (kalau pending)
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { formatRupiah } from '@/utils/format';
import {
  ArrowLeft, Loader2, AlertCircle, Wallet, Calendar, User,
  Phone, FileText, Edit3, Trash2, CheckCircle2, XCircle, Hourglass,
  AlertTriangle, Banknote, Image as ImageIcon, Building2,
  ShieldCheck, MessageCircle,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';
const TOKEN_KEY = 'tl_token';

type DisbursementStatus = 'pending' | 'verified' | 'flagged' | 'rejected';

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
  beneficiary_phone: string | null;
  beneficiary_ktp_url: string | null;
  disbursement_notes: string | null;
  status: DisbursementStatus;
  admin_review_notes: string | null;
  reviewed_by: string | null;
  verified_at: string | null;
  rejected_at: string | null;
  flagged_at: string | null;
  created_at: string;
  updated_at: string;
  campaigns?: {
    id: string;
    title: string;
    creator_id: string;
  };
}

const STATUS_META: Record<DisbursementStatus, {
  label: string;
  bg: string;
  text: string;
  border: string;
  icon: any;
  desc: string;
}> = {
  pending: {
    label: 'Menunggu Review',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: Hourglass,
    desc: 'Tim admin akan review bukti pencairan dalam 1-2 hari kerja',
  },
  verified: {
    label: 'Terverifikasi',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: CheckCircle2,
    desc: 'Pencairan sudah diverifikasi & masuk ke transparansi publik',
  },
  flagged: {
    label: 'Perlu Klarifikasi',
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
    icon: AlertTriangle,
    desc: 'Tim admin butuh klarifikasi tambahan — lihat catatan di bawah',
  },
  rejected: {
    label: 'Ditolak',
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    icon: XCircle,
    desc: 'Pencairan tidak dapat diverifikasi — lihat alasan di bawah',
  },
};

const METHOD_LABELS: Record<string, string> = {
  transfer: 'Transfer Bank',
  cash:     'Tunai',
  goods:    'Barang/Logistik',
  service:  'Layanan/Jasa',
};

export default function OwnerDisbursementDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;
  const disbId = params.disbId as string;
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<Disbursement | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (!disbId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, disbId]);

  async function load() {
    setLoading(true);
    setLoadError('');
    const token = localStorage.getItem(TOKEN_KEY);
    try {
      const res = await fetch(`${API}/funding/my/disbursements/${disbId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Gagal load detail');
      }
      setData(json.data);
    } catch (err: any) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!data) return;
    setDeleting(true);
    const token = localStorage.getItem(TOKEN_KEY);
    try {
      const res = await fetch(`${API}/funding/my/disbursements/${disbId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Gagal hapus pencairan');
      }
      toast.success('Pencairan berhasil dihapus');
      router.push(`/owner/campaign/${campaignId}/disbursements`);
    } catch (err: any) {
      toast.error(err.message);
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  if (loading || authLoading) {
    return <LoadingState />;
  }

  if (loadError || !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center border border-red-100">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-800 mb-2">{loadError || 'Pencairan tidak ditemukan'}</p>
          <Link
            href={`/owner/campaign/${campaignId}/disbursements`}
            className="inline-block mt-3 text-sm font-bold text-[#003526] underline"
          >
            ← Kembali ke daftar pencairan
          </Link>
        </div>
      </div>
    );
  }

  const meta = STATUS_META[data.status];
  const StatusIcon = meta.icon;
  const isEditable = data.status === 'pending';

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href={`/owner/campaign/${campaignId}/disbursements`}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 active:scale-95 transition-transform"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900">
              Pencairan #{data.stage_number}
            </h1>
            <p className="text-xs text-gray-500 truncate">
              {data.campaigns?.title}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* Status Card */}
        <div className={`${meta.bg} ${meta.border} border rounded-2xl p-4`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full bg-white border ${meta.border} flex items-center justify-center shrink-0`}>
              <StatusIcon size={18} className={meta.text} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${meta.text}`}>{meta.label}</p>
              <p className={`text-xs ${meta.text} opacity-90 mt-0.5 leading-relaxed`}>
                {meta.desc}
              </p>
              {data.verified_at && (
                <p className={`text-[11px] ${meta.text} opacity-75 mt-1.5`}>
                  Diverifikasi {new Date(data.verified_at).toLocaleString('id-ID', {
                    dateStyle: 'medium', timeStyle: 'short'
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Admin review notes */}
          {data.admin_review_notes && (
            <div className="mt-3 bg-white rounded-lg p-3 border border-gray-100">
              <p className={`text-[10px] font-bold ${meta.text} uppercase tracking-wider mb-1`}>
                Catatan Admin
              </p>
              <p className="text-xs text-gray-800 leading-relaxed">{data.admin_review_notes}</p>
            </div>
          )}

          {/* Action buttons */}
          {isEditable && (
            <div className="mt-3 flex gap-2">
              <Link
                href={`/owner/campaign/${campaignId}/disbursements/${disbId}/edit`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 rounded-lg active:scale-95 transition-all"
              >
                <Edit3 size={12} />
                Edit Pencairan
              </Link>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center justify-center gap-1.5 bg-white border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold py-2.5 px-4 rounded-lg active:scale-95 transition-all"
              >
                <Trash2 size={12} />
                Hapus
              </button>
            </div>
          )}
        </div>

        {/* Detail Pencairan */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={14} className="text-[#003526]" />
            <p className="text-xs font-bold text-[#003526] uppercase tracking-widest">Detail Pencairan</p>
          </div>

          <div className="space-y-3">
            <DetailField
              icon={Banknote}
              label="Nominal"
              value={
                <span className="text-2xl font-black text-[#003526]">
                  {formatRupiah(data.amount)}
                </span>
              }
            />
            <DetailField
              icon={User}
              label="Diberikan ke"
              value={<span className="font-bold text-gray-900">{data.disbursed_to}</span>}
            />
            <DetailField
              icon={Calendar}
              label="Tanggal pencairan"
              value={
                <span className="font-medium text-gray-900">
                  {new Date(data.disbursed_at).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              }
            />
            <DetailField
              icon={Building2}
              label="Metode"
              value={<span className="font-medium text-gray-900">{METHOD_LABELS[data.method] ?? data.method}</span>}
            />
          </div>
        </div>

        {/* Beneficiary info */}
        {(data.beneficiary_phone || data.beneficiary_ktp_url) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={14} className="text-[#003526]" />
              <p className="text-xs font-bold text-[#003526] uppercase tracking-widest">Identitas Penerima</p>
            </div>

            <div className="space-y-3">
              {data.beneficiary_phone && (
                <DetailField
                  icon={Phone}
                  label="Nomor HP"
                  value={
                    <a
                      href={`https://wa.me/${data.beneficiary_phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-bold text-[#25D366] hover:underline inline-flex items-center gap-1"
                    >
                      {data.beneficiary_phone}
                      <MessageCircle size={11} />
                    </a>
                  }
                />
              )}
              {data.beneficiary_ktp_url && (
                <div>
                  <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
                    <FileText size={11} />
                    KTP / Identitas
                  </p>
                  <a
                    href={data.beneficiary_ktp_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block w-32 h-20 rounded-lg overflow-hidden border border-gray-200 hover:border-[#003526] active:scale-95 transition-all"
                  >
                    <img src={data.beneficiary_ktp_url} alt="KTP" className="w-full h-full object-cover" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bukti pencairan */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon size={14} className="text-[#003526]" />
            <p className="text-xs font-bold text-[#003526] uppercase tracking-widest">
              Bukti Pencairan ({data.evidence_urls?.length ?? 0})
            </p>
          </div>

          {data.evidence_urls && data.evidence_urls.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {data.evidence_urls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-[#003526] active:scale-95 transition-all bg-gray-50"
                >
                  <img src={url} alt={`Bukti ${i + 1}`} className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">Tidak ada bukti</p>
          )}
        </div>

        {/* Foto serah-terima */}
        {data.handover_photo_url && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={14} className="text-emerald-700" />
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
                Foto Serah-Terima
              </p>
            </div>
            <a
              href={data.handover_photo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block aspect-video rounded-lg overflow-hidden border border-gray-200 hover:border-emerald-400 active:scale-[0.99] transition-all bg-gray-50"
            >
              <img src={data.handover_photo_url} alt="Serah-terima" className="w-full h-full object-cover" />
            </a>
          </div>
        )}

        {/* Catatan penggalang */}
        {data.disbursement_notes && (
          <div className="bg-[#003526]/5 border border-[#003526]/10 rounded-2xl p-5">
            <p className="text-xs font-bold text-[#003526] uppercase tracking-widest mb-2">
              Catatan Pencairan
            </p>
            <p className="text-sm text-gray-700 italic leading-relaxed">
              &quot;{data.disbursement_notes}&quot;
            </p>
          </div>
        )}

        {/* Audit trail */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Riwayat</p>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Dibuat</span>
              <span className="font-medium">
                {new Date(data.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
            {data.updated_at && data.updated_at !== data.created_at && (
              <div className="flex justify-between">
                <span>Terakhir diedit</span>
                <span className="font-medium">
                  {new Date(data.updated_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
            )}
            {data.verified_at && (
              <div className="flex justify-between">
                <span>Diverifikasi</span>
                <span className="font-medium text-emerald-700">
                  {new Date(data.verified_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
            )}
            {data.rejected_at && (
              <div className="flex justify-between">
                <span>Ditolak</span>
                <span className="font-medium text-red-700">
                  {new Date(data.rejected_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
            )}
            {data.flagged_at && (
              <div className="flex justify-between">
                <span>Di-flag</span>
                <span className="font-medium text-orange-700">
                  {new Date(data.flagged_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Info banner — non-editable */}
        {!isEditable && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="text-gray-500 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-600 leading-relaxed">
                Pencairan dengan status <strong>{meta.label}</strong> tidak dapat diedit atau dihapus untuk menjaga audit trail. Jika ada kesalahan, hubungi admin TeraLoka.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-2">
              Hapus Pencairan?
            </h3>
            <p className="text-xs text-gray-600 text-center mb-4 leading-relaxed">
              Pencairan <strong>#{data.stage_number}</strong> sebesar <strong>{formatRupiah(data.amount)}</strong> akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {deleting ? (
                  <><Loader2 size={12} className="animate-spin" /> Menghapus...</>
                ) : (
                  <><Trash2 size={12} /> Hapus</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper Components ─────────────────────────────────────────
function DetailField({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1.5">
        <Icon size={11} />
        {label}
      </p>
      <div>{value}</div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-200 animate-pulse" />
          <div className="flex-1">
            <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mb-1" />
            <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        <div className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
        <div className="h-48 bg-white rounded-2xl border border-gray-100 animate-pulse" />
        <div className="h-32 bg-white rounded-2xl border border-gray-100 animate-pulse" />
      </div>
    </div>
  );
}
