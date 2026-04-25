'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { formatRupiah } from '@/utils/format';
import {
  HeartHandshake, Plus, Inbox, ChevronRight, Loader2,
  Megaphone, FileEdit, Hourglass, CheckCircle2, XCircle,
  Home, Building2, Car, Wrench, Eye, MessageCircle,
  TrendingUp, AlertTriangle, Sparkles,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

const LISTING_TYPES = [
  { key: 'kos',       label: 'Kos-kosan', Icon: Home,       href: '/owner/listing/new/kos',        color: '#0891B2' },
  { key: 'properti',  label: 'Properti',  Icon: Building2,  href: '/owner/listing/new?type=properti', color: '#1B6B4A' },
  { key: 'kendaraan', label: 'Kendaraan', Icon: Car,        href: '/owner/listing/new?type=kendaraan', color: '#E8963A' },
  { key: 'jasa',      label: 'Jasa',      Icon: Wrench,     href: '/owner/listing/new?type=jasa',     color: '#888780' },
];

interface CampaignStats {
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

export default function OwnerDashboard() {
  const { user, token, isLoading: loading } = useAuth();

  // Listing state (existing)
  const [listings, setListings] = useState<any[]>([]);
  const [fetchingListings, setFetchingListings] = useState(false);

  // BADONASI state (new)
  const [campaignStats, setCampaignStats] = useState<CampaignStats | null>(null);
  const [pendingDonations, setPendingDonations] = useState<number>(0);
  const [fetchingBadonasi, setFetchingBadonasi] = useState(false);

  // Fetch listings
  useEffect(() => {
    if (!token) return;
    setFetchingListings(true);
    fetch(`${API}/listings/owner/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { if (d.success) setListings(d.data ?? []); })
      .catch(() => {})
      .finally(() => setFetchingListings(false));
  }, [token]);

  // Fetch BADONASI stats
  useEffect(() => {
    if (!token) return;
    setFetchingBadonasi(true);

    Promise.all([
      // Campaign stats aggregate
      fetch(`${API}/funding/my/campaigns/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).catch(() => null),

      // Pending donations count (across all my campaigns)
      fetch(`${API}/funding/my/donations?status=pending&limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).catch(() => null),
    ])
      .then(([statsRes, pendingRes]) => {
        if (statsRes?.success) setCampaignStats(statsRes.data);
        if (pendingRes?.success) {
          // Backend returns { data: [...], total } or meta.total — handle both
          const total = pendingRes?.meta?.total ?? pendingRes?.data?.total ?? 0;
          setPendingDonations(total);
        }
      })
      .finally(() => setFetchingBadonasi(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#1B6B4A]" />
      </div>
    );
  }

  if (!user || !token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-3">🔒</p>
          <h2 className="text-lg font-semibold">Login Dulu</h2>
          <p className="mt-1 text-sm text-gray-500 mb-4">
            Kamu harus login untuk akses portal mitra.
          </p>
          <Link
            href="/login"
            className="rounded-xl bg-[#1B6B4A] px-6 py-2.5 text-sm font-semibold text-white"
          >
            Login sekarang
          </Link>
        </div>
      </div>
    );
  }

  const totalViews = listings.reduce((sum, l) => sum + (l.view_count ?? 0), 0);
  const totalContacts = listings.reduce((sum, l) => sum + (l.contact_count ?? 0), 0);

  // Compute BADONASI summary
  const activeCampaigns = campaignStats?.active ?? 0;
  const totalCampaigns = campaignStats?.total ?? 0;
  const totalCollected = campaignStats?.total_collected ?? 0;
  const totalDonors = campaignStats?.total_donors ?? 0;
  const hasAnyCampaign = totalCampaigns > 0;

  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-20">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#1B6B4A]">Portal Mitra</h1>
        <p className="text-sm text-gray-500">Halo, {user.name ?? '+' + user.phone} 👋</p>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION 1: BADONASI                                  */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#003526] to-[#1B6B4A] p-5 text-white shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <HeartHandshake size={18} className="text-[#F472B6]" />
            <h2 className="text-base font-extrabold">BADONASI</h2>
          </div>
          {hasAnyCampaign && (
            <Link
              href="/owner/campaign"
              className="text-xs font-semibold text-[#95d3ba] hover:text-white flex items-center gap-1"
            >
              Lihat Semua <ChevronRight size={12} />
            </Link>
          )}
        </div>

        {fetchingBadonasi ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={20} className="animate-spin text-white/60" />
          </div>
        ) : !hasAnyCampaign ? (
          // Empty state — never created campaign
          <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 text-center">
            <p className="text-sm font-semibold mb-1">Belum punya kampanye</p>
            <p className="text-xs text-white/80 mb-3 leading-relaxed">
              Mulai galang dana kemanusiaan untuk warga Maluku Utara.
            </p>
            <Link
              href="/owner/campaign/new/info"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#003526] hover:bg-gray-100 transition-colors"
            >
              <Plus size={14} />
              Ajukan Kampanye Pertama
            </Link>
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 text-center">
                <p className="text-lg font-extrabold text-white">{activeCampaigns}</p>
                <p className="text-[10px] text-white/80 mt-0.5">Aktif</p>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 text-center">
                <p className="text-lg font-extrabold text-white">{totalDonors}</p>
                <p className="text-[10px] text-white/80 mt-0.5">Donatur</p>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 text-center">
                <p className="text-sm font-extrabold text-white truncate">
                  {totalCollected >= 1_000_000
                    ? `${(totalCollected / 1_000_000).toFixed(1)}jt`
                    : totalCollected >= 1_000
                    ? `${Math.round(totalCollected / 1_000)}rb`
                    : totalCollected}
                </p>
                <p className="text-[10px] text-white/80 mt-0.5">Terkumpul</p>
              </div>
            </div>

            {/* Pending donations alert */}
            {pendingDonations > 0 && (
              <Link
                href="/owner/donations"
                className="flex items-center gap-2 rounded-xl bg-amber-500/20 backdrop-blur-sm border border-amber-300/30 px-3 py-2.5 mb-3 hover:bg-amber-500/30 transition-colors"
              >
                <AlertTriangle size={14} className="text-amber-200 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white">
                    {pendingDonations} donasi menunggu verifikasi
                  </p>
                  <p className="text-[10px] text-white/80">
                    Tap untuk verifikasi sekarang
                  </p>
                </div>
                <ChevronRight size={14} className="text-white/80 shrink-0" />
              </Link>
            )}

            {/* Quick action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/owner/campaign/new/info"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-xs font-bold text-[#003526] hover:bg-gray-100 transition-colors"
              >
                <Plus size={13} />
                Kampanye Baru
              </Link>
              <Link
                href="/owner/donations"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 py-2.5 text-xs font-bold text-white hover:bg-white/25 transition-colors"
              >
                <Inbox size={13} />
                Donasi Masuk
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Status breakdown — only if has campaigns */}
      {hasAnyCampaign && campaignStats && (
        <div className="mb-6 rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
            Status Kampanye
          </p>
          <div className="grid grid-cols-5 gap-2">
            <StatusPill label="Draft"    count={campaignStats.draft}          Icon={FileEdit}    color="#6B7280" />
            <StatusPill label="Review"   count={campaignStats.pending_review} Icon={Hourglass}    color="#B45309" />
            <StatusPill label="Aktif"    count={campaignStats.active}         Icon={Megaphone}    color="#BE185D" />
            <StatusPill label="Selesai"  count={campaignStats.completed}      Icon={CheckCircle2} color="#047857" />
            <StatusPill label="Ditolak"  count={campaignStats.rejected}       Icon={XCircle}      color="#DC2626" />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION 2: LISTING (Kos, Properti, dll)              */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="mb-3 flex items-center gap-2">
        <Home size={16} className="text-[#1B6B4A]" />
        <h2 className="text-base font-extrabold text-gray-900">Listing</h2>
        <span className="text-xs text-gray-400">Kos, Properti, Kendaraan, Jasa</span>
      </div>

      {/* Listing stats */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-gray-50 p-3 text-center">
          <p className="text-base font-extrabold text-gray-900">{listings.length}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Total Listing</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 text-center">
          <p className="text-base font-extrabold text-gray-900 flex items-center justify-center gap-1">
            <Eye size={12} />
            {totalViews}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">Views</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 text-center">
          <p className="text-base font-extrabold text-gray-900 flex items-center justify-center gap-1">
            <MessageCircle size={12} />
            {totalContacts}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">Kontak</p>
        </div>
      </div>

      {/* Tombol tambah listing per tipe */}
      <div className="mb-5">
        <p className="mb-2 text-xs font-medium text-gray-600">Daftarkan listing baru:</p>
        <div className="grid grid-cols-2 gap-2">
          {LISTING_TYPES.map(t => {
            const TIcon = t.Icon;
            return (
              <Link
                key={t.key}
                href={t.href}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-medium text-gray-700 transition-colors hover:border-[#1B6B4A] hover:text-[#1B6B4A]"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${t.color}15` }}
                >
                  <TIcon size={14} style={{ color: t.color }} />
                </div>
                <span>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Listing list */}
      <div>
        <p className="mb-3 text-xs font-medium text-gray-600">Listing kamu:</p>
        {fetchingListings ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={18} className="animate-spin text-gray-400" />
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-500">Belum ada listing. Tambah sekarang!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((item: any) => (
              <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {item.price ? formatRupiah(item.price) : 'Harga negosiasi'}
                      {item.price_period ? `/${item.price_period}` : ''}
                      {item.is_negotiable && <span className="ml-1 text-[#1B6B4A]">(nego)</span>}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    item.status === 'active' ? 'bg-green-100 text-green-700' :
                    item.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {item.status === 'active' ? 'Aktif' : item.status === 'draft' ? 'Draft' : item.status}
                  </span>
                </div>

                {item.listing_tier && (
                  <p className="mt-1 text-xs text-gray-400">
                    Tier: {item.listing_tier} · {item.listing_fee > 0 ? formatRupiah(item.listing_fee) + '/bln' : 'Gratis'}
                  </p>
                )}

                <div className="mt-2 flex gap-4 text-xs text-gray-400">
                  <span>👁 {item.view_count ?? 0} views</span>
                  <span>💬 {item.contact_count ?? 0} kontak</span>
                  {item.rating_avg > 0 && <span>⭐ {item.rating_avg}</span>}
                </div>

                {/* Tombol aksi */}
                <div className="mt-3 flex gap-2">
                  {item.type === 'kos' && (
                    <Link
                      href={`/owner/listing/${item.id}/rooms`}
                      className="flex-1 rounded-lg bg-[#1B6B4A] py-2 text-center text-xs font-medium text-white"
                    >
                      🛏️ Kelola Kamar
                    </Link>
                  )}
                  <Link
                    href={`/owner/listing/${item.id}/edit`}
                    className="flex-1 rounded-lg border border-gray-200 py-2 text-center text-xs font-medium text-gray-600"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Subcomponents
// ═══════════════════════════════════════════════════════════════

function StatusPill({
  label,
  count,
  Icon,
  color,
}: {
  label: string;
  count: number;
  Icon: any;
  color: string;
}) {
  return (
    <div className="text-center">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-1"
        style={{ background: `${color}15` }}
      >
        <Icon size={14} style={{ color }} />
      </div>
      <p className="text-base font-extrabold text-gray-900">{count}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
