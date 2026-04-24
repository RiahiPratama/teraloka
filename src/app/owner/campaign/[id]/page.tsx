'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { formatRupiah } from '@/utils/format';
import {
  ArrowLeft, HeartHandshake, Edit3, Send, Trash2, Undo2,
  FileEdit, Hourglass, Megaphone, CheckCircle2, XCircle,
  Users, Clock, TrendingUp, AlertCircle, Loader2, Siren,
  Calendar, Landmark, UserCircle2, Tag, FileText,
  ExternalLink, MessageCircle, Sparkles, AlertTriangle,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';
const TOKEN_KEY = 'tl_token';

// ═══════════════════════════════════════════════════════════════
// Types & Meta
// ═══════════════════════════════════════════════════════════════

interface Campaign {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'pending_review' | 'active' | 'completed' | 'rejected';
  category?: string;
  cover_image_url?: string;
  beneficiary_name?: string;
  beneficiary_relation?: string;
  description?: string;
  target_amount: number;
  collected_amount: number;
  donor_count: number;
  deadline?: string | null;
  is_urgent: boolean;
  partner_name?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  proof_documents?: string[];
  rejection_reason?: string | null;
  admin_note?: string | null;
  created_at: string;
  updated_at?: string;
  verified_at?: string | null;
}

interface Donation {
  id: string;
  donor_name?: string;
  donor_phone?: string;
  amount: number;
  is_anonymous: boolean;
  message?: string;
  aamiin_count?: number;
  verification_status: string;
  created_at: string;
}

interface UsageReport {
  id: string;
  report_number: number;
  title: string;
  description?: string;
  amount_used: number;
  status: string;
  created_at: string;
}

const STATUS_META: Record<string, {
  label: string;
  color: string;
  bg: string;
  Icon: any;
  tagline: string;
}> = {
  draft: {
    label: 'Draft',
    color: '#6B7280',
    bg: 'bg-gray-100',
    Icon: FileEdit,
    tagline: 'Belum disubmit. Lengkapi lalu kirim untuk direview tim TeraLoka.',
  },
  pending_review: {
    label: 'Menunggu Review',
    color: '#B45309',
    bg: 'bg-amber-100',
    Icon: Hourglass,
    tagline: 'Sedang ditinjau tim TeraLoka (biasanya 1-2 hari kerja).',
  },
  active: {
    label: 'Aktif',
    color: '#BE185D',
    bg: 'bg-pink-100',
    Icon: Megaphone,
    tagline: 'Kampanye aktif dan menerima donasi.',
  },
  completed: {
    label: 'Selesai',
    color: '#047857',
    bg: 'bg-emerald-100',
    Icon: CheckCircle2,
    tagline: 'Kampanye telah tercapai atau ditutup.',
  },
  rejected: {
    label: 'Ditolak',
    color: '#DC2626',
    bg: 'bg-red-100',
    Icon: XCircle,
    tagline: 'Kampanye ditolak. Perbaiki lalu submit ulang.',
  },
};

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params?.id as string;
  const { user, token, isLoading: authLoading } = useAuth();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [reports, setReports] = useState<UsageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [modalType, setModalType] = useState<'delete' | 'withdraw' | 'submit' | 'resubmit' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Fetch all data
  async function fetchData() {
    if (!token || !campaignId) return;
    setLoading(true);
    setError('');
    try {
      const [detailRes, donationsRes, reportsRes] = await Promise.all([
        fetch(`${API}/funding/my/campaigns/${campaignId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()),
        fetch(`${API}/funding/my/campaigns/${campaignId}/donations?limit=20`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()),
        fetch(`${API}/funding/my/campaigns/${campaignId}/reports`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()),
      ]);

      if (detailRes.success) {
        setCampaign(detailRes.data);
      } else {
        setError(detailRes.error?.message ?? 'Kampanye tidak ditemukan');
      }

      if (donationsRes.success) setDonations(donationsRes.data ?? []);
      if (reportsRes.success) setReports(reportsRes.data ?? []);
    } catch {
      setError('Koneksi bermasalah. Refresh halaman ya.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, campaignId]);

  // Action handlers
  async function handleAction(type: 'delete' | 'withdraw' | 'submit' | 'resubmit') {
    if (!token || !campaign) return;
    setActionLoading(true);
    setActionError('');

    try {
      let method = 'POST';
      let endpoint = '';

      if (type === 'delete') {
        method = 'DELETE';
        endpoint = `/funding/my/campaigns/${campaign.id}`;
      } else if (type === 'withdraw') {
        endpoint = `/funding/my/campaigns/${campaign.id}/withdraw`;
      } else if (type === 'submit' || type === 'resubmit') {
        endpoint = `/funding/my/campaigns/${campaign.id}/submit`;
      }

      const res = await fetch(`${API}${endpoint}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (res.ok && json.success) {
        if (type === 'delete') {
          // After delete, redirect back to list
          router.replace('/owner/campaign');
          return;
        }
        // For others, refresh data
        setModalType(null);
        await fetchData();
      } else {
        setActionError(json.error?.message ?? 'Gagal melakukan aksi');
      }
    } catch {
      setActionError('Koneksi bermasalah. Coba lagi.');
    } finally {
      setActionLoading(false);
    }
  }

  // ── Auth guard ──
  if (authLoading) {
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
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-[#003526]/10 flex items-center justify-center">
            <HeartHandshake size={28} className="text-[#003526]" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Login Dulu</h2>
          <p className="mt-2 text-sm text-gray-500">
            Kamu perlu login untuk melihat detail kampanye.
          </p>
          <button
            onClick={() => router.push(`/login?redirect=/owner/campaign/${campaignId}`)}
            className="mt-5 w-full rounded-xl bg-[#003526] px-6 py-3 text-sm font-bold text-white"
          >
            Login Sekarang
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9f9f8]">
        <div className="bg-[#003526] px-4 pt-6 pb-14"></div>
        <div className="mx-auto max-w-lg px-4 -mt-8 space-y-4">
          <div className="h-40 bg-white rounded-2xl animate-pulse" />
          <div className="h-32 bg-white rounded-2xl animate-pulse" />
          <div className="h-48 bg-white rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-[#f9f9f8] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            {error || 'Kampanye tidak ditemukan'}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Mungkin kampanye sudah dihapus atau kamu ga punya akses.
          </p>
          <Link
            href="/owner/campaign"
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#003526] px-5 py-2.5 text-sm font-bold text-white"
          >
            <ArrowLeft size={14} />
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const meta = STATUS_META[campaign.status];
  const StatusIcon = meta.Icon;

  const progress = campaign.target_amount > 0
    ? Math.min((campaign.collected_amount / campaign.target_amount) * 100, 100)
    : 0;

  const daysLeft = useMemo(() => {
    if (!campaign.deadline) return null;
    const now = new Date();
    const end = new Date(campaign.deadline);
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [campaign.deadline]);

  const totalReportedUsage = reports
    .filter(r => r.status === 'approved' || r.status === 'pending')
    .reduce((sum, r) => sum + (r.amount_used ?? 0), 0);

  const showProgressBar = ['active', 'completed'].includes(campaign.status);

  return (
    <div className="min-h-screen bg-[#f9f9f8] pb-24">

      {/* Header */}
      <div className="bg-gradient-to-br from-[#003526] via-[#003526] to-[#1B6B4A] px-4 pt-6 pb-14 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-[#EC4899]/15 blur-3xl -translate-y-1/3 translate-x-1/3"></div>

        <div className="relative mx-auto max-w-lg">
          <Link
            href="/owner/campaign"
            className="inline-flex items-center gap-1.5 text-[#95d3ba] text-xs mb-3 hover:text-white transition-colors"
          >
            <ArrowLeft size={13} />
            Kampanye Saya
          </Link>

          <div className="flex items-start gap-2 mb-2">
            <HeartHandshake size={18} className="text-[#F472B6] mt-0.5 shrink-0" strokeWidth={2.2} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-[#F472B6] uppercase tracking-widest mb-0.5">
                BADONASI · Detail Kampanye
              </p>
              <h1 className="text-base font-extrabold text-white leading-tight">
                {campaign.title || '(Tanpa judul)'}
              </h1>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2 mt-3">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider"
              style={{ color: meta.color, backgroundColor: 'rgba(255,255,255,0.95)' }}
            >
              <StatusIcon size={11} strokeWidth={2.5} />
              {meta.label}
            </span>
            {campaign.is_urgent && (
              <span className="inline-flex items-center gap-1 bg-red-500 text-white text-[9px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full">
                <Siren size={9} />
                Urgent
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-lg px-4 -mt-8 relative z-10 space-y-4">

        {/* Cover + Progress/Status Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {campaign.cover_image_url && (
            <div className="aspect-video bg-gray-100">
              <img
                src={campaign.cover_image_url}
                alt={campaign.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-5">
            {/* Rejection reason banner */}
            {campaign.status === 'rejected' && campaign.rejection_reason && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-3 mb-4">
                <p className="text-[10px] font-bold text-red-700 mb-1 uppercase tracking-wider flex items-center gap-1">
                  <XCircle size={11} />
                  Alasan Ditolak
                </p>
                <p className="text-xs text-red-600 leading-relaxed">
                  {campaign.rejection_reason}
                </p>
              </div>
            )}

            {/* Pending review notice */}
            {campaign.status === 'pending_review' && (
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 mb-4">
                <p className="text-[10px] font-bold text-amber-700 mb-1 uppercase tracking-wider flex items-center gap-1">
                  <Hourglass size={11} />
                  Menunggu Review
                </p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  {meta.tagline} Kalau ada perubahan yang perlu dilakukan,
                  tarik kembali kampanye ini untuk edit.
                </p>
              </div>
            )}

            {/* Draft notice */}
            {campaign.status === 'draft' && (
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 mb-4">
                <p className="text-[10px] font-bold text-gray-600 mb-1 uppercase tracking-wider flex items-center gap-1">
                  <FileEdit size={11} />
                  Draft
                </p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {meta.tagline}
                </p>
              </div>
            )}

            {/* Progress section (active/completed) */}
            {showProgressBar && (
              <>
                <div className="flex items-baseline gap-2 mb-2">
                  <p className="text-2xl font-extrabold text-[#003526]">
                    {formatRupiah(campaign.collected_amount)}
                  </p>
                  <p className="text-xs text-gray-400">
                    dari {formatRupiah(campaign.target_amount)}
                  </p>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-[#EC4899] to-[#BE185D] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                      Progress
                    </p>
                    <p className="text-sm font-extrabold text-[#BE185D]">
                      {progress.toFixed(0)}%
                    </p>
                  </div>
                  <div className="border-l border-r border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                      Donatur
                    </p>
                    <p className="text-sm font-extrabold text-[#003526]">
                      {campaign.donor_count}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                      Sisa Hari
                    </p>
                    <p className="text-sm font-extrabold text-[#003526]">
                      {daysLeft !== null ? daysLeft : '—'}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Draft/pending: show target + config */}
            {!showProgressBar && (
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center py-2">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                    Target Dana
                  </p>
                  <p className="text-sm font-extrabold text-[#003526]">
                    {formatRupiah(campaign.target_amount)}
                  </p>
                </div>
                {campaign.deadline && (
                  <div className="text-center py-2 border-l border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                      Batas Waktu
                    </p>
                    <p className="text-sm font-extrabold text-[#003526]">
                      {new Date(campaign.deadline).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons (status-specific) */}
        <ActionButtons
          campaign={campaign}
          onDelete={() => setModalType('delete')}
          onWithdraw={() => setModalType('withdraw')}
          onSubmit={() => setModalType('submit')}
          onResubmit={() => setModalType('resubmit')}
        />

        {/* Info Section */}
        <InfoSection campaign={campaign} />

        {/* Donors (if any) */}
        {donations.length > 0 && (
          <DonorsSection donations={donations} totalDonors={campaign.donor_count} />
        )}

        {/* Usage Reports (if any) */}
        {(reports.length > 0 || ['active', 'completed'].includes(campaign.status)) && (
          <ReportsSection
            reports={reports}
            totalReported={totalReportedUsage}
            collected={campaign.collected_amount}
            canCreate={['active', 'completed'].includes(campaign.status)}
            campaignId={campaign.id}
          />
        )}

      </div>

      {/* Action Modals */}
      {modalType && (
        <ActionModal
          type={modalType}
          campaign={campaign}
          loading={actionLoading}
          error={actionError}
          onConfirm={() => handleAction(modalType)}
          onClose={() => { setModalType(null); setActionError(''); }}
        />
      )}

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Subcomponents
// ═══════════════════════════════════════════════════════════════

function ActionButtons({
  campaign,
  onDelete,
  onWithdraw,
  onSubmit,
  onResubmit,
}: {
  campaign: Campaign;
  onDelete: () => void;
  onWithdraw: () => void;
  onSubmit: () => void;
  onResubmit: () => void;
}) {
  const editHref = `/owner/campaign/${campaign.id}/edit`;

  if (campaign.status === 'draft') {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={editHref}
            className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Edit3 size={14} />
            Edit Draft
          </Link>
          <button
            onClick={onDelete}
            className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-red-50 text-sm font-bold text-red-600 hover:bg-red-100 transition-colors"
          >
            <Trash2 size={14} />
            Hapus
          </button>
        </div>
        <button
          onClick={onSubmit}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-sm font-extrabold text-white shadow-md hover:opacity-90 transition-opacity"
        >
          <Send size={15} />
          Submit untuk Review
        </button>
      </div>
    );
  }

  if (campaign.status === 'pending_review') {
    return (
      <div className="space-y-2">
        <Link
          href={editHref}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Edit3 size={14} />
          Edit Kampanye
          <AlertTriangle size={13} className="text-amber-500" />
        </Link>
        <button
          onClick={onWithdraw}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-50 text-sm font-bold text-amber-700 hover:bg-amber-100 transition-colors"
        >
          <Undo2 size={14} />
          Tarik Kembali (ke Draft)
        </button>
      </div>
    );
  }

  if (campaign.status === 'rejected') {
    return (
      <div className="space-y-2">
        <Link
          href={editHref}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Edit3 size={14} />
          Perbaiki Kampanye
        </Link>
        <button
          onClick={onResubmit}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-sm font-extrabold text-white shadow-md hover:opacity-90 transition-opacity"
        >
          <Send size={15} />
          Submit Ulang
        </button>
      </div>
    );
  }

  if (campaign.status === 'active') {
    return (
      <div className="space-y-2">
        <Link
          href={`/fundraising/${campaign.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ExternalLink size={14} />
          Lihat Halaman Publik
        </Link>
        <Link
          href={`/owner/campaign/${campaign.id}/reports/new`}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-sm font-extrabold text-white shadow-md hover:opacity-90 transition-opacity"
        >
          <FileText size={15} />
          Buat Laporan Dana
        </Link>
      </div>
    );
  }

  if (campaign.status === 'completed') {
    return (
      <div className="space-y-2">
        <Link
          href={`/fundraising/${campaign.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ExternalLink size={14} />
          Lihat Halaman Publik
        </Link>
        <Link
          href={`/owner/campaign/${campaign.id}/reports/new`}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#003526] text-sm font-bold text-white hover:opacity-90 transition-opacity"
        >
          <FileText size={15} />
          Buat Laporan Akhir
        </Link>
      </div>
    );
  }

  return null;
}

function InfoSection({ campaign }: { campaign: Campaign }) {
  const info: { icon: any; label: string; value?: string }[] = [
    {
      icon: UserCircle2,
      label: 'Penerima Manfaat',
      value: campaign.beneficiary_name
        ? `${campaign.beneficiary_name}${campaign.beneficiary_relation ? ` (${campaign.beneficiary_relation})` : ''}`
        : undefined,
    },
    {
      icon: Tag,
      label: 'Kategori',
      value: campaign.category
        ? campaign.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : undefined,
    },
    {
      icon: Landmark,
      label: 'Partner',
      value: campaign.partner_name,
    },
    {
      icon: Calendar,
      label: 'Dibuat',
      value: new Date(campaign.created_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    },
  ].filter(item => item.value);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
        <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
          <FileText size={13} />
          Info Kampanye
        </h2>
      </div>
      <div className="divide-y divide-gray-50">
        {info.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="px-5 py-3 flex gap-3">
              <Icon size={16} className="text-[#003526] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {item.label}
                </p>
                <p className="text-sm text-gray-800 mt-0.5">{item.value}</p>
              </div>
            </div>
          );
        })}

        {/* Bank details */}
        {campaign.bank_name && campaign.bank_account_number && (
          <div className="px-5 py-3 flex gap-3">
            <Landmark size={16} className="text-[#003526] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Rekening Donasi
              </p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">
                {campaign.bank_name}
              </p>
              <p className="text-sm font-mono text-[#003526] mt-0.5">
                {campaign.bank_account_number}
              </p>
              {campaign.bank_account_name && (
                <p className="text-xs text-gray-500">a/n {campaign.bank_account_name}</p>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        {campaign.description && (
          <div className="px-5 py-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Cerita Kampanye
            </p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {campaign.description}
            </p>
          </div>
        )}

        {/* Proof documents */}
        {campaign.proof_documents && campaign.proof_documents.length > 0 && (
          <div className="px-5 py-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Dokumen Bukti ({campaign.proof_documents.length})
            </p>
            <div className="grid grid-cols-3 gap-2">
              {campaign.proof_documents.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:ring-2 hover:ring-[#003526] transition-all"
                >
                  <img src={url} alt={`Bukti ${i + 1}`} className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DonorsSection({
  donations,
  totalDonors,
}: {
  donations: Donation[];
  totalDonors: number;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
          <Users size={13} />
          Donatur
        </h2>
        <span className="text-[10px] font-bold text-gray-400">
          {donations.length} dari {totalDonors}
        </span>
      </div>
      <div className="divide-y divide-gray-50">
        {donations.map(d => (
          <div key={d.id} className="px-5 py-3 flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-100 to-pink-50 flex items-center justify-center shrink-0">
              <HeartHandshake size={15} className="text-[#BE185D]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-800 truncate">
                    {d.is_anonymous ? 'Hamba Allah' : (d.donor_name || 'Donatur')}
                  </p>
                  {d.donor_phone && !d.is_anonymous && (
                    <p className="text-[10px] text-gray-400 font-mono">{d.donor_phone}</p>
                  )}
                </div>
                <p className="text-sm font-extrabold text-[#BE185D] whitespace-nowrap">
                  {formatRupiah(d.amount)}
                </p>
              </div>
              {d.message && (
                <div className="mt-1.5 rounded-lg bg-pink-50/50 border border-pink-100 px-2.5 py-1.5">
                  <p className="text-[11px] text-gray-700 leading-relaxed italic">
                    &ldquo;{d.message}&rdquo;
                  </p>
                  {(d.aamiin_count ?? 0) > 0 && (
                    <p className="text-[10px] text-[#BE185D] font-bold mt-1 flex items-center gap-0.5">
                      <Sparkles size={9} />
                      {d.aamiin_count} Aamiin
                    </p>
                  )}
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-1">
                {new Date(d.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsSection({
  reports,
  totalReported,
  collected,
  canCreate,
  campaignId,
}: {
  reports: UsageReport[];
  totalReported: number;
  collected: number;
  canCreate: boolean;
  campaignId: string;
}) {
  const remaining = Math.max(0, collected - totalReported);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
          <FileText size={13} />
          Laporan Penggunaan Dana
        </h2>
        {canCreate && (
          <Link
            href={`/owner/campaign/${campaignId}/reports/new`}
            className="text-[10px] font-bold text-[#BE185D] hover:underline"
          >
            + Buat Laporan
          </Link>
        )}
      </div>

      {/* Summary */}
      {collected > 0 && (
        <div className="px-5 py-3 bg-amber-50/50 border-b border-amber-100">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                Sudah Dilaporkan
              </p>
              <p className="text-sm font-extrabold text-emerald-700">
                {formatRupiah(totalReported)}
              </p>
            </div>
            <div className="border-l border-amber-100">
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                Belum Dilaporkan
              </p>
              <p className="text-sm font-extrabold text-amber-700">
                {formatRupiah(remaining)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reports list */}
      {reports.length === 0 ? (
        <div className="p-8 text-center">
          <FileText size={26} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-700 mb-1">Belum ada laporan</p>
          <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
            Laporan penggunaan dana akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {reports.map(r => (
            <div key={r.id} className="px-5 py-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-bold text-gray-800 flex-1">
                  #{r.report_number} · {r.title}
                </p>
                <span className={`shrink-0 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                  r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {r.status === 'approved' ? 'Disetujui' : r.status === 'pending' ? 'Review' : 'Ditolak'}
                </span>
              </div>
              <p className="text-sm font-bold text-[#BE185D]">
                {formatRupiah(r.amount_used)}
              </p>
              {r.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                  {r.description}
                </p>
              )}
              <p className="text-[10px] text-gray-400 mt-1.5">
                {new Date(r.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionModal({
  type,
  campaign,
  loading,
  error,
  onConfirm,
  onClose,
}: {
  type: 'delete' | 'withdraw' | 'submit' | 'resubmit';
  campaign: Campaign;
  loading: boolean;
  error: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const config = {
    delete: {
      title: 'Hapus Draft Ini?',
      desc: `Draft "${campaign.title || '(Tanpa judul)'}" akan dihapus permanen. Aksi ini tidak bisa dibatalkan.`,
      confirm: 'Hapus Permanen',
      danger: true,
      icon: Trash2,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
    },
    withdraw: {
      title: 'Tarik Kembali Kampanye?',
      desc: `Kampanye "${campaign.title}" akan dikembalikan ke status Draft. Kamu bisa edit lalu submit ulang nanti. Tim TeraLoka tidak akan me-review kampanye ini sampai kamu submit lagi.`,
      confirm: 'Ya, Tarik Kembali',
      danger: false,
      icon: Undo2,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    submit: {
      title: 'Submit untuk Review?',
      desc: `Kampanye "${campaign.title}" akan dikirim ke tim TeraLoka untuk direview. Proses review biasanya 1-2 hari kerja. Setelah disubmit, kamu masih bisa edit, tapi sebaiknya pastikan semua data sudah benar.`,
      confirm: 'Ya, Submit',
      danger: false,
      icon: Send,
      iconBg: 'bg-pink-50',
      iconColor: 'text-[#BE185D]',
    },
    resubmit: {
      title: 'Submit Ulang?',
      desc: `Kampanye "${campaign.title}" akan dikirim ulang ke tim TeraLoka. Pastikan kamu sudah memperbaiki sesuai alasan penolakan sebelumnya. Alasan penolakan lama akan dihapus saat submit ulang.`,
      confirm: 'Ya, Submit Ulang',
      danger: false,
      icon: Send,
      iconBg: 'bg-pink-50',
      iconColor: 'text-[#BE185D]',
    },
  }[type];

  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5">
        <div className={`mx-auto w-12 h-12 rounded-full ${config.iconBg} flex items-center justify-center mb-3`}>
          <Icon size={22} className={config.iconColor} />
        </div>
        <h3 className="text-base font-bold text-gray-900 text-center mb-2">
          {config.title}
        </h3>
        <p className="text-xs text-gray-600 text-center mb-4 leading-relaxed">
          {config.desc}
        </p>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 mb-3">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 ${
              config.danger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-[#003526] hover:opacity-90'
            }`}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Memproses...
              </>
            ) : (
              config.confirm
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
