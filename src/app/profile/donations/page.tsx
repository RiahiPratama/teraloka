'use client';

// ═══════════════════════════════════════════════════════════════
// /profile/donations/page.tsx — v2 Refined Design
//
// Improvements:
// - Refined hero card (vibrant pink gradient + decorative heart)
// - Adaptive card layout (cover for pending/rejected, compact for verified)
// - Refined status badges (Tailwind design system colors)
// - Skeleton loading state
// - Better empty state
// - Tap feedback animations
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { formatRupiah } from '@/utils/format';
import {
  ArrowLeft, CheckCircle2, XCircle, Hourglass,
  Heart, Calendar, FileText, Eye, Building2, HeartHandshake,
  Filter, ChevronRight, AlertTriangle,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';
const TOKEN_KEY = 'tl_token';

type DonationStatus = 'pending' | 'verified' | 'rejected';

interface MyDonation {
  id: string;
  donation_code: string;
  amount: number;
  operational_fee: number;
  penggalang_fee: number;
  total_transfer: number;
  verification_status: DonationStatus;
  transfer_proof_url: string | null;
  is_anonymous: boolean;
  message: string | null;
  donor_name: string;
  created_at: string;
  verified_at: string | null;
  rejection_reason: string | null;
  campaigns: {
    id: string;
    title: string;
    slug: string;
    partner_name: string | null;
    beneficiary_name: string | null;
    bank_name: string | null;
    bank_account_number: string | null;
    bank_account_name: string | null;
    cover_image_url: string | null;
    status: string;
  } | null;
}

const STATUS_META: Record<DonationStatus, {
  label: string;
  textCls: string;
  bgCls: string;
  borderCls: string;
  icon: any;
}> = {
  pending: {
    label: 'Menunggu',
    textCls: 'text-amber-700',
    bgCls: 'bg-amber-50',
    borderCls: 'border-amber-200',
    icon: Hourglass,
  },
  verified: {
    label: 'Tersalurkan',
    textCls: 'text-emerald-700',
    bgCls: 'bg-emerald-50',
    borderCls: 'border-emerald-200',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Ditolak',
    textCls: 'text-red-700',
    bgCls: 'bg-red-50',
    borderCls: 'border-red-200',
    icon: XCircle,
  },
};

const TABS: Array<{ key: 'all' | DonationStatus; label: string }> = [
  { key: 'all',      label: 'Semua' },
  { key: 'pending',  label: 'Menunggu' },
  { key: 'verified', label: 'Tersalurkan' },
  { key: 'rejected', label: 'Ditolak' },
];

export default function ProfileDonationsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [donations, setDonations] = useState<MyDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | DonationStatus>('all');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login?redirect=/profile/donations');
      return;
    }

    async function load() {
      const token = localStorage.getItem(TOKEN_KEY);
      try {
        const res = await fetch(`${API}/funding/me/donations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success) {
          setDonations(json.data ?? []);
        } else {
          toast.error(json?.error?.message || 'Gagal memuat riwayat donasi');
        }
      } catch (err: any) {
        toast.error(err.message || 'Koneksi bermasalah');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [authLoading, user, router, toast]);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return donations;
    return donations.filter(d => d.verification_status === activeTab);
  }, [donations, activeTab]);

  const stats = useMemo(() => {
    const verified = donations.filter(d => d.verification_status === 'verified');
    const pending  = donations.filter(d => d.verification_status === 'pending');
    const totalDisalurkan = verified.reduce((s, d) => s + Number(d.amount), 0);
    const totalCampaigns = new Set(
      donations
        .filter(d => d.verification_status === 'verified')
        .map(d => d.campaigns?.id)
    ).size;
    return {
      total: donations.length,
      verified: verified.length,
      pending: pending.length,
      totalDisalurkan,
      totalCampaigns,
    };
  }, [donations]);

  const counts = useMemo(() => ({
    all:      donations.length,
    pending:  donations.filter(d => d.verification_status === 'pending').length,
    verified: donations.filter(d => d.verification_status === 'verified').length,
    rejected: donations.filter(d => d.verification_status === 'rejected').length,
  }), [donations]);

  if (loading || authLoading) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/profile"
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 active:scale-95 transition-transform"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900">Riwayat Donasi</h1>
            <p className="text-xs text-gray-500">
              {donations.length === 0 ? 'Belum ada donasi' : `${donations.length} donasi tercatat`}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* Hero Stats Card — Refined */}
        {donations.length > 0 ? (
          <HeroStatsCard stats={stats} />
        ) : (
          <EmptyState />
        )}

        {/* Filter Pills — Refined */}
        {donations.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap active:scale-95 transition-all ${
                  activeTab === tab.key
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                }`}
              >
                {tab.label} · {counts[tab.key]}
              </button>
            ))}
          </div>
        )}

        {/* List */}
        {filtered.length === 0 && donations.length > 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Filter size={20} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">Tidak ada di kategori ini</p>
            <p className="text-xs text-gray-500 mt-1">Coba pilih tab lain</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(d => <DonationCard key={d.id} d={d} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Hero Stats Card ─────────────────────────────────────────────
function HeroStatsCard({ stats }: { stats: any }) {
  return (
    <div
      className="relative rounded-2xl p-5 text-white overflow-hidden shadow-sm"
      style={{
        background: 'linear-gradient(135deg, #EC4899 0%, #BE185D 50%, #9F1547 100%)',
      }}
    >
      {/* Decorative heart watermark */}
      <div className="absolute -top-4 -right-4 opacity-15 pointer-events-none">
        <Heart size={120} fill="white" stroke="none" />
      </div>

      {/* Subtle radial accent top-left */}
      <div
        className="absolute top-0 left-0 w-32 h-32 opacity-25 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <HeartHandshake size={14} className="opacity-90" />
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">
            Total Sudah Disalurkan
          </p>
        </div>
        <p className="text-3xl font-black mb-4 tracking-tight">
          {formatRupiah(stats.totalDisalurkan)}
        </p>

        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/25">
          <StatItem label="Donasi" value={stats.verified} />
          <StatItem label="Kampanye" value={stats.totalCampaigns} />
          <StatItem label="Pending" value={stats.pending} />
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] opacity-75 mb-0.5 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-black">{value}</p>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: 'linear-gradient(135deg, #FCE7F3 0%, #FBCFE8 100%)' }}
      >
        <Heart size={28} className="text-[#BE185D]" fill="#BE185D" fillOpacity={0.3} />
      </div>
      <p className="text-base font-bold text-gray-800 mb-1">Belum ada donasi</p>
      <p className="text-xs text-gray-500 mb-5 max-w-xs mx-auto leading-relaxed">
        Mulai berdonasi dan bantu sesama warga Maluku Utara yang membutuhkan.
      </p>
      <Link
        href="/fundraising"
        className="inline-flex items-center gap-2 bg-[#BE185D] hover:bg-[#9F1547] text-white text-sm font-bold py-2.5 px-5 rounded-full transition-colors active:scale-95"
      >
        <Heart size={14} />
        Lihat Kampanye
      </Link>
    </div>
  );
}

// ─── Donation Card (Adaptive) ────────────────────────────────────
function DonationCard({ d }: { d: MyDonation }) {
  const meta = STATUS_META[d.verification_status];
  const c = d.campaigns;

  // Adaptive: pending/rejected = full with cover (action needed)
  // verified = compact (just info, less emphasis)
  const showCover = d.verification_status !== 'verified';

  if (showCover) {
    return <DonationCardFull d={d} meta={meta} c={c} />;
  }
  return <DonationCardCompact d={d} meta={meta} c={c} />;
}

// ─── Full Card — pending/rejected ────────────────────────────────
function DonationCardFull({ d, meta, c }: any) {
  const Icon = meta.icon;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden active:scale-[0.99] transition-transform">
      {c?.cover_image_url ? (
        <div className="relative h-32 bg-gray-100">
          <img
            src={c.cover_image_url}
            alt={c.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          <span
            className={`absolute top-2.5 right-2.5 inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md bg-white/95 ${meta.textCls} border ${meta.borderCls}`}
          >
            <Icon size={10} />
            {meta.label}
          </span>

          <span className="absolute bottom-2 left-2.5 text-[10px] font-bold text-white/95 uppercase tracking-wider drop-shadow-sm">
            BADONASI
          </span>
        </div>
      ) : (
        <div className="px-4 pt-4 flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#BE185D] uppercase tracking-wider">
            BADONASI
          </span>
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.bgCls} ${meta.textCls} border ${meta.borderCls}`}
          >
            <Icon size={10} />
            {meta.label}
          </span>
        </div>
      )}

      <div className="p-4">
        {c ? (
          <Link href={`/fundraising/${c.slug}`} className="block">
            <h3 className="text-sm font-bold text-gray-900 line-clamp-2 mb-0.5 hover:text-[#BE185D] transition-colors">
              {c.title}
            </h3>
            {c.partner_name && (
              <p className="text-xs text-gray-500 mb-2.5">via {c.partner_name}</p>
            )}
          </Link>
        ) : (
          <p className="text-sm font-bold text-gray-400 italic mb-2">Kampanye dihapus</p>
        )}

        <div className="flex items-baseline justify-between mb-3 gap-2">
          <p className="text-xl font-black text-[#BE185D]">{formatRupiah(d.amount)}</p>
          <p className="text-[10px] text-gray-400 flex items-center gap-1">
            <Calendar size={10} />
            {new Date(d.created_at).toLocaleString('id-ID', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>

        {c?.bank_name && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-2">
            <Building2 size={11} />
            <span>{c.bank_name} · {c.bank_account_number}</span>
          </div>
        )}

        {d.is_anonymous && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 italic mb-2">
            <span>🎭</span>
            <span>Donasi anonim (tampil sebagai &quot;{d.donor_name}&quot;)</span>
          </div>
        )}

        {d.message && (
          <div className="bg-gray-50 rounded-xl p-2.5 mb-3 border-l-2 border-[#BE185D]/40">
            <p className="text-xs text-gray-700 italic leading-relaxed">&quot;{d.message}&quot;</p>
          </div>
        )}

        {d.verification_status === 'pending' && !d.transfer_proof_url && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-[11px] font-bold text-amber-800 uppercase mb-0.5">Bukti Belum Diupload</p>
                <p className="text-xs text-amber-800 leading-relaxed mb-1.5">
                  Donasi belum bisa diverifikasi tanpa bukti transfer.
                </p>
                <Link
                  href={c ? `/fundraising/${c.slug}/konfirmasi?id=${d.id}` : '#'}
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:underline"
                >
                  Upload sekarang
                  <ChevronRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {d.verification_status === 'pending' && d.transfer_proof_url && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5 mb-3 flex items-center gap-2">
            <Hourglass size={12} className="text-blue-700 flex-shrink-0" />
            <p className="text-xs text-blue-800 leading-relaxed">
              Sedang diverifikasi tim penggalang · 1-2 hari kerja
            </p>
          </div>
        )}

        {d.verification_status === 'rejected' && d.rejection_reason && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-3">
            <p className="text-[10px] font-bold text-red-700 uppercase mb-1">Alasan Ditolak</p>
            <p className="text-xs text-red-800 leading-relaxed">{d.rejection_reason}</p>
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t border-gray-50">
          {c && (
            <Link
              href={`/fundraising/${c.slug}/terima-kasih?id=${d.id}`}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 active:scale-95 py-2 px-3 rounded-lg bg-gray-50 transition-all"
            >
              <Eye size={12} />
              Detail
            </Link>
          )}
          {d.transfer_proof_url && (
            <a
              href={d.transfer_proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#BE185D] bg-[#BE185D]/5 hover:bg-[#BE185D]/10 active:scale-95 py-2 px-3 rounded-lg transition-all"
            >
              <FileText size={12} />
              Bukti
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Compact Card — verified ─────────────────────────────────────
function DonationCardCompact({ d, meta, c }: any) {
  const Icon = meta.icon;

  return (
    <Link
      href={c ? `/fundraising/${c.slug}/terima-kasih?id=${d.id}` : '#'}
      className="block bg-white rounded-2xl border border-gray-100 p-4 hover:border-emerald-200 active:scale-[0.99] transition-all"
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.bgCls} ${meta.textCls} border ${meta.borderCls}`}
        >
          <Icon size={10} />
          {meta.label}
        </span>
        <p className="text-[10px] text-gray-400 ml-auto flex items-center gap-1">
          <Calendar size={10} />
          {new Date(d.verified_at || d.created_at).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short'
          })}
        </p>
      </div>

      {c ? (
        <>
          <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug mb-0.5">
            {c.title}
          </h3>
          {c.partner_name && (
            <p className="text-[11px] text-gray-500 mb-2.5">via {c.partner_name}</p>
          )}
        </>
      ) : (
        <p className="text-sm font-bold text-gray-400 italic mb-2">Kampanye dihapus</p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-lg font-black text-[#BE185D]">{formatRupiah(d.amount)}</p>
        <span className="text-[11px] font-bold text-[#0891B2] flex items-center gap-0.5 group">
          Lihat detail
          <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </Link>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-200 animate-pulse" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-1" />
            <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        <div className="h-36 bg-gradient-to-br from-pink-200 to-pink-300 rounded-2xl animate-pulse" />
        <div className="flex gap-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-8 w-20 bg-gray-200 rounded-full animate-pulse" />
          ))}
        </div>
        {[1,2,3].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="h-32 bg-gray-200 animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse" />
              <div className="h-6 w-1/3 bg-gray-200 rounded animate-pulse mt-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
