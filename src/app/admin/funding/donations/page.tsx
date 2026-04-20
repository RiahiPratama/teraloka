'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { formatRupiah } from '@/utils/format';
import {
  Loader2, CheckCircle2, XCircle, Clock, Search,
  UserRound, FileText, ShieldAlert, ArrowRight, RefreshCw,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';
const ADMIN_ROLES = ['admin_funding', 'super_admin'];

interface AdminDonation {
  id: string;
  donor_name: string;
  donor_phone: string | null;
  is_anonymous: boolean;
  amount: number;
  operational_fee: number;
  total_transfer: number;
  donation_code: string;
  message: string | null;
  transfer_proof_url: string | null;
  verification_status: string;
  created_at: string;
  campaign_id: string;
  campaign: {
    title: string;
    slug: string;
  } | null;
}

interface AdminStats {
  pending: number;
  verifiedToday: number;
  rejectedToday: number;
}

function relativeTime(date: string): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

export default function AdminDonationsPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();

  const [donations, setDonations] = useState<AdminDonation[]>([]);
  const [stats, setStats] = useState<AdminStats>({ pending: 0, verifiedToday: 0, rejectedToday: 0 });
  const [loading, setLoading] = useState(true);
  const [queryError, setQueryError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!ADMIN_ROLES.includes(user.role)) {
      router.push('/');
      return;
    }
  }, [user, authLoading, router]);

  async function fetchDonations() {
    if (!token) return;
    setLoading(true);
    setQueryError('');
    try {
      const res = await fetch(`${API}/funding/admin/donations?status=pending_review`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setQueryError(json?.error?.message || `HTTP ${res.status}`);
        setLoading(false);
        return;
      }

      setDonations(json.data.donations ?? []);
      setStats(json.data.stats ?? { pending: 0, verifiedToday: 0, rejectedToday: 0 });
    } catch (err: any) {
      console.error('[admin/donations] fetch error:', err);
      setQueryError(err?.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user && ADMIN_ROLES.includes(user.role) && token) {
      fetchDonations();
    }
  }, [user, token]);

  const filteredDonations = useMemo(() => {
    if (!searchQuery.trim()) return donations;
    const q = searchQuery.toLowerCase();
    return donations.filter(d =>
      d.donor_name.toLowerCase().includes(q) ||
      d.campaign?.title.toLowerCase().includes(q) ||
      d.donation_code.includes(q)
    );
  }, [donations, searchQuery]);

  if (authLoading || !user || !ADMIN_ROLES.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-[#003526]" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Verifikasi Donasi</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review & verifikasi donasi BADONASI yang sudah upload bukti transfer.
          </p>
        </div>
        <button
          onClick={fetchDonations}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {queryError && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 flex items-start gap-2">
          <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-bold text-red-700">Gagal muat data donasi</p>
            <p className="text-[11px] text-red-600 mt-0.5 font-mono">{queryError}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock size={20} className="text-amber-600" />
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Menunggu Review</p>
          </div>
          <p className="text-3xl font-extrabold text-gray-900">{stats.pending}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-emerald-600" />
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Verified Hari Ini</p>
          </div>
          <p className="text-3xl font-extrabold text-gray-900">{stats.verifiedToday}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <XCircle size={20} className="text-red-600" />
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Rejected Hari Ini</p>
          </div>
          <p className="text-3xl font-extrabold text-gray-900">{stats.rejectedToday}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Cari by nama donor, campaign, atau kode donasi..."
          className="w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 py-3 text-sm outline-none focus:border-[#003526]"
        />
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <Loader2 size={28} className="animate-spin text-[#003526] mx-auto" />
          </div>
        ) : filteredDonations.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <p className="text-base font-bold text-gray-900 mb-1">
              {searchQuery ? 'Tidak ada hasil' : 'Semua donasi sudah diverifikasi'}
            </p>
            <p className="text-sm text-gray-500">
              {searchQuery ? 'Coba keyword lain.' : 'Belum ada donasi baru yang menunggu review.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredDonations.map((d) => (
              <Link
                key={d.id}
                href={`/admin/funding/donations/${d.id}`}
                className="block px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center shrink-0">
                    <UserRound size={20} className="text-amber-700" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {d.is_anonymous ? 'Anonim' : d.donor_name}
                      </p>
                      {d.is_anonymous && (
                        <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded uppercase">
                          Anonim
                        </span>
                      )}
                      {d.message && (
                        <FileText size={11} className="text-[#EC4899]" aria-label="Ada pesan doa" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {d.campaign?.title ?? 'Campaign tidak dikenal'}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                      <span>Kode: <span className="font-mono font-bold text-gray-600">{d.donation_code}</span></span>
                      <span>·</span>
                      <span>{relativeTime(d.created_at)}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold text-[#003526]">
                      {formatRupiah(d.amount)}
                    </p>
                    {d.operational_fee > 0 && (
                      <p className="text-[10px] text-[#BA7517]">
                        +{formatRupiah(d.operational_fee)} ops
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                      Transfer {formatRupiah(d.total_transfer)}
                    </p>
                  </div>

                  <ArrowRight size={16} className="text-gray-400 shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 p-3">
        <ShieldAlert size={14} className="text-amber-700 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Tips verify:</strong> Pastikan nominal transfer di bukti sama persis dengan <strong>Total Transfer</strong> (amount + fee + kode unik 3 digit). Kalau beda 1 rupiah aja, reject dengan alasan jelas.
        </p>
      </div>
    </div>
  );
}
