import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatRupiah } from '@/utils/format';
import { Heart, Stethoscope, CloudRainWind, Flower, Baby, UserRound, Home, HandHeart, HeartHandshake } from 'lucide-react';

export const metadata = {
  title: 'BADONASI — Galang Dana Kemanusiaan | TeraLoka',
  description: 'Galang dana kemanusiaan untuk warga Maluku Utara.',
};

// Kategori dengan Lucide icon + warna accent per kategori.
// Warna disync dengan form /owner/campaign/new biar konsisten
// di seluruh touchpoint BADONASI.
const CATEGORIES = [
  { key: 'all',            label: 'Semua',          Icon: Heart,         color: '#EC4899' },
  { key: 'kesehatan',      label: 'Kesehatan',      Icon: Stethoscope,   color: '#D85A30' },
  { key: 'bencana',        label: 'Bencana',        Icon: CloudRainWind, color: '#378ADD' },
  { key: 'duka',           label: 'Duka',           Icon: Flower,        color: '#888780' },
  { key: 'anak_yatim',     label: 'Anak Yatim',     Icon: Baby,          color: '#E8963A' },
  { key: 'lansia',         label: 'Lansia',         Icon: UserRound,     color: '#BA7517' },
  { key: 'hunian_darurat', label: 'Hunian Darurat', Icon: Home,          color: '#0891B2' },
];

function ProgressBar({ collected, target }: { collected: number; target: number }) {
  const pct = target > 0 ? Math.min((collected / target) * 100, 100) : 0;
  return (
    <div className="mt-3">
      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: pct >= 100
              ? 'linear-gradient(90deg, #10B981, #059669)'
              : 'linear-gradient(90deg, #EC4899, #BE185D)',
          }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-xs font-bold text-[#003526]">{formatRupiah(collected)}</span>
        <span className="text-xs font-bold text-[#EC4899]">{Math.round(pct)}%</span>
      </div>
    </div>
  );
}

function DaysLeft({ deadline }: { deadline?: string }) {
  if (!deadline) return null;
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (days <= 0) return <span className="text-xs text-gray-400">Selesai</span>;
  return (
    <span className={`text-xs font-medium ${days <= 7 ? 'text-red-500' : 'text-gray-400'}`}>
      {days} hari lagi
    </span>
  );
}

