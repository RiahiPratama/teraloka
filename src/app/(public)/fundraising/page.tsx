import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatRupiah } from '@/utils/format';
import { Heart, Stethoscope, CloudRainWind, Flower, Baby, UserRound, Home, HandHeart, HeartHandshake, ShieldCheck, Users, TrendingUp, Sparkles } from 'lucide-react';
import ZakatCTACard from './_components/ZakatCTACard';

export const metadata = {
  title: 'BADONASI — Galang Dana Kemanusiaan | TeraLoka',
  description: 'Galang dana kemanusiaan untuk warga Maluku Utara.',
};

export const dynamic = 'force-dynamic';

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

function VerifiedBadge({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500"
        title="Terverifikasi TeraLoka"
      >
        <ShieldCheck size={10} strokeWidth={3} className="text-white" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
      <ShieldCheck size={10} strokeWidth={2.5} />
      Terverifikasi
    </span>
  );
}

function relativeTime(date: string): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}h lalu`;
  return `${Math.floor(diff / 2592000)}bl lalu`;
}

function shortAmount(n: number): string {
  if (n >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return formatRupiah(n);
}

export default async function FundraisingPage({
  searchParams,
}: { searchParams: Promise<{ cat?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  let campaigns: any[] = [];
  let stats = { total_raised: 0, total_donors: 0, active_campaigns: 0 };
  let recentDonations: any[] = [];

  try {
    // Campaigns list
    let query = supabase
      .schema('funding')
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

    // Stats
    const allRes = await supabase
      .schema('funding')
      .from('campaigns')
      .select('collected_amount, donor_count, status')
      .in('status', ['active', 'completed']);

    if (allRes.data) {
      stats.total_raised = allRes.data.reduce((s: number, c: any) => s + (c.collected_amount || 0), 0);
      stats.total_donors = allRes.data.reduce((s: number, c: any) => s + (c.donor_count || 0), 0);
      stats.active_campaigns = allRes.data.filter((c: any) => c.status === 'active').length;
    }

    // Recent donations (donor wall) — RLS allows verified + non-anonymous
    const donationsRes = await supabase
      .schema('funding')
      .from('donations')
      .select('id, donor_name, amount, created_at, campaign_id')
      .eq('verification_status', 'verified')
      .eq('is_anonymous', false)
      .order('created_at', { ascending: false })
      .limit(8);

    if (donationsRes.data && donationsRes.data.length > 0) {
      // Enrich with campaign info
      const campaignIds = [...new Set(donationsRes.data.map((d: any) => d.campaign_id))];
      const campaignsMap: Record<string, { title: string; slug: string }> = {};

      const campRes = await supabase
        .schema('funding')
        .from('campaigns')
        .select('id, title, slug')
        .in('id', campaignIds);

      if (campRes.data) {
        campRes.data.forEach((c: any) => {
          campaignsMap[c.id] = { title: c.title, slug: c.slug };
        });
      }

      recentDonations = donationsRes.data.map((d: any) => ({
        ...d,
        campaign_title: campaignsMap[d.campaign_id]?.title ?? 'Campaign',
        campaign_slug: campaignsMap[d.campaign_id]?.slug ?? '',
      }));
    }
  } catch {}

  const activeCat = params.cat || 'all';
  const urgentCampaigns = campaigns.filter(c => c.is_urgent);
  const regularCampaigns = campaigns.filter(c => !c.is_urgent);
  const hasImpact = stats.total_raised > 0;

  return (
    <div className="min-h-screen bg-[#f9f9f8] pb-24">

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#003526] via-[#003526] to-[#1B6B4A] px-4 pt-8 pb-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#EC4899]/10 blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-[#F472B6]/10 blur-2xl"></div>

        <div className="relative mx-auto max-w-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <HeartHandshake size={24} className="text-[#F472B6]" strokeWidth={2.2} />
              <h1 className="text-2xl font-extrabold text-white tracking-tight">BADONASI</h1>
            </div>
            <Link href="/owner/campaign/new/info"
              className="flex items-center gap-1.5 bg-gradient-to-r from-[#EC4899] to-[#BE185D] hover:opacity-90 transition-opacity text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg">
              <span className="material-symbols-outlined text-sm">add</span>
              Galang Dana
            </Link>
          </div>

          {hasImpact ? (
            <div className="text-center py-4">
              <p className="text-[11px] text-[#95d3ba] uppercase tracking-widest font-semibold mb-2">
                Total Tersalurkan
              </p>
              <p className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none mb-2">
                {formatRupiah(stats.total_raised)}
              </p>
              <p className="text-sm text-[#F472B6] font-semibold">
                untuk saudara di Maluku Utara
              </p>

              <div className="mt-5 inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2.5">
                <div className="flex items-center gap-1.5">
                  <Users size={13} className="text-[#F472B6]" />
                  <span className="text-xs font-bold text-white">
                    {stats.total_donors.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs text-[#95d3ba]">donatur</span>
                </div>
                <span className="text-[#95d3ba]/40">•</span>
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={13} className="text-[#F472B6]" />
                  <span className="text-xs font-bold text-white">
                    {stats.active_campaigns}
                  </span>
                  <span className="text-xs text-[#95d3ba]">kampanye aktif</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <HeartHandshake size={48} className="text-[#F472B6] mx-auto mb-3" strokeWidth={1.8} />
              <h2 className="text-xl font-bold text-white mb-1">Mari Mulai Jadi Jembatan Kebaikan</h2>
              <p className="text-sm text-[#95d3ba] max-w-sm mx-auto leading-relaxed">
                Galang dana kemanusiaan untuk warga Maluku Utara yang butuh uluran tangan.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 -mt-10 relative z-10">

        {/* Trust badge */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 px-4 py-3 mb-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} className="text-emerald-600" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-800">100% transparan & terverifikasi</p>
            <p className="text-xs text-gray-400">Dana langsung ke penerima via transfer bank. Biaya operasional dari donasi sukarela.</p>
          </div>
        </div>

        {/* DONOR WALL — Real-time feed */}
        {recentDonations.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-pink-100 overflow-hidden mb-5">
            <div className="px-4 py-3 bg-gradient-to-r from-pink-50 to-white border-b border-pink-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EC4899] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EC4899]"></span>
                </div>
                <p className="text-xs font-bold text-[#BE185D] uppercase tracking-wider">Donasi Terbaru</p>
              </div>
              <span className="text-[10px] text-gray-400 font-medium">{recentDonations.length} donatur</span>
            </div>

            <div className="divide-y divide-gray-50 max-h-[280px] overflow-y-auto scrollbar-none">
              {recentDonations.map((d: any) => (
                <Link
                  key={d.id}
                  href={d.campaign_slug ? `/fundraising/${d.campaign_slug}` : '/fundraising'}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-pink-50/50 transition-colors"
                >
                  {/* Avatar with heart */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center shrink-0">
                    <Heart size={14} strokeWidth={2.5} className="text-[#EC4899]" fill="#EC4899" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 leading-snug truncate">
                      <span className="font-bold text-gray-900">{d.donor_name}</span>
                      <span className="text-gray-400"> donasi </span>
                      <span className="font-bold text-[#EC4899]">{shortAmount(d.amount)}</span>
                    </p>
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">
                      untuk <span className="text-gray-700">{d.campaign_title}</span>
                    </p>
                  </div>

                  {/* Time */}
                  <span className="text-[10px] text-gray-400 shrink-0 font-medium">
                    {relativeTime(d.created_at)}
                  </span>
                </Link>
              ))}
            </div>

            {recentDonations.length >= 8 && (
              <div className="px-4 py-2 bg-gray-50 text-center">
                <p className="text-[10px] text-gray-400">
                  <Sparkles size={10} className="inline mr-1" />
                  Makasih untuk semua donatur baik hati 💕
                </p>
              </div>
            )}
          </div>
        )}

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
          {CATEGORIES.map((c) => {
            const CatIcon = c.Icon;
            const isActive = activeCat === c.key;
            return (
              <Link key={c.key} href={c.key !== 'all' ? `/fundraising?cat=${c.key}` : '/fundraising'}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-white border border-transparent shadow-sm'
                    : 'bg-pink-50 border border-pink-100 text-[#BE185D] hover:bg-pink-100'
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
                      <div className="h-44 bg-gray-100 relative">
                        <img src={c.cover_image_url} alt={c.title} className="h-full w-full object-cover" />
                        {c.is_verified && (
                          <div className="absolute top-3 right-3">
                            <VerifiedBadge />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">🔴 URGENT</span>
                        <span className="text-xs text-gray-400 capitalize">{c.category?.replace('_', ' ')}</span>
                        {c.is_verified && !c.cover_image_url && <VerifiedBadge />}
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
                        <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 shrink-0 relative">
                          {c.cover_image_url
                            ? <img src={c.cover_image_url} alt={c.title} className="h-full w-full object-cover" />
                            : <div className="h-full w-full flex items-center justify-center bg-pink-50">
                                <Heart size={28} strokeWidth={1.8} style={{ color: '#EC4899' }} />
                              </div>
                          }
                          {c.is_verified && (
                            <div className="absolute top-1 right-1">
                              <VerifiedBadge compact />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 py-0.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <p className="text-xs text-gray-400 capitalize">{c.category?.replace('_', ' ') || 'Kemanusiaan'}</p>
                          </div>
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

        {/* ZAKAT CTA CARD — Secondary entry (after user browses campaigns) */}
        <div className="mt-8">
          <ZakatCTACard />
        </div>

        {/* CTA Galang Dana */}
        <div className="mt-4 bg-gradient-to-br from-[#003526] to-[#1B6B4A] rounded-2xl p-5 text-center relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-[#EC4899]/20 blur-2xl"></div>

          <div className="relative">
            <HeartHandshake size={28} className="text-[#F472B6] mx-auto mb-2" strokeWidth={2.2} />
            <p className="text-white font-bold mb-1">Kenal warga yang butuh uluran tangan?</p>
            <p className="text-[#95d3ba] text-sm mb-4 leading-relaxed">
              Ajukan campaign untuk keluarga, tetangga, atau siapa pun yang butuh bantuan. Banyak yang butuh uluran tangan di sekitar torang.
            </p>
            <Link href="/owner/campaign/new/info"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-md">
              <span className="material-symbols-outlined text-sm">volunteer_activism</span>
              Bantu Galang Dana
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
