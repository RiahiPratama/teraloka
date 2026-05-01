'use client';

// ═══════════════════════════════════════════════════════════════
// /owner/campaign/[id]/reports/page.tsx
// List laporan penggunaan dana untuk satu kampanye (owner side)
//
// Backend endpoint: GET /funding/my/campaigns/:campaignId/reports
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { formatRupiah } from '@/utils/format';
import {
  ArrowLeft, Plus, Loader2, AlertCircle, CheckCircle2, XCircle,
  Hourglass, FileText, Calendar, Eye, Edit3,
  ClipboardCheck, TrendingDown, ChevronRight, Tag,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';
const TOKEN_KEY = 'tl_token';

type ReportStatus = 'pending' | 'approved' | 'revision_needed';

interface UsageReport {
  id: string;
  report_number: number;
  title: string;
  description: string;
  amount_used: number;
  items: any[];
  proof_photos: string[] | null;
  status: ReportStatus;
  rejection_reason: string | null;
  approved_at: string | null;
  created_at: string;
  disbursement_id: string | null;
}

interface CampaignSummary {
  id: string;
  title: string;
  status: string;
  collected_amount: number;
}

const STATUS_META: Record<ReportStatus, { label: string; color: string; bg: string; icon: any }> = {
  pending:          { label: 'Menunggu Review',  color: '#B45309', bg: '#FEF3C7', icon: Hourglass    },
  approved:         { label: 'Disetujui',        color: '#047857', bg: '#D1FAE5', icon: CheckCircle2 },
  revision_needed:  { label: 'Perlu Revisi',     color: '#B91C1C', bg: '#FEE2E2', icon: XCircle      },
};

export default function OwnerCampaignReportsPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;
  const { user, isLoading: authLoading } = useAuth();

  const [campaign, setCampaign] = useState<CampaignSummary | null>(null);
  const [reports, setReports] = useState<UsageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/masuk'); return; }
    if (!campaignId) return;

    async function load() {
      const token = localStorage.getItem(TOKEN_KEY);
      try {
        const [campRes, reportsRes] = await Promise.all([
          fetch(`${API}/funding/my/campaigns/${campaignId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.json()),
          fetch(`${API}/funding/my/campaigns/${campaignId}/reports`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.json()),
        ]);
        if (campRes.success) setCampaign(campRes.data);
        if (reportsRes.success) setReports(reportsRes.data ?? []);
      } catch (err: any) {
        setError(err.message || 'Gagal memuat data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [campaignId, authLoading, user, router]);

  const stats = useMemo(() => {
    const pending  = reports.filter(r => r.status === 'pending').length;
    const approved = reports.filter(r => r.status === 'approved').length;
    const revision = reports.filter(r => r.status === 'revision_needed').length;
    const totalReported = reports
      .filter(r => r.status === 'approved' || r.status === 'pending')
      .reduce((s, r) => s + Number(r.amount_used), 0);
    const collected = campaign?.collected_amount ?? 0;
    const sisa = Math.max(0, collected - totalReported);
    return { pending, approved, revision, totalReported, sisa };
  }, [reports, campaign]);

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

  const canSubmit = campaign.status === 'active' || campaign.status === 'completed';

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`/owner/campaign/${campaignId}`} className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-700" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 truncate">Laporan Penggunaan</h1>
            <p className="text-xs text-gray-500 truncate">{campaign.title}</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* Summary card */}
        <div className="bg-gradient-to-br from-[#003526] to-[#0d4d3a] rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardCheck size={16} className="opacity-80" />
            <p className="text-xs font-semibold opacity-90 uppercase tracking-wide">Total Sudah Dilaporkan</p>
          </div>
          <p className="text-3xl font-black mb-3">{formatRupiah(stats.totalReported)}</p>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/20 text-xs">
            <div>
              <p className="opacity-70 mb-0.5">Dana Terkumpul</p>
              <p className="font-bold">{formatRupiah(campaign.collected_amount)}</p>
            </div>
            <div>
              <p className="opacity-70 mb-0.5">Belum Dilaporkan</p>
              <p className="font-bold">{formatRupiah(stats.sisa)}</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        {canSubmit ? (
          <Link
            href={`/owner/campaign/${campaignId}/reports/new`}
            className="flex items-center justify-center gap-2 bg-[#003526] hover:bg-[#0d4d3a] text-white font-bold py-3.5 px-4 rounded-2xl transition-colors"
          >
            <Plus size={18} />
            Buat Laporan Baru
          </Link>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed">
              Laporan hanya bisa dibuat saat kampanye <strong>active</strong> atau <strong>completed</strong>. Status: <strong>{campaign.status}</strong>.
            </div>
          </div>
        )}

        {/* Stats pills */}
        {reports.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <StatPill count={stats.pending}  label="Pending"   color="#B45309" />
            <StatPill count={stats.approved} label="Disetujui" color="#047857" />
            <StatPill count={stats.revision} label="Revisi"    color="#B91C1C" />
          </div>
        )}

        {/* List */}
        {reports.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
            <FileText size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-700 mb-1">Belum ada laporan</p>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Buat laporan untuk menunjukkan penggunaan dana yang sudah cair. Transparansi = kepercayaan donor.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(r => (
              <ReportCard key={r.id} r={r} campaignId={campaignId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div className="bg-white rounded-xl p-2.5 text-center border border-gray-100">
      <p className="text-lg font-black" style={{ color }}>{count}</p>
      <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">{label}</p>
    </div>
  );
}

function ReportCard({ r, campaignId }: { r: UsageReport; campaignId: string }) {
  const meta = STATUS_META[r.status];
  const Icon = meta.icon;
  const itemCount = Array.isArray(r.items) ? r.items.length : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                #{r.report_number}
              </span>
              <span
                className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md"
                style={{ color: meta.color, backgroundColor: meta.bg }}
              >
                <Icon size={11} />
                {meta.label}
              </span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 line-clamp-2">{r.title}</h3>
          </div>
        </div>

        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-2xl font-black text-gray-900">{formatRupiah(r.amount_used)}</p>
          <p className="text-xs text-gray-500">
            {itemCount} item · {r.proof_photos?.length ?? 0} foto
          </p>
        </div>

        <div className="text-xs text-gray-500 flex items-center gap-2 mb-3">
          <Calendar size={12} />
          {new Date(r.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
        </div>

        {r.status === 'revision_needed' && r.rejection_reason && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-2.5 mb-3">
            <p className="text-[10px] font-bold text-red-700 uppercase mb-0.5">Catatan Revisi dari Admin</p>
            <p className="text-xs text-red-800 leading-relaxed">{r.rejection_reason}</p>
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t border-gray-100">
          <Link
            href={`/owner/campaign/${campaignId}/reports/${r.id}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 py-2 px-3 rounded-lg border border-gray-200"
          >
            <Eye size={13} />
            Detail
          </Link>
          {r.status === 'revision_needed' && (
            <Link
              href={`/owner/campaign/${campaignId}/reports/${r.id}/edit`}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 py-2 px-3 rounded-lg"
            >
              <Edit3 size={13} />
              Revisi
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
