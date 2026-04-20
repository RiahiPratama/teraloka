import Link from 'next/link';
import type { Metadata } from 'next';
import {
  HeartHandshake, Siren, Users, Clock, Target,
  ImageIcon, ArrowRight, Plus, Flame,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

export const metadata: Metadata = {
  title: 'BADONASI — Bantu Warga Maluku Utara',
  description: 'Platform donasi komunitas untuk membantu warga Maluku Utara yang membutuhkan. 100% donasi sampai ke penerima.',
};

// Force dynamic — jangan cache list (biar campaign baru langsung muncul)
export const dynamic = 'force-dynamic';

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  kesehatan:      { label: 'Kesehatan',      color: '#D85A30' },
  bencana:        { label: 'Bencana Alam',   color: '#378ADD' },
  duka:           { label: 'Duka / Musibah', color: '#888780' },
  anak_yatim:     { label: 'Anak Yatim',     color: '#E8963A' },
  lansia:         { label: 'Lansia',         color: '#BA7517' },
  hunian_darurat: { label: 'Hunian Darurat', color: '#0891B2' },
};

interface Campaign {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  beneficiary_name: string;
  target_amount: number;
  collected_amount: number;
  donor_count: number;
  cover_image_url: string | null;
  is_urgent: boolean;
  status: string;
  deadline: string | null;
  created_at: string;
}

