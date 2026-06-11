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
  TrendingUp, AlertTriangle, FileText, BarChart2,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// L5-OWNER-VERTIKAL — hub per layanan. Kos: rumah = /owner/bakos (kelola lengkap).
// Properti/Kendaraan/Jasa = BANIAGA, belum siap → "Segera" (disabled, anti-404).
const VERTIKAL = [
  { type: 'kos',       label: 'Kos-kosan', color: '#1B6B4A', Icon: Home,      ready: true,  href: '/owner/bakos', soon: '' },
  { type: 'properti',  label: 'Properti',  color: '#0891B2', Icon: Building2,  ready: false, href: '#',            soon: 'Jual/sewa properti — segera hadir' },
  { type: 'kendaraan', label: 'Kendaraan', color: '#E8963A', Icon: Car,        ready: false, href: '#',            soon: 'Sewa kendaraan — segera hadir' },
  { type: 'jasa',      label: 'Jasa',      color: '#7C3AED', Icon: Wrench,     ready: false, href: '#',            soon: 'Layanan jasa — segera hadir' },
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
  // ⭐ Financial summary for accurate accrual display
  const [accrualTotal, setAccrualTotal] = useState<number>(0);

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

      // ⭐ Fetch total accrual (semua uang masuk termasuk fee + kode unik)
      fetch(`${API}/funding/my/financial-summary`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).catch(() => null),
    ])
      .then(([statsRes, pendingRes, financialRes]) => {
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

        // ⭐ Set accrual total (total_accrual = donasi + fee + kode unik + fee penggalang)
        if (financialRes?.success) {
          const f = financialRes.data;
          const accrual = f.total_accrual
            || (f.total_collected + f.total_operational_fee + f.total_kode_unik + f.total_fee_penggalang)
            || 0;
          setAccrualTotal(accrual);
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
  // - 1 aktif  → langsung ke /owner/funding/campaigns/{id}/reports
  // - >1 aktif → ke list kampanye filter active (user pilih)
  const reportHref =
    activeCampaigns === 0
      ? null
      : activeCampaigns === 1 && activeCampaignId
        ? `/owner/funding/campaigns/${activeCampaignId}/reports`
        : '/owner/funding/campaigns?tab=active';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f9f9f8] via-white to-[#f9f9f8]">
      <div className="mx-auto max-w-lg px-4 py-6 pb-20">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#003526] to-[#1B6B4A] flex items-center justify-center shadow-lg shadow-[#003526]/20">
              <span className="text-white text-lg font-extrabold">
                {(user.name ?? user.phone ?? '?').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Portal Mitra</p>
              <p className="text-base font-extrabold text-[#003526] truncate">
                Halo, {user.name ?? (user.phone ? '+' + user.phone : 'Mitra')} <span className="inline-block animate-pulse">👋</span>
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
                  href="/owner/funding/campaigns"
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
                  href="/owner/funding/campaigns/new/info"
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
                      {formatRupiah(accrualTotal || totalCollected)}
                    </p>
                    <p className="text-[10px] text-white/80 mt-0.5">Accrual</p>
                  </div>
                </div>

                {/* Pending donations alert */}
                {pendingDonations > 0 && (
                  <Link
                    href="/owner/funding/donations"
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
                    href="/owner/funding/campaigns/new/info"
                    className="flex flex-col items-center justify-center gap-1 rounded-xl bg-white py-3 px-2 text-[11px] font-bold text-[#003526] hover:bg-gray-100 transition-colors"
                  >
                    <Plus size={15} />
                    <span className="text-center leading-tight">Kampanye Baru</span>
                  </Link>

                  {/* 2. Seluruh Kampanye */}
                  <Link
                    href="/owner/funding/campaigns"
                    className="flex flex-col items-center justify-center gap-1 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 py-3 px-2 text-[11px] font-bold text-white hover:bg-white/25 transition-colors"
                  >
                    <Megaphone size={15} />
                    <span className="text-center leading-tight">Seluruh Kampanye</span>
                  </Link>

                  {/* 3. Laporan Donasi */}
                  <Link
                    href="/owner/funding/donations"
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

                {/* ⭐ Laporan Keuangan — full width button */}
                <Link
                  href="/owner/funding/financial"
                  className="mt-2 flex items-center justify-between w-full rounded-xl bg-[#EC4899]/20 backdrop-blur-sm border border-[#EC4899]/30 px-3 py-2.5 hover:bg-[#EC4899]/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BarChart2 size={14} className="text-[#F9A8D4] shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold text-white">Laporan Keuangan</p>
                      <p className="text-[9px] text-white/70">Accrual · Saldo · Fee · Pendapatan · CSV</p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-white/80 shrink-0" />
                </Link>
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
              <StatusPill label="Draft"   count={campaignStats.draft}          Icon={FileEdit}    color="#6B7280" href="/owner/funding/campaigns?tab=draft" />
              <StatusPill label="Review"  count={campaignStats.pending_review} Icon={Hourglass}   color="#B45309" href="/owner/funding/campaigns?tab=pending_review" />
              <StatusPill label="Aktif"   count={campaignStats.active}         Icon={Megaphone}   color="#BE185D" href="/owner/funding/campaigns?tab=active" />
              <StatusPill label="Selesai" count={campaignStats.completed}      Icon={CheckCircle2} color="#047857" href="/owner/funding/campaigns?tab=completed" />
              <StatusPill label="Ditolak" count={campaignStats.rejected}       Icon={XCircle}     color="#DC2626" href="/owner/funding/campaigns?tab=rejected" />
            </div>
          </div>
        )}

        {/* ═══════════════════════ LISTING per LAYANAN ════════════════════════ */}
        {/* L5-OWNER-VERTIKAL — hub ringkas. Detail tiap vertikal di rumahnya sendiri. */}
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

          {fetchingListings ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin text-gray-300" />
            </div>
          ) : (
            <div className="space-y-2.5">
              {VERTIKAL.map((v) => {
                const VIcon = v.Icon;
                const items = listings.filter((l: any) => l.type === v.type);
                const count = items.length;
                const views = items.reduce((s: number, l: any) => s + (l.view_count ?? 0), 0);
                const contacts = items.reduce((s: number, l: any) => s + (l.contact_count ?? 0), 0);
                const active = v.ready && count > 0;

                const Inner = (
                  <div
                    className={`group flex items-center gap-3.5 rounded-2xl border p-4 transition-all ${
                      v.ready
                        ? 'border-gray-100 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-[#1B6B4A]/30 cursor-pointer'
                        : 'border-gray-100 bg-gray-50/40 opacity-75'
                    }`}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                      style={{ background: `${v.color}15` }}
                    >
                      <VIcon size={22} style={{ color: v.color }} strokeWidth={2.2} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-extrabold text-gray-900">{v.label}</p>
                        {!v.ready && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-400">Segera</span>
                        )}
                      </div>
                      {v.ready ? (
                        count > 0 ? (
                          <div className="mt-1 flex items-center gap-3 text-[11px] text-gray-500">
                            <span className="font-bold text-gray-700">{count} listing</span>
                            <span className="flex items-center gap-1"><Eye size={11} className="text-[#0891B2]" />{views}</span>
                            <span className="flex items-center gap-1"><MessageCircle size={11} className="text-[#E8963A]" />{contacts}</span>
                          </div>
                        ) : (
                          <p className="mt-1 text-[11px] text-gray-400">Belum ada — daftarkan kos pertamamu</p>
                        )
                      ) : (
                        <p className="mt-1 text-[11px] text-gray-400">{v.soon}</p>
                      )}
                    </div>

                    {v.ready && (
                      <div className="flex items-center gap-1.5 shrink-0 rounded-xl bg-gradient-to-r from-[#1B6B4A] to-[#0891B2] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-shadow group-hover:shadow-md">
                        {count > 0 ? 'Kelola' : 'Mulai'} <ChevronRight size={14} />
                      </div>
                    )}
                  </div>
                );

                return v.ready
                  ? <Link key={v.type} href={v.href}>{Inner}</Link>
                  : <div key={v.type}>{Inner}</div>;
              })}
            </div>
          )}
        </div>



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
