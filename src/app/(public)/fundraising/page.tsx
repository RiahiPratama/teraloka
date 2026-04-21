import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatRupiah } from '@/utils/format';
import {
  Heart, Stethoscope, CloudRainWind, Flower, Baby, UserRound, Home,
  HeartHandshake, ShieldCheck, Users, TrendingUp,
} from 'lucide-react';

import DonorWall from './_components/DonorWall';
import UrgentCampaignsSlide from './_components/UrgentCampaignsSlide';
import CampaignList from './_components/CampaignList';
import WhyTeralokaCard from './_components/WhyTeralokaCard';
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

export default async function FundraisingPage({
  searchParams,
}: { searchParams: Promise<{ cat?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();

  let campaigns: any[] = [];
  let stats = { total_raised: 0, total_donors: 0, active_campaigns: 0 };
  let recentDonations: any[] = [];

  try {
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

    const donationsRes = await supabase
      .schema('funding')
      .from('donations')
      .select('id, donor_name, amount, message, created_at, campaign_id')
      .eq('verification_status', 'verified')
      .eq('is_anonymous', false)
      .order('created_at', { ascending: false })
      .limit(10);

    if (donationsRes.data && donationsRes.data.length > 0) {
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

      {/* HERO */}
      <div className="bg-gradient-to-br from-[#003526] via-[#003526] to-[#1B6B4A] px-4 pt-8 pb-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#EC4899]/10 blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-[#F472B6]/10 blur-2xl"></div>

        <div className="relative mx-auto max-w-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <HeartHandshake size={24} className="text-[#F472B6]" strokeWidth={2.2} />
              <h1 className="text-2xl font-extrabold text-white tracking-tight">BADONASI</h1>
            </div>
            <Link
              href="/owner/campaign/new/info"
              className="flex items-center gap-1.5 bg-gradient-to-r from-[#EC4899] to-[#BE185D] hover:opacity-90 transition-opacity text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg"
            >
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

      {/* MAIN CONTENT */}
      <div className="mx-auto max-w-lg px-4 -mt-10 relative z-10 space-y-5">

        {/* Trust Badge */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} className="text-emerald-600" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-800">100% transparan & terverifikasi</p>
            <p className="text-xs text-gray-400">Dana langsung ke penerima via transfer bank.</p>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
          {CATEGORIES.map((c) => {
            const CatIcon = c.Icon;
            const isActive = activeCat === c.key;
            return (
              <Link
                key={c.key}
                href={c.key !== 'all' ? `/fundraising?cat=${c.key}` : '/fundraising'}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-white border border-transparent shadow-sm'
                    : 'bg-pink-50 border border-pink-100 text-[#BE185D] hover:bg-pink-100'
                }`}
              >
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

        {/* Urgent Slide */}
        {urgentCampaigns.length > 0 && (
          <UrgentCampaignsSlide campaigns={urgentCampaigns} />
        )}

        {/* Kampanye Lainnya — Paginated w/ hybrid escape valve */}
        {campaigns.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-100 p-10 text-center">
            <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-pink-50 flex items-center justify-center">
              <Heart size={28} strokeWidth={2} className="text-[#EC4899]" />
            </div>
            <p className="font-semibold text-gray-700">Belum ada kampanye aktif</p>
            <p className="text-sm text-gray-400 mt-1">Jadilah yang pertama menggalang dana</p>
            <Link
              href="/owner/campaign/new/info"
              className="mt-4 inline-block bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-md"
            >
              Mulai Galang Dana
            </Link>
          </div>
        ) : regularCampaigns.length > 0 && (
          <CampaignList
            campaigns={regularCampaigns}
            hasUrgent={urgentCampaigns.length > 0}
            activeCategory={activeCat}
          />
        )}

        {/* Donor Wall */}
        {recentDonations.length > 0 && (
          <DonorWall donations={recentDonations} />
        )}

        {/* Zakat CTA */}
        <ZakatCTACard />

        {/* Why TeraLoka Breaker */}
        <WhyTeralokaCard />

        {/* Creator CTA */}
        <div className="bg-gradient-to-br from-[#003526] to-[#1B6B4A] rounded-2xl p-5 text-center relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-[#EC4899]/20 blur-2xl"></div>

          <div className="relative">
            <HeartHandshake size={28} className="text-[#F472B6] mx-auto mb-2" strokeWidth={2.2} />
            <p className="text-white font-bold mb-1">Kenal warga yang butuh uluran tangan?</p>
            <p className="text-[#95d3ba] text-sm mb-4 leading-relaxed">
              Ajukan campaign untuk keluarga, tetangga, atau siapa pun yang butuh bantuan. Banyak yang butuh uluran tangan di sekitar torang.
            </p>
            <Link
              href="/owner/campaign/new/info"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-md"
            >
              <span className="material-symbols-outlined text-sm">volunteer_activism</span>
              Bantu Galang Dana
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