function formatRupiah(n: number): string {
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

function shortAmount(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'rb';
  return String(n);
}

function daysRemaining(deadline: string | null): number | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

async function fetchCampaigns(): Promise<Campaign[]> {
  try {
    const res = await fetch(`${API}/funding/campaigns?page=1&limit=50`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch (err) {
    console.error('[fundraising] fetch error:', err);
    return [];
  }
}

export default async function FundraisingListPage() {
  const campaigns = await fetchCampaigns();
  const urgent = campaigns.filter(c => c.is_urgent);
  const regular = campaigns.filter(c => !c.is_urgent);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#003526] to-[#1B6B4A] px-4 pt-10 pb-12 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-2 mb-3">
            <HeartHandshake size={24} className="text-[#F472B6]" />
            <p className="text-xs font-bold text-[#F472B6] uppercase tracking-widest">BADONASI</p>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-2">
            Bantu Sesama di Maluku Utara
          </h1>
          <p className="text-sm md:text-base text-[#95d3ba] max-w-2xl leading-relaxed">
            Platform donasi komunitas dengan transparansi penuh. 100% donasimu sampai ke penerima, tanpa potongan.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/fundraising/new"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-md hover:shadow-lg hover:opacity-95 transition-all"
            >
              <Plus size={16} />
              Ajukan Campaign Baru
            </Link>
            <Link
              href="/badonasi/standar-verifikasi"
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white text-sm font-semibold px-5 py-3 rounded-2xl hover:bg-white/20 transition-colors"
            >
              Cara Kerja BADONASI
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 -mt-6">
        {campaigns.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-4">
              <HeartHandshake size={36} className="text-gray-300" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Belum Ada Campaign Aktif</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
              Saat ini belum ada campaign yang sedang berjalan. Ingin ajukan campaign buat keluarga atau komunitas yang membutuhkan?
            </p>
            <Link
              href="/fundraising/new"
              className="inline-flex items-center gap-2 mt-5 bg-[#003526] text-white text-sm font-bold px-5 py-3 rounded-2xl hover:opacity-90 transition-opacity"
            >
              <Plus size={16} />
              Ajukan Sekarang
            </Link>
          </div>
        ) : (
          <>
            {/* URGENT section */}
            {urgent.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Flame size={18} className="text-red-500" />
                  <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Butuh Bantuan Segera</h2>
                  <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{urgent.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {urgent.map(c => <CampaignCard key={c.id} campaign={c} />)}
                </div>
              </div>
            )}

            {/* REGULAR section */}
            {regular.length > 0 && (
              <div>
                {urgent.length > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <HeartHandshake size={18} className="text-[#003526]" />
                    <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Campaign Lainnya</h2>
                    <span className="text-xs font-bold text-[#003526] bg-emerald-50 px-2 py-0.5 rounded-full">{regular.length}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {regular.map(c => <CampaignCard key={c.id} campaign={c} />)}
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer trust note */}
        <div className="mt-10 rounded-2xl bg-gradient-to-br from-[#003526] to-[#1B6B4A] p-6 text-white">
          <h3 className="text-base font-bold mb-3 flex items-center gap-2">
            <HeartHandshake size={18} className="text-[#F472B6]" />
            Kenapa BADONASI TeraLoka?
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-[#95d3ba]">✓</span>
              <span>100% donasi sampai ke penerima</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#95d3ba]">✓</span>
              <span>Verifikasi manual oleh tim TeraLoka</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#95d3ba]">✓</span>
              <span>Laporan penggunaan dana terbuka</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#95d3ba]">✓</span>
              <span>Dana via rekening partner komunitas</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CAMPAIGN CARD
// ─────────────────────────────────────────────────────────────

function CampaignCard({ campaign: c }: { campaign: Campaign }) {
  const progress = c.target_amount > 0
    ? Math.min((c.collected_amount / c.target_amount) * 100, 100)
    : 0;
  const daysLeft = daysRemaining(c.deadline);
  const category = CATEGORY_META[c.category] || CATEGORY_META.kesehatan;

  return (
    <Link
      href={`/fundraising/${c.slug}`}
      className="group block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all"
    >
      {/* Cover */}
      <div className="relative aspect-[16/10] bg-gray-100">
        {c.cover_image_url ? (
          <img
            src={c.cover_image_url}
            alt={c.beneficiary_name || c.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <ImageIcon size={40} className="text-gray-300" />
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1.5">
          {c.is_urgent && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold shadow-md">
              <Siren size={9} /> URGENT
            </span>
          )}
          <span
            className="px-2 py-0.5 rounded-full text-white text-[9px] font-bold shadow-md"
            style={{ backgroundColor: category.color }}
          >
            {category.label}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 mb-2 min-h-[2.5rem]">
          {c.title}
        </h3>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex items-baseline justify-between mb-1">
            <p className="text-base font-extrabold text-[#003526]">
              {shortAmount(c.collected_amount)}
            </p>
            <p className="text-xs font-bold text-[#EC4899]">
              {progress.toFixed(0)}%
            </p>
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#003526] to-[#1B6B4A] rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            dari {formatRupiah(c.target_amount)}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-1 pt-3 border-t border-gray-50">
          <div className="text-center">
            <Users size={11} className="mx-auto text-gray-400 mb-0.5" />
            <p className="text-xs font-bold text-gray-700">{c.donor_count}</p>
            <p className="text-[9px] text-gray-400 uppercase">Donatur</p>
          </div>
          <div className="text-center">
            <Clock size={11} className={`mx-auto mb-0.5 ${daysLeft !== null && daysLeft <= 7 ? 'text-red-500' : 'text-gray-400'}`} />
            <p className={`text-xs font-bold ${daysLeft !== null && daysLeft <= 7 ? 'text-red-500' : 'text-gray-700'}`}>
              {daysLeft !== null ? daysLeft : '∞'}
            </p>
            <p className="text-[9px] text-gray-400 uppercase">Hari</p>
          </div>
          <div className="text-center">
            <Target size={11} className="mx-auto text-gray-400 mb-0.5" />
            <p className="text-xs font-bold text-gray-700">
              {shortAmount(Math.max(0, c.target_amount - c.collected_amount))}
            </p>
            <p className="text-[9px] text-gray-400 uppercase">Kurang</p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-3 flex items-center justify-center gap-1 text-xs font-bold text-[#EC4899] group-hover:gap-2 transition-all">
          Lihat & Donasi
          <ArrowRight size={12} />
        </div>
      </div>
    </Link>
  );
}
