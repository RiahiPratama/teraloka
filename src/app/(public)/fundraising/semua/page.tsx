import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  Heart, Stethoscope, CloudRainWind, Flower, Baby, UserRound, Home,
  ArrowLeft, Search, HeartHandshake,
} from 'lucide-react';
import CampaignCard from '../_components/CampaignCard';

export const metadata = {
  title: 'Semua Kampanye BADONASI | TeraLoka',
  description: 'Jelajahi semua kampanye penggalangan dana di TeraLoka BADONASI.',
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

type SearchParams = {
  cat?: string;
  sort?: 'newest' | 'progress' | 'deadline';
};

export default async function SemuaKampanyePage({
  searchParams,
}: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const supabase = await createClient();

  const activeCat = params.cat || 'all';
  const activeSort = params.sort || 'newest';

  let campaigns: any[] = [];

  try {
    let query = supabase
      .schema('funding')
      .from('campaigns')
      .select('*')
      .in('status', ['active', 'completed']);

    if (activeCat !== 'all') {
      query = query.eq('category', activeCat);
    }

    // Apply sort
    if (activeSort === 'progress') {
      // Sort by progress (collected/target ratio DESC) — requires client-side sort
      query = query.order('collected_amount', { ascending: false });
    } else if (activeSort === 'deadline') {
      query = query.order('deadline', { ascending: true, nullsFirst: false });
    } else {
      // newest (default)
      query = query
        .order('is_urgent', { ascending: false })
        .order('created_at', { ascending: false });
    }

    const { data } = await query;
    campaigns = data ?? [];

    // Client-side sort for progress (since progress is a computed ratio)
    if (activeSort === 'progress') {
      campaigns = [...campaigns].sort((a, b) => {
        const progressA = a.target_amount > 0 ? a.collected_amount / a.target_amount : 0;
        const progressB = b.target_amount > 0 ? b.collected_amount / b.target_amount : 0;
        return progressB - progressA;
      });
    }
  } catch {}

  const urgentCampaigns = campaigns.filter(c => c.is_urgent);
  const regularCampaigns = campaigns.filter(c => !c.is_urgent);

  return (
    <div className="min-h-screen bg-[#f9f9f8] pb-16">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="mx-auto max-w-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/fundraising"
              className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={18} className="text-gray-700" />
            </Link>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-[#BE185D] uppercase tracking-widest">BADONASI</p>
              <h1 className="text-base font-extrabold text-gray-900">Semua Kampanye</h1>
            </div>
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
              {campaigns.length}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 pt-4 space-y-4">

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
          {CATEGORIES.map((c) => {
            const CatIcon = c.Icon;
            const isActive = activeCat === c.key;
            const href = c.key !== 'all'
              ? `/fundraising/semua?cat=${c.key}${activeSort !== 'newest' ? `&sort=${activeSort}` : ''}`
              : `/fundraising/semua${activeSort !== 'newest' ? `?sort=${activeSort}` : ''}`;
            return (
              <Link
                key={c.key}
                href={href}
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

        {/* Sort Pills */}
        <div className="flex gap-2 text-[11px]">
          <p className="text-gray-500 py-1.5 font-medium">Urutkan:</p>
          {[
            { key: 'newest', label: 'Terbaru' },
            { key: 'progress', label: 'Hampir Tercapai' },
            { key: 'deadline', label: 'Deadline Terdekat' },
          ].map(s => {
            const isActive = activeSort === s.key;
            const href = activeCat !== 'all'
              ? `/fundraising/semua?cat=${activeCat}${s.key !== 'newest' ? `&sort=${s.key}` : ''}`
              : `/fundraising/semua${s.key !== 'newest' ? `?sort=${s.key}` : ''}`;
            return (
              <Link
                key={s.key}
                href={href}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </div>

        {/* Empty State */}
        {campaigns.length === 0 && (
          <div className="rounded-2xl bg-white border border-gray-100 p-10 text-center">
            <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-pink-50 flex items-center justify-center">
              <Heart size={28} strokeWidth={2} className="text-[#EC4899]" />
            </div>
            <p className="font-semibold text-gray-700">
              {activeCat !== 'all'
                ? `Belum ada kampanye di kategori ini`
                : 'Belum ada kampanye aktif'
              }
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {activeCat !== 'all'
                ? 'Coba kategori lain atau lihat semua'
                : 'Jadilah yang pertama menggalang dana'
              }
            </p>
            <Link
              href={activeCat !== 'all' ? '/fundraising/semua' : '/owner/campaign/new/info'}
              className="mt-4 inline-block bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-md"
            >
              {activeCat !== 'all' ? 'Lihat Semua Kategori' : 'Mulai Galang Dana'}
            </Link>
          </div>
        )}

        {/* Urgent Section */}
        {urgentCampaigns.length > 0 && activeSort === 'newest' && (
          <div>
            <div className="flex items-center gap-1.5 bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full w-fit mb-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              BUTUH BANTUAN SEGERA · {urgentCampaigns.length}
            </div>
            <div className="space-y-3">
              {urgentCampaigns.map((c: any) => (
                <CampaignCard key={c.id} campaign={c} variant="row" />
              ))}
            </div>
          </div>
        )}

        {/* All Other Campaigns */}
        {regularCampaigns.length > 0 && (
          <div>
            {urgentCampaigns.length > 0 && activeSort === 'newest' && (
              <div className="flex items-center justify-between mb-3 mt-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Kampanye Lainnya
                </p>
                <span className="text-[10px] text-gray-400 font-medium">
                  {regularCampaigns.length} kampanye
                </span>
              </div>
            )}
            <div className="space-y-3">
              {activeSort !== 'newest'
                ? campaigns.map((c: any) => <CampaignCard key={c.id} campaign={c} variant="row" />)
                : regularCampaigns.map((c: any) => <CampaignCard key={c.id} campaign={c} variant="row" />)
              }
            </div>
          </div>
        )}

        {/* Back to Home CTA */}
        {campaigns.length > 0 && (
          <Link
            href="/fundraising"
            className="mt-6 flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-white border border-gray-200 hover:border-pink-200 hover:bg-pink-50/30 text-sm font-bold text-gray-700 transition-colors"
          >
            <HeartHandshake size={16} className="text-[#EC4899]" strokeWidth={2.2} />
            Kembali ke BADONASI
          </Link>
        )}

      </div>
    </div>
  );
}
