'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { formatRupiah } from '@/utils/format';
import {
  HeartHandshake, Plus, Inbox, ChevronRight, Loader2,
  Megaphone, FileEdit, Hourglass, CheckCircle2, XCircle,
  Home, Building2, Car, Wrench, Eye, MessageCircle,
  TrendingUp, AlertTriangle, FileText,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

const LISTING_TYPES = [
  { key: 'kos',       label: 'Kos-kosan', Icon: Home,       href: '/owner/listing/new/kos',           color: '#0891B2' },
  { key: 'properti',  label: 'Properti',  Icon: Building2,  href: '/owner/listing/new?type=properti',  color: '#1B6B4A' },
  { key: 'kendaraan', label: 'Kendaraan', Icon: Car,        href: '/owner/listing/new?type=kendaraan', color: '#E8963A' },
  { key: 'jasa',      label: 'Jasa',      Icon: Wrench,     href: '/owner/listing/new?type=jasa',      color: '#888780' },
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
  const router = useRouter();

  // Listing state
  const [listings, setListings] = useState<any[]>([]);
  const [fetchingListings, setFetchingListings] = useState(false);

  // BADONASI state
  const [campaignStats, setCampaignStats] = useState<CampaignStats | null>(null);
  const [pendingDonations, setPendingDonations] = useState<number>(0);
  const [fetchingBadonasi, setFetchingBadonasi] = useState(false);

  // ⭐ Opsi C: active campaign ID (kalau hanya 1 aktif)
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

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
      fetch(`${API}/funding/my/campaigns/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).catch(() => null),

      fetch(`${API}/funding/my/donations?status=pending&limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).catch(() => null),
    ])
      .then(([statsRes, pendingRes]) => {
        if (statsRes?.success) {
          const stats: CampaignStats = statsRes.data;
          setCampaignStats(stats);

          // ⭐ Opsi C: kalau tepat 1 kampanye aktif, fetch ID-nya
          if (stats.active === 1) {
            fetch(`${API}/funding/my/campaigns?status=active&limit=1`, {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then(r => r.json())
              .then(d => {
                const id = d?.data?.[0]?.id;
                if (id) setActiveCampaignId(id);
              })
              .catch(() => {});
          }
        }

        if (pendingRes?.success) {
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

  const totalViews    = listings.reduce((sum, l) => sum + (l.view_count ?? 0), 0);
  const totalContacts = listings.reduce((sum, l) => sum + (l.contact_count ?? 0), 0);

  const activeCampaigns = campaignStats?.active ?? 0;
  const totalCampaigns  = campaignStats?.total ?? 0;
  const totalCollected  = campaignStats?.total_collected ?? 0;
  const totalDonors     = campaignStats?.total_donors ?? 0;
  const hasAnyCampaign  = totalCampaigns > 0;

  // ⭐ Opsi C: smart href untuk "Input Laporan"
  // - 0 aktif  → null (tombol disabled)
  // - 1 aktif  → langsung ke /owner/campaign/{id}/reports
  // - >1 aktif → ke list kampanye filter active (user pilih)
  const reportHref =
    activeCampaigns === 0
      ? null
      : activeCampaigns === 1 && activeCampaignId
        ? `/owner/campaign/${activeCampaignId}/reports`
        : '/owner/campaign?tab=active';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f9f9f8] via-white to-[#f9f9f8]">
      <div className="mx-auto max-w-lg px-4 py-6 pb-20">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#003526] to-[#1B6B4A] flex items-center justify-center shadow-lg shadow-[#003526]/20">
              <span className="text-white text-lg font-extrabold">
                {(user.name ?? user.phone).charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Portal Mitra</p>
              <p className="text-base font-extrabold text-[#003526] truncate">
                Halo, {user.name ?? '+' + user.phone} <span className="inline-block animate-pulse">👋</span>
              </p>
            </div>
          </div>
        </div>

        {/* ═══════════════════════ BADONASI ═══════════════════════ */}
        <div className="mb-6 rounded-3xl bg-gradient-to-br from-[#003526] via-[#003526] to-[#1B6B4A] p-5 text-white shadow-xl shadow-[#003526]/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#EC4899] rounded-full opacity-10 blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#F472B6] rounded-full opacity-10 blur-3xl translate-y-1/3 -translate-x-1/4" />

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#EC4899]/20 flex items-center justify-center">
                  <HeartHandshake size={16} className="text-[#F472B6]" strokeWidth={2.4} />
                </div>
                <h2 className="text-base font-extrabold tracking-tight">BADONASI</h2>
              </div>
              {hasAnyCampaign && (
                <Link
                  href="/owner/campaign"
                  className="text-xs font-bold text-[#F472B6] hover:text-white flex items-center gap-1 transition-colors"
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
                    <p className="text-[11px] font-extrabold text-white truncate leading-tight">
                      {formatRupiah(totalCollected)}
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
                      <p className="text-[10px] text-white/80">Tap untuk verifikasi sekarang</p>
                    </div>
                    <ChevronRight size={14} className="text-white/80 shrink-0" />
                  </Link>
                )}

                {/* ⭐ Quick action buttons — 2×2 grid (4 tombol) */}
                <div className="grid grid-cols-2 gap-2">
                  {/* 1. Kampanye Baru */}
                  <Link
                    href="/owner/campaign/new/info"
                    className="flex flex-col items-center justify-center gap-1 rounded-xl bg-white py-3 px-2 text-[11px] font-bold text-[#003526] hover:bg-gray-100 transition-colors"
                  >
                    <Plus size={15} />
                    <span className="text-center leading-tight">Kampanye Baru</span>
                  </Link>

                  {/* 2. Seluruh Kampanye */}
                  <Link
                    href="/owner/campaign"
                    className="flex flex-col items-center justify-center gap-1 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 py-3 px-2 text-[11px] font-bold text-white hover:bg-white/25 transition-colors"
                  >
                    <Megaphone size={15} />
                    <span className="text-center leading-tight">Seluruh Kampanye</span>
                  </Link>

                  {/* 3. Laporan Donasi */}
                  <Link
                    href="/owner/donations"
                    className="relative flex flex-col items-center justify-center gap-1 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 py-3 px-2 text-[11px] font-bold text-white hover:bg-white/25 transition-colors"
                  >
                    {pendingDonations > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#EC4899] text-white text-[9px] font-extrabold flex items-center justify-center shadow-md shadow-pink-500/40">
                        {pendingDonations > 99 ? '99+' : pendingDonations}
                      </span>
                    )}
                    <Inbox size={15} />
                    <span className="text-center leading-tight">Laporan Donasi</span>
                  </Link>

                  {/* 4. ⭐ Input Laporan — Opsi C smart redirect */}
                  {reportHref ? (
                    <Link
                      href={reportHref}
                      className="flex flex-col items-center justify-center gap-1 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 py-3 px-2 text-[11px] font-bold text-white hover:bg-white/25 transition-colors"
                    >
                      <FileText size={15} />
                      <span className="text-center leading-tight">
                        {activeCampaigns === 1 ? 'Input Laporan' : 'Input Laporan'}
                      </span>
                    </Link>
                  ) : (
                    <div
                      className="flex flex-col items-center justify-center gap-1 rounded-xl bg-white/5 border border-white/10 py-3 px-2 text-[11px] font-bold text-white/30 cursor-not-allowed"
                      title="Tidak ada kampanye aktif"
                    >
                      <FileText size={15} />
                      <span className="text-center leading-tight">Input Laporan</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status breakdown */}
        {hasAnyCampaign && campaignStats && (
          <div className="mb-6 rounded-3xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#003526] to-[#1B6B4A] flex items-center justify-center">
                <TrendingUp size={13} className="text-white" strokeWidth={2.5} />
              </div>
              <p className="text-xs font-extrabold text-gray-700 uppercase tracking-widest">
                Status Kampanye
              </p>
            </div>
            <div className="grid grid-cols-5 gap-2">
              <StatusPill label="Draft"   count={campaignStats.draft}          Icon={FileEdit}    color="#6B7280" href="/owner/campaign?tab=draft" />
              <StatusPill label="Review"  count={campaignStats.pending_review} Icon={Hourglass}   color="#B45309" href="/owner/campaign?tab=pending_review" />
              <StatusPill label="Aktif"   count={campaignStats.active}         Icon={Megaphone}   color="#BE185D" href="/owner/campaign?tab=active" />
              <StatusPill label="Selesai" count={campaignStats.completed}      Icon={CheckCircle2} color="#047857" href="/owner/campaign?tab=completed" />
              <StatusPill label="Ditolak" count={campaignStats.rejected}       Icon={XCircle}     color="#DC2626" href="/owner/campaign?tab=rejected" />
            </div>
          </div>
        )}

        {/* ═══════════════════════ LISTING ════════════════════════ */}
        <div className="mb-6 rounded-3xl bg-white border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1B6B4A] to-[#0891B2] flex items-center justify-center shadow-md shadow-[#1B6B4A]/20">
                <Home size={14} className="text-white" strokeWidth={2.4} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-gray-900 leading-tight">Listing</h2>
                <p className="text-[10px] text-gray-400 leading-tight">Kos, Properti, Kendaraan, Jasa</p>
              </div>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 p-3 text-center hover:shadow-md transition-shadow">
              <p className="text-lg font-extrabold text-gray-900">{listings.length}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Total Listing</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 p-3 text-center hover:shadow-md transition-shadow">
              <p className="text-lg font-extrabold text-gray-900 flex items-center justify-center gap-1">
                <Eye size={13} className="text-[#0891B2]" /> {totalViews}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">Views</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 p-3 text-center hover:shadow-md transition-shadow">
              <p className="text-lg font-extrabold text-gray-900 flex items-center justify-center gap-1">
                <MessageCircle size={13} className="text-[#E8963A]" /> {totalContacts}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">Kontak</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Daftarkan listing baru</p>
            <div className="grid grid-cols-2 gap-2">
              {LISTING_TYPES.map(t => {
                const TIcon = t.Icon;
                return (
                  <Link
                    key={t.key}
                    href={t.href}
                    className="group flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-3 py-3 text-xs font-bold text-gray-700 transition-all hover:border-[#1B6B4A] hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                      style={{ background: `${t.color}15` }}
                    >
                      <TIcon size={16} style={{ color: t.color }} strokeWidth={2.4} />
                    </div>
                    <span className="group-hover:text-[#1B6B4A] transition-colors">{t.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Listing list */}
        {(fetchingListings || listings.length > 0) && (
          <div>
            <p className="mb-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2">Listing Saya</p>
            {fetchingListings ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={20} className="animate-spin text-gray-300" />
              </div>
            ) : (
              <div className="space-y-3">
                {listings.map((item: any) => (
                  <div key={item.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{item.title}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {item.price ? formatRupiah(item.price) : 'Harga negosiasi'}
                          {item.price_period ? `/${item.price_period}` : ''}
                          {item.is_negotiable && <span className="ml-1 text-[#1B6B4A] font-semibold">(nego)</span>}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        item.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        item.status === 'draft'  ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {item.status === 'active' ? 'Aktif' : item.status === 'draft' ? 'Draft' : item.status}
                      </span>
                    </div>

                    {item.listing_tier && (
                      <p className="mt-1.5 text-[11px] text-gray-400">
                        Tier: <span className="font-semibold text-gray-600">{item.listing_tier}</span>{' '}
                        · {item.listing_fee > 0 ? formatRupiah(item.listing_fee) + '/bln' : 'Gratis'}
                      </p>
                    )}

                    <div className="mt-2 flex gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Eye size={11} />{item.view_count ?? 0}</span>
                      <span className="flex items-center gap-1"><MessageCircle size={11} />{item.contact_count ?? 0}</span>
                      {item.rating_avg > 0 && <span>⭐ {item.rating_avg}</span>}
                    </div>

                    <div className="mt-3 flex gap-2">
                      {item.type === 'kos' && (
                        <Link
                          href={`/owner/listing/${item.id}/rooms`}
                          className="flex-1 rounded-xl bg-gradient-to-r from-[#1B6B4A] to-[#0891B2] py-2 text-center text-xs font-bold text-white shadow-sm hover:shadow-md transition-shadow"
                        >
                          🛏️ Kelola Kamar
                        </Link>
                      )}
                      <Link
                        href={`/owner/listing/${item.id}/edit`}
                        className="flex-1 rounded-xl border border-gray-200 bg-white py-2 text-center text-xs font-bold text-gray-600 hover:border-[#1B6B4A] hover:text-[#1B6B4A] transition-colors"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Subcomponents
// ═══════════════════════════════════════════════════════════════

function StatusPill({ label, count, Icon, color, href }: {
  label: string; count: number; Icon: any; color: string; href: string;
}) {
  return (
    <Link
      href={href}
      className="text-center group flex flex-col items-center"
    >
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-1.5 transition-all group-hover:scale-110 group-hover:shadow-md"
        style={{ background: `${color}15` }}
      >
        <Icon size={15} style={{ color }} strokeWidth={2.4} />
      </div>
      <p className="text-base font-extrabold text-gray-900 group-hover:underline">{count}</p>
      <p className="text-[10px] text-gray-500 mt-0.5 font-semibold">{label}</p>
    </Link>
  );
}
