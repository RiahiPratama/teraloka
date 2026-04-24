'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { formatRupiah } from '@/utils/format';
import {
  HeartHandshake, PlusCircle, ArrowLeft, Search,
  FileEdit, Hourglass, Megaphone, CheckCircle2, XCircle,
  Users, TrendingUp, Clock, Loader2, AlertCircle,
  Siren, ChevronRight, Trash2,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ═══════════════════════════════════════════════════════════════
// Types & Meta
// ═══════════════════════════════════════════════════════════════

interface MyCampaign {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'pending_review' | 'active' | 'completed' | 'rejected';
  cover_image_url?: string;
  category?: string;
  beneficiary_name?: string;
  partner_name?: string;
  target_amount: number;
  collected_amount: number;
  donor_count: number;
  deadline?: string | null;
  is_urgent: boolean;
  rejection_reason?: string | null;
  admin_note?: string | null;
  created_at: string;
  verified_at?: string | null;
}

interface OwnerStats {
  total: number;
  draft: number;
  pending_review: number;
  active: number;
  completed: number;
  rejected: number;
  archived: number;
  total_collected: number;
  total_donors: number;
}

type StatusTab = 'all' | 'draft' | 'pending_review' | 'active' | 'completed' | 'rejected';

const STATUS_META: Record<string, {
  label: string;
  color: string;
  bg: string;
  Icon: any;
}> = {
  draft:          { label: 'Draft',           color: '#6B7280', bg: 'bg-gray-100',     Icon: FileEdit },
  pending_review: { label: 'Menunggu Review', color: '#B45309', bg: 'bg-amber-100',    Icon: Hourglass },
  active:         { label: 'Aktif',           color: '#BE185D', bg: 'bg-pink-100',     Icon: Megaphone },
  completed:      { label: 'Selesai',         color: '#047857', bg: 'bg-emerald-100',  Icon: CheckCircle2 },
  rejected:       { label: 'Ditolak',         color: '#DC2626', bg: 'bg-red-100',      Icon: XCircle },
};

// ═══════════════════════════════════════════════════════════════
// Main page (wrapped in Suspense for useSearchParams)
// ═══════════════════════════════════════════════════════════════

function MyCampaignsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, isLoading: authLoading } = useAuth();

  const initialTab = (searchParams.get('tab') as StatusTab) || 'all';

  const [activeTab, setActiveTab] = useState<StatusTab>(initialTab);
  const [search, setSearch] = useState('');
  const [campaigns, setCampaigns] = useState<MyCampaign[]>([]);
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState<MyCampaign | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch data when tab changes or token arrives
  useEffect(() => {
    if (!token) return;

    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const statusParam = activeTab === 'all' ? '' : `&status=${activeTab}`;
        const searchParam = search.trim() ? `&q=${encodeURIComponent(search.trim())}` : '';

        const [listRes, statsRes] = await Promise.all([
          fetch(`${API}/funding/my/campaigns?page=1&limit=50&sort=newest${statusParam}${searchParam}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.json()),
          fetch(`${API}/funding/my/campaigns/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.json()),
        ]);

        if (listRes.success) setCampaigns(listRes.data);
        else setError(listRes.error?.message ?? 'Gagal memuat kampanye');

        if (statsRes.success) setStats(statsRes.data);
      } catch {
        setError('Koneksi bermasalah. Refresh halaman ya.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [token, activeTab, search]);

  // Update URL when tab changes
  function handleTabChange(tab: StatusTab) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'all') params.delete('tab');
    else params.set('tab', tab);
    router.replace(`/owner/campaign${params.toString() ? '?' + params.toString() : ''}`, { scroll: false });
  }

  async function handleDelete(campaign: MyCampaign) {
    if (!token) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/funding/my/campaigns/${campaign.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        // Remove from list + refetch stats
        setCampaigns(prev => prev.filter(c => c.id !== campaign.id));
        setDeleteModal(null);
        // Refetch stats
        const s = await fetch(`${API}/funding/my/campaigns/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json());
        if (s.success) setStats(s.data);
      } else {
        alert(json.error?.message ?? 'Gagal menghapus draft');
      }
    } catch {
      alert('Koneksi bermasalah. Coba lagi.');
    } finally {
      setDeleting(false);
    }
  }

  // ── Auth guard (inline, konsisten dengan pattern BAKOS) ──
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
            Kamu perlu login untuk melihat kampanye BADONASI kamu.
          </p>
          <button
            onClick={() => router.push('/login?redirect=/owner/campaign')}
            className="mt-5 w-full rounded-xl bg-[#003526] px-6 py-3 text-sm font-bold text-white"
          >
            Login Sekarang
          </button>
        </div>
      </div>
    );
  }

  // Tab definitions with counts
  const tabs: { key: StatusTab; label: string; count: number }[] = [
    { key: 'all',            label: 'Semua',   count: stats ? stats.total - stats.archived : 0 },
    { key: 'draft',          label: 'Draft',   count: stats?.draft ?? 0 },
    { key: 'pending_review', label: 'Review',  count: stats?.pending_review ?? 0 },
    { key: 'active',         label: 'Aktif',   count: stats?.active ?? 0 },
    { key: 'completed',      label: 'Selesai', count: stats?.completed ?? 0 },
    { key: 'rejected',       label: 'Ditolak', count: stats?.rejected ?? 0 },
  ];

  const isEmpty = !loading && campaigns.length === 0;

  return (
    <div className="min-h-screen bg-[#f9f9f8] pb-24">

      {/* Header — pink/dark gradient, BADONASI vibe */}
      <div className="bg-gradient-to-br from-[#003526] via-[#003526] to-[#1B6B4A] px-4 pt-6 pb-14 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-[#EC4899]/15 blur-3xl -translate-y-1/3 translate-x-1/3"></div>

        <div className="relative mx-auto max-w-lg">
          <Link
            href="/owner"
            className="inline-flex items-center gap-1.5 text-[#95d3ba] text-xs mb-3 hover:text-white transition-colors"
          >
            <ArrowLeft size={13} />
            Portal Mitra
          </Link>

          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <HeartHandshake size={18} className="text-[#F472B6]" strokeWidth={2.2} />
                <p className="text-[10px] font-bold text-[#F472B6] uppercase tracking-widest">
                  BADONASI
                </p>
              </div>
              <h1 className="text-xl font-extrabold text-white">Kampanye Saya</h1>
              <p className="text-xs text-[#95d3ba] mt-1">
                Kelola semua kampanye galang dana kamu di sini
              </p>
            </div>

            <Link
              href="/owner/campaign/new/info"
              className="shrink-0 inline-flex items-center gap-1.5 bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg hover:opacity-90 transition-opacity"
            >
              <PlusCircle size={14} strokeWidth={2.2} />
              <span className="hidden sm:inline">Galang Baru</span>
              <span className="sm:hidden">Baru</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-lg px-4 -mt-8 relative z-10 space-y-4">

        {/* Stats Summary Card */}
        {stats && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp size={12} className="text-emerald-600" />
                  <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">
                    Terkumpul
                  </p>
                </div>
                <p className="text-sm font-extrabold text-[#003526] leading-tight">
                  {formatRupiah(stats.total_collected)}
                </p>
              </div>
              <div className="text-center border-l border-r border-gray-100">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users size={12} className="text-pink-600" />
                  <p className="text-[9px] font-bold text-pink-700 uppercase tracking-wider">
                    Donatur
                  </p>
                </div>
                <p className="text-sm font-extrabold text-[#003526] leading-tight">
                  {stats.total_donors.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Megaphone size={12} className="text-[#BE185D]" />
                  <p className="text-[9px] font-bold text-[#BE185D] uppercase tracking-wider">
                    Aktif
                  </p>
                </div>
                <p className="text-sm font-extrabold text-[#003526] leading-tight">
                  {stats.active}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
          {tabs.map(tab => {
            const isActive = activeTab === tab.key;
            const hasCount = tab.count > 0;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#003526] text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                {hasCount && (
                  <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-extrabold px-1 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari judul, penerima, atau partner..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#003526] bg-white"
          />
        </div>

        {/* Content */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-700">Terjadi kesalahan</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : isEmpty ? (
          <EmptyState tab={activeTab} hasSearch={!!search.trim()} />
        ) : (
          <div className="space-y-3">
            {campaigns.map(c => (
              <CampaignCard
                key={c.id}
                campaign={c}
                onDelete={() => setDeleteModal(c)}
              />
            ))}
          </div>
        )}

      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <Trash2 size={22} className="text-red-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-1">
              Hapus Draft Ini?
            </h3>
            <p className="text-xs text-gray-500 text-center mb-4 leading-relaxed">
              Draft <strong>&ldquo;{deleteModal.title || '(Tanpa judul)'}&rdquo;</strong> akan dihapus permanen. Aksi ini tidak bisa dibatalkan.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteModal(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteModal)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Hapus
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Campaign Card — inline component
// ═══════════════════════════════════════════════════════════════

function CampaignCard({
  campaign,
  onDelete,
}: {
  campaign: MyCampaign;
  onDelete: () => void;
}) {
  const meta = STATUS_META[campaign.status] || STATUS_META.draft;
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

  // Link target based on status
  // Draft → resume wizard (not implemented yet, fallback to detail)
  // Others → detail page
  const detailHref = campaign.status === 'draft'
    ? `/owner/campaign/${campaign.id}/edit`
    : `/owner/campaign/${campaign.id}`;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <Link href={detailHref} className="block p-3 hover:bg-gray-50/50 transition-colors">
        <div className="flex gap-3">
          {/* Thumbnail */}
          <div className="w-20 h-20 rounded-xl bg-gray-100 shrink-0 overflow-hidden relative">
            {campaign.cover_image_url ? (
              <img
                src={campaign.cover_image_url}
                alt={campaign.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#003526]/5 to-[#EC4899]/10">
                <HeartHandshake size={24} className="text-[#003526]/30" />
              </div>
            )}
            {campaign.is_urgent && (
              <span className="absolute top-1 left-1 inline-flex items-center gap-0.5 bg-red-500 text-white text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full shadow">
                <Siren size={8} />
                Urgent
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-sm font-bold text-gray-900 line-clamp-1 flex-1">
                {campaign.title || '(Tanpa judul)'}
              </p>
              <ChevronRight size={14} className="text-gray-400 shrink-0 mt-0.5" />
            </div>

            {/* Status badge + category */}
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider"
                style={{ color: meta.color, backgroundColor: meta.bg.includes('bg-') ? '' : meta.bg }}
              >
                <StatusIcon size={9} strokeWidth={2.5} />
                <span className={meta.bg}
                  style={{ backgroundColor: 'transparent' }}>
                  {meta.label}
                </span>
              </span>
              {campaign.beneficiary_name && (
                <span className="text-[10px] text-gray-400 truncate">
                  · {campaign.beneficiary_name}
                </span>
              )}
            </div>

            {/* Status-specific content */}
            {campaign.status === 'rejected' && campaign.rejection_reason ? (
              <div className="rounded-lg bg-red-50 border border-red-100 p-2 mt-1">
                <p className="text-[10px] font-bold text-red-700 mb-0.5">📌 Alasan ditolak</p>
                <p className="text-[10px] text-red-600 line-clamp-2 leading-relaxed">
                  {campaign.rejection_reason}
                </p>
              </div>
            ) : campaign.status === 'pending_review' ? (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-700">
                <Clock size={10} />
                <span>Sedang ditinjau tim TeraLoka (biasanya 1-2 hari kerja)</span>
              </div>
            ) : campaign.status === 'draft' ? (
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <FileEdit size={10} />
                <span>Lanjutkan mengisi data kampanye</span>
              </div>
            ) : (
              <>
                {/* Active/Completed: show progress */}
                <div className="flex items-baseline gap-2 mb-1">
                  <p className="text-xs font-bold text-[#003526]">
                    {formatRupiah(campaign.collected_amount)}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    dari {formatRupiah(campaign.target_amount)}
                  </p>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#EC4899] to-[#BE185D] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500">
                  <span className="flex items-center gap-0.5">
                    <Users size={10} />
                    {campaign.donor_count} donatur
                  </span>
                  {daysLeft !== null && (
                    <span className="flex items-center gap-0.5">
                      <Clock size={10} />
                      {daysLeft > 0 ? `${daysLeft} hari lagi` : 'Berakhir'}
                    </span>
                  )}
                  <span className="font-bold text-[#BE185D]">
                    {progress.toFixed(0)}%
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </Link>

      {/* Action row — only for drafts */}
      {campaign.status === 'draft' && (
        <div className="flex items-center gap-2 px-3 pb-3 pt-0">
          <Link
            href={`/owner/campaign/${campaign.id}/edit`}
            className="flex-1 text-center py-2 rounded-lg bg-[#003526] text-white text-xs font-bold hover:opacity-90 transition-opacity"
          >
            Lanjutkan Draft
          </Link>
          <button
            onClick={onDelete}
            className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1"
          >
            <Trash2 size={12} />
            Hapus
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Empty State — inline component
// ═══════════════════════════════════════════════════════════════

function EmptyState({ tab, hasSearch }: { tab: StatusTab; hasSearch: boolean }) {
  if (hasSearch) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-3">
          <Search size={24} className="text-gray-300" />
        </div>
        <p className="text-sm font-bold text-gray-700 mb-1">Tidak ditemukan</p>
        <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
          Coba kata kunci lain atau reset filter status.
        </p>
      </div>
    );
  }

  const emptyMessages: Record<StatusTab, { title: string; desc: string; showCTA: boolean }> = {
    all: {
      title: 'Belum ada kampanye',
      desc: 'Mulai galang dana untuk keluarga, tetangga, atau siapa pun yang butuh uluran tangan.',
      showCTA: true,
    },
    draft: {
      title: 'Tidak ada draft',
      desc: 'Kalau kamu mulai kampanye tapi belum selesai mengisi, draft-nya akan muncul di sini.',
      showCTA: true,
    },
    pending_review: {
      title: 'Tidak ada kampanye yang direview',
      desc: 'Kampanye yang kamu submit akan ditinjau tim TeraLoka dan muncul di tab ini.',
      showCTA: false,
    },
    active: {
      title: 'Belum ada kampanye aktif',
      desc: 'Kampanye yang sudah diverifikasi dan sedang menerima donasi akan muncul di sini.',
      showCTA: false,
    },
    completed: {
      title: 'Belum ada kampanye selesai',
      desc: 'Kampanye yang targetnya sudah tercapai akan muncul di sini.',
      showCTA: false,
    },
    rejected: {
      title: 'Tidak ada kampanye ditolak',
      desc: 'Good news — semua kampanye kamu valid! 🎉',
      showCTA: false,
    },
  };

  const msg = emptyMessages[tab];

  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mb-4">
        <HeartHandshake size={28} className="text-[#EC4899]" strokeWidth={2.2} />
      </div>
      <p className="text-sm font-bold text-gray-900 mb-1">{msg.title}</p>
      <p className="text-xs text-gray-500 mb-5 leading-relaxed max-w-xs mx-auto">
        {msg.desc}
      </p>
      {msg.showCTA && (
        <Link
          href="/owner/campaign/new/info"
          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-md"
        >
          <PlusCircle size={15} />
          Galang Dana Pertama
        </Link>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Export with Suspense wrapper (required for useSearchParams)
// ═══════════════════════════════════════════════════════════════

export default function MyCampaignsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 size={28} className="animate-spin text-[#003526]" />
        </div>
      }
    >
      <MyCampaignsContent />
    </Suspense>
  );
}
