'use client';

// ═══════════════════════════════════════════════════════════════
// /owner/funding/campaigns/[id]/disbursements/page.tsx
// List pencairan dana untuk satu kampanye (owner side)
//
// Backend endpoints:
//   GET /funding/my/campaigns/:campaignId/disbursements
//   DELETE /funding/my/disbursements/:id (while pending)
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { formatRupiah } from '@/utils/format';
import {
  ArrowLeft, Plus, Loader2, AlertCircle, CheckCircle2, XCircle,
  Hourglass, Flag, Banknote, Calendar, FileText, Eye, Trash2,
  ExternalLink, Wallet, TrendingUp, ShieldAlert,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';
const TOKEN_KEY = 'tl_token';

type DisbursementStatus = 'pending' | 'verified' | 'flagged' | 'rejected';

interface Disbursement {
  id: string;
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
  verified_at: string | null;
  created_at: string;
}

interface CampaignSummary {
  id: string;
  display_id?: string;  // ⭐ Sesi 13: BDN-CMP-2026-XXXXX
  title: string;
  status: string;
  collected_amount: number;
}

interface FinancialSummary {
  total_collected: number;
  total_disbursed: number;
  total_disbursed_pending: number;
  saldo: number;  // [SALDO-FIELD-FIX] match BE getMyFinancialSummary (dulu 'saldo_available' → undefined → Rp 0)
}

// pill = token semantik (presentation). label/icon = konten (jangan ubah teks).
const STATUS_META: Record<DisbursementStatus, { label: string; icon: any; pill: string }> = {
  pending:  { label: 'Menunggu Review',   icon: Hourglass,    pill: 'text-status-warning bg-status-warning/10'   },
  verified: { label: 'Terverifikasi',     icon: CheckCircle2, pill: 'text-status-healthy bg-status-healthy/10'   },
  rejected: { label: 'Ditolak',           icon: XCircle,      pill: 'text-status-critical bg-status-critical/10' },
  flagged:  { label: 'Perlu Investigasi', icon: Flag,         pill: 'text-status-flagged bg-status-flagged/10'   },
};

export default function OwnerCampaignDisbursementsPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [campaign, setCampaign] = useState<CampaignSummary | null>(null);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [financial, setFinancial] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/masuk'); return; }
    if (!campaignId) return;

    async function load() {
      const token = localStorage.getItem(TOKEN_KEY);
      try {
        const [campRes, disbRes, finRes] = await Promise.all([
          fetch(`${API}/funding/my/campaigns/${campaignId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.json()),
          fetch(`${API}/funding/my/campaigns/${campaignId}/disbursements`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.json()),
          fetch(`${API}/funding/my/financial-summary?campaign_id=${campaignId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.json()).catch(() => ({ success: false })),
        ]);

        if (campRes.success) setCampaign(campRes.data);
        if (disbRes.success) setDisbursements(disbRes.data ?? []);
        if (finRes.success) setFinancial(finRes.data);
      } catch (err: any) {
        setError(err.message || 'Gagal memuat data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [campaignId, authLoading, user, router]);

  async function handleDelete(disbursementId: string) {
    if (!confirm('Hapus draf pencairan ini? Tidak bisa di-undo.')) return;
    setDeletingId(disbursementId);
    const token = localStorage.getItem(TOKEN_KEY);
    try {
      const res = await fetch(`${API}/funding/my/disbursements/${disbursementId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message || 'Gagal hapus');
      setDisbursements(prev => prev.filter(d => d.id !== disbursementId));
      toast.success('Pencairan berhasil dihapus');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  const stats = useMemo(() => {
    const verified  = disbursements.filter(d => d.status === 'verified');
    const pending   = disbursements.filter(d => d.status === 'pending');
    const rejected  = disbursements.filter(d => d.status === 'rejected');
    const flagged   = disbursements.filter(d => d.status === 'flagged');
    const totalVerified = verified.reduce((s, d) => s + Number(d.amount), 0);
    const totalPending  = pending.reduce((s, d) => s + Number(d.amount), 0);
    return {
      verified: verified.length,
      pending: pending.length,
      rejected: rejected.length,
      flagged: flagged.length,
      totalVerified,
      totalPending,
    };
  }, [disbursements]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-[#003526] animate-spin" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-800 mb-2">{error || 'Kampanye tidak ditemukan'}</p>
          <Link href="/owner" className="text-sm text-[#003526] underline">Kembali ke Dashboard</Link>
        </div>
      </div>
    );
  }

  const saldo = financial?.saldo ?? 0;
  const canRequest = campaign.status === 'active' || campaign.status === 'completed';

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`/owner/funding/campaigns/${campaignId}`} className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-700" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 truncate">Pencairan Dana</h1>
            <p className="text-xs text-gray-500 truncate">
              {campaign.display_id && (
                <span className="font-mono font-bold text-gray-400 mr-1.5">{campaign.display_id}</span>
              )}
              {campaign.title}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* Saldo hero — anchor tunggal: saldo = angka terbesar di halaman.
            Token hijau primary, tabular-nums, shadow tinted halus (no border tegas),
            hijau-only (pink badonasi disimpan utk 1 aksen lain). */}
        <div className="bg-gradient-to-br from-primary to-primary-light rounded-3xl p-6 text-white shadow-[0_16px_40px_-18px_rgba(0,53,38,0.5)]">
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={15} className="text-white/70" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Saldo Tersedia</p>
          </div>
          <p className="text-[2.75rem] leading-[1.05] font-black tabular-nums mb-5">{formatRupiah(saldo)}</p>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/15">
            <div>
              <p className="text-[11px] text-white/55 mb-1">Sudah Cair</p>
              <p className="text-sm font-bold tabular-nums text-white/95">{formatRupiah(stats.totalVerified)}</p>
            </div>
            <div>
              <p className="text-[11px] text-white/55 mb-1">Pending Review</p>
              <p className="text-sm font-bold tabular-nums text-white/95">{formatRupiah(stats.totalPending)}</p>
            </div>
          </div>
        </div>

        {/* CTA Request */}
        {canRequest ? (
          <Link
            href={`/owner/funding/campaigns/${campaignId}/disbursements/new`}
            className="flex items-center justify-center gap-2 bg-[#EC4899] hover:bg-[#DB2777] text-white font-bold py-3.5 px-4 rounded-2xl shadow-[0_10px_26px_-12px_rgba(236,72,153,0.6)] transition-colors"
          >
            <Plus size={18} />
            Ajukan Pencairan Baru
          </Link>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <ShieldAlert size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed">
              Pencairan hanya bisa diajukan saat kampanye <strong>active</strong> atau <strong>completed</strong>. Status saat ini: <strong>{campaign.status}</strong>.
            </div>
          </div>
        )}

        {/* Stats summary */}
        {disbursements.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            <StatPill count={stats.pending}  label="Pending"  colorClass="text-status-warning"  />
            <StatPill count={stats.verified} label="Cair"     colorClass="text-status-healthy"  />
            <StatPill count={stats.rejected} label="Ditolak"  colorClass="text-status-critical" />
            <StatPill count={stats.flagged}  label="Flag"     colorClass="text-status-flagged"  />
          </div>
        )}

        {/* List */}
        {disbursements.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
            <Banknote size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-700 mb-1">Belum ada pencairan</p>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Ajukan pencairan untuk mulai menyalurkan dana ke penerima manfaat. Setiap pencairan akan diverifikasi admin sebelum dianggap final.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {disbursements.map(d => (
              <DisbursementCard
                key={d.id}
                d={d}
                campaignId={campaignId}
                onDelete={handleDelete}
                deleting={deletingId === d.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({ count, label, colorClass }: { count: number; label: string; colorClass: string }) {
  return (
    <div className="bg-white rounded-xl p-2.5 text-center border border-gray-100">
      <p className={`text-lg font-black tabular-nums ${colorClass}`}>{count}</p>
      <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">{label}</p>
    </div>
  );
}

function DisbursementCard({
  d, campaignId, onDelete, deleting,
}: {
  d: Disbursement; campaignId: string; onDelete: (id: string) => void; deleting: boolean;
}) {
  const meta = STATUS_META[d.status];
  const Icon = meta.icon;
  const canDelete = d.status === 'pending';
  const canEdit = d.status === 'pending';

  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_22px_-16px_rgba(15,23,42,0.18)] overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                Tahap #{d.stage_number}
              </span>
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md ${meta.pill}`}>
                <Icon size={11} />
                {meta.label}
              </span>
            </div>
            <p className="text-2xl font-black tabular-nums text-gray-900">{formatRupiah(d.amount)}</p>
          </div>
        </div>

        <div className="space-y-2 text-xs text-gray-500 mb-4">
          <div className="flex items-center gap-2">
            <Banknote size={12} className="text-gray-400" />
            <span>Ke: <strong className="text-gray-700 font-semibold">{d.disbursed_to}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-gray-400" />
            <span className="tabular-nums">{new Date(d.disbursed_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
          </div>
          {d.evidence_urls && d.evidence_urls.length > 0 && (
            <div className="flex items-center gap-2">
              <FileText size={12} className="text-gray-400" />
              <span>{d.evidence_urls.length} bukti transfer</span>
            </div>
          )}
        </div>

        {d.status === 'rejected' && d.admin_review_notes && (
          <div className="bg-status-critical/5 rounded-xl p-3 mb-4">
            <p className="text-[10px] font-bold text-status-critical uppercase tracking-wide mb-1">Alasan Ditolak</p>
            <p className="text-xs text-gray-700 leading-relaxed">{d.admin_review_notes}</p>
          </div>
        )}

        {d.status === 'flagged' && d.admin_review_notes && (
          <div className="bg-status-flagged/5 rounded-xl p-3 mb-4">
            <p className="text-[10px] font-bold text-status-flagged uppercase tracking-wide mb-1">Catatan Admin</p>
            <p className="text-xs text-gray-700 leading-relaxed">{d.admin_review_notes}</p>
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t border-gray-100">
          <Link
            href={`/owner/funding/campaigns/${campaignId}/disbursements/${d.id}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 py-2 px-3 rounded-lg border border-gray-100 transition-colors"
          >
            <Eye size={13} />
            Detail
          </Link>
          {canEdit && (
            <Link
              href={`/owner/funding/campaigns/${campaignId}/disbursements/${d.id}/edit`}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-status-warning bg-status-warning/10 hover:bg-status-warning/15 py-2 px-3 rounded-lg transition-colors"
            >
              Edit
            </Link>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(d.id)}
              disabled={deleting}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-status-critical bg-status-critical/10 hover:bg-status-critical/15 py-2 px-3 rounded-lg disabled:opacity-50 transition-colors"
            >
              {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