export default async function FundraisingPage({
  searchParams,
}: { searchParams: Promise<{ cat?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  let campaigns: any[] = [];
  let stats = { total_raised: 0, total_donors: 0, active_campaigns: 0 };

  try {
    let query = supabase
      .from('campaigns')
      .select('*')
      .in('status', ['active', 'completed'])
      .order('is_urgent', { ascending: false })
      .order('created_at', { ascending: false });

    if (params.cat && params.cat !== 'all') {
      query = query.eq('category', params.cat);
    }

    const { data } = await query;
    campaigns = data ?? [];

    // Hitung stats
    const allRes = await supabase
      .from('campaigns')
      .select('collected_amount, donor_count, status')
      .in('status', ['active', 'completed']);

    if (allRes.data) {
      stats.total_raised = allRes.data.reduce((s: number, c: any) => s + (c.collected_amount || 0), 0);
      stats.total_donors = allRes.data.reduce((s: number, c: any) => s + (c.donor_count || 0), 0);
      stats.active_campaigns = allRes.data.filter((c: any) => c.status === 'active').length;
    }
  } catch {}

  const activeCat = params.cat || 'all';
  const urgentCampaigns = campaigns.filter(c => c.is_urgent);
  const regularCampaigns = campaigns.filter(c => !c.is_urgent);

  return (
    <div className="min-h-screen bg-[#f9f9f8] pb-24">

      {/* Hero Section */}
      <div className="bg-[#003526] px-4 pt-8 pb-16">
        <div className="mx-auto max-w-lg">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <HeartHandshake size={24} className="text-[#F472B6]" strokeWidth={2.2} />
                <h1 className="text-2xl font-extrabold text-white tracking-tight">BADONASI</h1>
              </div>
              <p className="text-sm text-[#95d3ba]">Galang dana kemanusiaan Maluku Utara</p>
            </div>
            <Link href="/owner/campaign/new/info"
              className="flex items-center gap-1.5 bg-gradient-to-r from-[#EC4899] to-[#BE185D] hover:opacity-90 transition-opacity text-white text-xs font-bold px-3 py-2 rounded-xl shadow-md">
              <span className="material-symbols-outlined text-sm">add</span>
              Galang Dana
            </Link>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Terkumpul', value: formatRupiah(stats.total_raised), icon: 'volunteer_activism' },
              { label: 'Total Donatur', value: stats.total_donors.toLocaleString('id-ID'), icon: 'people' },
              { label: 'Kampanye Aktif', value: String(stats.active_campaigns), icon: 'campaign' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
                <span className="material-symbols-outlined text-[#F472B6] text-lg">{s.icon}</span>
                <p className="text-white font-bold text-base mt-1">{s.value}</p>
                <p className="text-[#95d3ba]/70 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 -mt-6">

        {/* Trust badge */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 mb-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-emerald-600 text-lg">verified</span>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-800">100% transparan</p>
            <p className="text-xs text-gray-400">Dana langsung ke penerima via transfer bank. Biaya operasional dari donasi sukarela.</p>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
          {CATEGORIES.map((c) => {
            const CatIcon = c.Icon;
            const isActive = activeCat === c.key;
            return (
              <Link key={c.key} href={c.key !== 'all' ? `/fundraising?cat=${c.key}` : '/fundraising'}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#003526] text-white border border-[#003526]'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-pink-200'
                }`}>
                <CatIcon
                  size={14}
                  strokeWidth={2.2}
                  style={{ color: isActive ? '#FFFFFF' : c.color }}
                />
                <span>{c.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Urgent campaigns */}
        {urgentCampaigns.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                BUTUH BANTUAN SEGERA
              </div>
            </div>
            <div className="space-y-3">
              {urgentCampaigns.map((c: any) => {
                const pct = c.target_amount > 0 ? Math.min((c.collected_amount / c.target_amount) * 100, 100) : 0;
                return (
                  <Link key={c.id} href={`/fundraising/${c.slug}`}
                    className="block bg-white rounded-2xl border border-pink-100 overflow-hidden hover:shadow-md hover:border-pink-200 transition-all">
                    {c.cover_image_url && (
                      <div className="h-44 bg-gray-100">
                        <img src={c.cover_image_url} alt={c.title} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">🔴 URGENT</span>
                        <span className="text-xs text-gray-400 capitalize">{c.category?.replace('_', ' ')}</span>
                      </div>
                      <p className="font-bold text-gray-900 leading-snug">{c.title}</p>
                      {c.beneficiary_name && (
                        <p className="text-xs text-gray-500 mt-1">untuk {c.beneficiary_name}</p>
                      )}
                      <ProgressBar collected={c.collected_amount} target={c.target_amount} />
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-gray-400">{c.donor_count?.toLocaleString('id-ID') || 0} donatur</span>
                        <div className="flex items-center gap-1">
                          <DaysLeft deadline={c.deadline} />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Regular campaigns */}
        {campaigns.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-100 p-10 text-center">
            <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-pink-50 flex items-center justify-center">
              <HandHeart size={28} strokeWidth={2} style={{ color: '#EC4899' }} />
            </div>
            <p className="font-semibold text-gray-700">Belum ada kampanye aktif</p>
            <p className="text-sm text-gray-400 mt-1">Jadilah yang pertama menggalang dana</p>
            <Link href="/owner/campaign/new/info"
              className="mt-4 inline-block bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-md">
              Mulai Galang Dana
            </Link>
          </div>
        ) : (
          <>
            {regularCampaigns.length > 0 && (
              <div>
                {urgentCampaigns.length > 0 && (
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Kampanye Lainnya</p>
                )}
                <div className="space-y-3">
                  {regularCampaigns.map((c: any) => {
                    const pct = c.target_amount > 0 ? Math.min((c.collected_amount / c.target_amount) * 100, 100) : 0;
                    return (
                      <Link key={c.id} href={`/fundraising/${c.slug}`}
                        className="flex gap-3 bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-pink-100 transition-all p-3">
                        {/* Thumbnail */}
                        <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                          {c.cover_image_url
                            ? <img src={c.cover_image_url} alt={c.title} className="h-full w-full object-cover" />
                            : <div className="h-full w-full flex items-center justify-center bg-pink-50">
                                <Heart size={28} strokeWidth={1.8} style={{ color: '#EC4899' }} />
                              </div>
                          }
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0 py-0.5">
                          <p className="text-xs text-gray-400 capitalize mb-1">{c.category?.replace('_', ' ') || 'Kemanusiaan'}</p>
                          <p className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">{c.title}</p>
                          {c.beneficiary_name && (
                            <p className="text-xs text-gray-400 mt-0.5">untuk {c.beneficiary_name}</p>
                          )}
                          <div className="mt-2 h-1 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-[#EC4899] to-[#BE185D]"
                              style={{ width: `${pct}%` }} />
                          </div>
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-xs font-bold text-[#003526]">{formatRupiah(c.collected_amount)}</span>
                            <span className="text-xs text-gray-400">{c.donor_count || 0} donatur</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* CTA Galang Dana */}
        <div className="mt-8 bg-gradient-to-br from-[#003526] to-[#1B6B4A] rounded-2xl p-5 text-center relative overflow-hidden">
          {/* Pink accent decoration */}
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-[#EC4899]/20 blur-2xl"></div>

          <div className="relative">
            <HeartHandshake size={28} className="text-[#F472B6] mx-auto mb-2" strokeWidth={2.2} />
            <p className="text-white font-bold mb-1">Punya kebutuhan mendesak?</p>
            <p className="text-[#95d3ba] text-sm mb-4">Galang dana sekarang dan dapatkan dukungan dari warga Maluku Utara</p>
            <Link href="/owner/campaign/new/info"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-md">
              <span className="material-symbols-outlined text-sm">volunteer_activism</span>
              Mulai Galang Dana
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
