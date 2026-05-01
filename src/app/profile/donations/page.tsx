'use client';

// ═══════════════════════════════════════════════════════════════
// /profile/donations/page.tsx
// Riwayat donasi untuk donor yang sedang login
//
// Backend endpoint: GET /funding/me/donations
// Auth: required (redirect to /login kalau belum)
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { formatRupiah } from '@/utils/format';
import {
  ArrowLeft, Loader2, AlertCircle, CheckCircle2, XCircle,
  Hourglass, Heart, Calendar, FileText, Eye, Building2,
  HeartHandshake, TrendingUp, Filter,
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

const STATUS_META: Record<DonationStatus, { label: string; color: string; bg: string; icon: any }> = {
  pending:  { label: 'Menunggu Verifikasi', color: '#B45309', bg: '#FEF3C7', icon: Hourglass    },
  verified: { label: 'Tersalurkan',          color: '#047857', bg: '#D1FAE5', icon: CheckCircle2 },
  rejected: { label: 'Ditolak',              color: '#B91C1C', bg: '#FEE2E2', icon: XCircle      },
};

const TABS: Array<{ key: 'all' | DonationStatus; label: string }> = [
  { key: 'all',      label: 'Semua' },
  { key: 'pending',  label: 'Menunggu' },
  { key: 'verified', label: 'Tersalurkan' },
  { key: 'rejected', label: 'Ditolak' },
];

export default function MyDonationsPage() {
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
    const totalCampaigns = new Set(donations.filter(d => d.verification_status === 'verified').map(d => d.campaigns?.id)).size;
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

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-[#003526] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/profile" className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-700" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900">Riwayat Donasi</h1>
            <p className="text-xs text-gray-500">{donations.length} donasi tercatat</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* Hero stats card */}
        {donations.length > 0 ? (
          <div className="bg-gradient-to-br from-[#BE185D] to-[#831843] rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <HeartHandshake size={16} className="opacity-80" />
              <p className="text-xs font-semibold opacity-90 uppercase tracking-wide">Total Sudah Disalurkan</p>
            </div>
            <p className="text-3xl font-black mb-3">{formatRupiah(stats.totalDisalurkan)}</p>
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/20 text-xs">
              <div>
                <p className="opacity-70 mb-0.5">Donasi</p>
                <p className="font-bold">{stats.verified}</p>
              </div>
              <div>
                <p className="opacity-70 mb-0.5">Kampanye</p>
                <p className="font-bold">{stats.totalCampaigns}</p>
              </div>
              <div>
                <p className="opacity-70 mb-0.5">Pending</p>
                <p className="font-bold">{stats.pending}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
            <Heart size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-700 mb-1">Belum ada donasi</p>
            <p className="text-xs text-gray-500 mb-4 max-w-xs mx-auto">
              Mulai berdonasi dan bantu sesama warga Maluku Utara yang membutuhkan.
            </p>
            <Link
              href="/fundraising"
              className="inline-flex items-center gap-2 bg-[#BE185D] hover:bg-[#831843] text-white text-sm font-bold py-2.5 px-5 rounded-xl transition-colors"
            >
              <Heart size={14} />
              Lihat Kampanye
            </Link>
          </div>
        )}

        {/* Tabs filter */}
        {donations.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-1.5 flex gap-1 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 min-w-fit px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'bg-[#003526] text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.label} ({counts[tab.key]})
              </button>
            ))}
          </div>
        )}

        {/* List */}
        {filtered.length === 0 && donations.length > 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-gray-100">
            <Filter size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600">Tidak ada donasi di kategori ini</p>
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

function DonationCard({ d }: { d: MyDonation }) {
  const meta = STATUS_META[d.verification_status];
  const Icon = meta.icon;
  const c = d.campaigns;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Cover image kalau ada */}
      {c?.cover_image_url && (
        <div className="relative h-32 bg-gray-100">
          <img
            src={c.cover_image_url}
            alt={c.title}
            className="w-full h-full object-cover"
          />
          <span
            className="absolute top-2 right-2 inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md backdrop-blur-md"
            style={{ color: meta.color, backgroundColor: `${meta.bg}E6` }}
          >
            <Icon size={11} />
            {meta.label}
          </span>
        </div>
      )}

      <div className="p-4">
        {/* Status badge (kalau tidak ada cover) */}
        {!c?.cover_image_url && (
          <div className="flex items-center justify-between mb-2">
            <span
              className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md"
              style={{ color: meta.color, backgroundColor: meta.bg }}
            >
              <Icon size={11} />
              {meta.label}
            </span>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md font-mono">
              #{d.donation_code}
            </span>
          </div>
        )}

        {/* Campaign title */}
        {c ? (
          <Link
            href={`/fundraising/${c.slug}`}
            className="block hover:opacity-80 transition-opacity"
          >
            <h3 className="text-sm font-bold text-gray-900 line-clamp-2 mb-1">
              {c.title}
            </h3>
            {c.partner_name && (
              <p className="text-xs text-gray-500 mb-2">
                via {c.partner_name}
              </p>
            )}
          </Link>
        ) : (
          <p className="text-sm font-bold text-gray-400 italic mb-2">Kampanye dihapus</p>
        )}

        {/* Amount */}
        <p className="text-2xl font-black text-[#BE185D] mb-3">{formatRupiah(d.amount)}</p>

        {/* Meta info */}
        <div className="space-y-1.5 text-xs text-gray-600 mb-3">
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-gray-400" />
            {new Date(d.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
          {c?.bank_name && (
            <div className="flex items-center gap-2">
              <Building2 size={12} className="text-gray-400" />
              {c.bank_name} · {c.bank_account_number}
            </div>
          )}
          {d.is_anonymous && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">🎭</span>
              <span className="italic">Donasi anonim (tampil sebagai "{d.donor_name}")</span>
            </div>
          )}
        </div>

        {/* Pesan/doa */}
        {d.message && (
          <div className="bg-gray-50 rounded-lg p-2.5 mb-3 border-l-2 border-[#BE185D]/40">
            <p className="text-xs text-gray-700 italic">"{d.message}"</p>
          </div>
        )}

        {/* Status-specific banners */}
        {d.verification_status === 'pending' && !d.transfer_proof_url && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3">
            <p className="text-[10px] font-bold text-amber-700 uppercase mb-0.5">⚠️ Bukti Transfer Belum Diupload</p>
            <p className="text-xs text-amber-800 leading-relaxed mb-2">
              Donasi belum bisa diverifikasi tanpa bukti transfer.
            </p>
            <Link
              href={c ? `/fundraising/${c.slug}/konfirmasi?id=${d.id}` : '#'}
              className="inline-block text-xs font-bold text-amber-700 underline"
            >
              Upload sekarang →
            </Link>
          </div>
        )}

        {d.verification_status === 'pending' && d.transfer_proof_url && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 mb-3">
            <p className="text-xs text-blue-800 leading-relaxed">
              ⏳ Sedang diverifikasi tim penggalang. Biasanya 1-2 hari kerja.
            </p>
          </div>
        )}

        {d.verification_status === 'rejected' && d.rejection_reason && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-2.5 mb-3">
            <p className="text-[10px] font-bold text-red-700 uppercase mb-0.5">Alasan Ditolak</p>
            <p className="text-xs text-red-800 leading-relaxed">{d.rejection_reason}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          {c && (
            <Link
              href={`/fundraising/${c.slug}/terima-kasih?id=${d.id}`}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 py-2 px-3 rounded-lg border border-gray-200"
            >
              <Eye size={13} />
              Detail
            </Link>
          )}
          {d.transfer_proof_url && (
            <a
              href={d.transfer_proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#003526] bg-[#003526]/5 hover:bg-[#003526]/10 py-2 px-3 rounded-lg"
            >
              <FileText size={13} />
              Bukti
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
