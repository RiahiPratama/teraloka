import Link from 'next/link';
import { ShieldCheck, Heart, Users, Clock, CheckCircle2 } from 'lucide-react';
import { formatRupiah } from '@/utils/format';

type Campaign = {
  id: string;
  title: string;
  slug: string;
  category?: string;
  beneficiary_name?: string;
  target_amount: number;
  collected_amount: number;
  donor_count?: number;
  cover_image_url?: string;
  is_urgent?: boolean;
  is_verified?: boolean;
  status?: string;
  deadline?: string;
};

type Props = {
  campaign: Campaign;
  variant: 'card' | 'row';
};

function shortAmount(n: number): string {
  if (n >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + n.toLocaleString('id-ID');
}

function daysLeft(deadline?: string): { text: string; urgent: boolean } | null {
  if (!deadline) return null;
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (days <= 0) return { text: 'Berakhir', urgent: false };
  return { text: `${days} hari lagi`, urgent: days <= 7 };
}

function categoryLabel(cat?: string): string {
  const map: Record<string, string> = {
    kesehatan: 'Kesehatan',
    bencana: 'Bencana Alam',
    duka: 'Duka',
    anak_yatim: 'Anak Yatim',
    lansia: 'Lansia',
    hunian_darurat: 'Hunian Darurat',
  };
  return map[cat ?? ''] ?? (cat?.replace(/_/g, ' ') ?? 'Kemanusiaan');
}

export default function CampaignCard({ campaign: c, variant }: Props) {
  const pct = c.target_amount > 0 ? Math.min((c.collected_amount / c.target_amount) * 100, 100) : 0;
  const isCompleted = c.status === 'completed' || pct >= 100;
  const days = daysLeft(c.deadline);

  // ══════════════════════════════════════════════════════
  // CARD VARIANT — Large for urgent slide
  // ══════════════════════════════════════════════════════
  if (variant === 'card') {
    return (
      <Link
        href={`/fundraising/${c.slug}`}
        className="group block bg-white rounded-2xl border border-pink-100 overflow-hidden hover:shadow-lg hover:border-pink-200 transition-all duration-300"
      >
        {/* Cover Image */}
        <div className="relative h-44 bg-gray-100 overflow-hidden">
          {c.cover_image_url ? (
            <img
              src={c.cover_image_url}
              alt={c.title}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-pink-100">
              <Heart size={40} strokeWidth={1.8} className="text-[#EC4899]" />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none"></div>

          {/* Top-right: Verified badge */}
          {c.is_verified && (
            <div className="absolute top-3 right-3">
              <div className="inline-flex items-center gap-1 bg-white/95 backdrop-blur-sm text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                <ShieldCheck size={10} strokeWidth={2.5} />
                Terverifikasi
              </div>
            </div>
          )}

          {/* Top-left: Urgent or Completed badge */}
          <div className="absolute top-3 left-3">
            {isCompleted ? (
              <div className="inline-flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                <CheckCircle2 size={10} strokeWidth={2.5} />
                Tercapai 100%
              </div>
            ) : c.is_urgent ? (
              <div className="inline-flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                <span className="text-[8px]">🔴</span>
                URGENT
              </div>
            ) : null}
          </div>

          {/* Bottom-left: Category */}
          <div className="absolute bottom-3 left-3">
            <span className="inline-block bg-white/90 backdrop-blur-sm text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {categoryLabel(c.category)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-[15px] font-bold text-gray-900 leading-snug line-clamp-2 mb-1">
            {c.title}
          </h3>
          {c.beneficiary_name && (
            <p className="text-xs text-gray-500">
              untuk <span className="font-medium text-gray-700">{c.beneficiary_name}</span>
            </p>
          )}

          {/* Progress */}
          <div className="mt-3">
            <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: isCompleted
                    ? 'linear-gradient(90deg, #10B981, #059669)'
                    : 'linear-gradient(90deg, #EC4899, #BE185D)',
                }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#003526]">
                {shortAmount(c.collected_amount)}
              </span>
              <span className={`text-[11px] font-bold ${isCompleted ? 'text-emerald-600' : 'text-[#EC4899]'}`}>
                {Math.round(pct)}%
              </span>
            </div>
          </div>

          {/* Meta */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
            <div className="flex items-center gap-1">
              <Users size={11} />
              <span>{(c.donor_count ?? 0).toLocaleString('id-ID')} donatur</span>
            </div>
            {days && !isCompleted && (
              <div className={`flex items-center gap-1 ${days.urgent ? 'text-red-500 font-semibold' : ''}`}>
                <Clock size={11} />
                <span>{days.text}</span>
              </div>
            )}
            {isCompleted && (
              <span className="text-emerald-600 font-semibold">Selesai</span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // ══════════════════════════════════════════════════════
  // ROW VARIANT — Compact for regular list
  // ══════════════════════════════════════════════════════
  return (
    <Link
      href={`/fundraising/${c.slug}`}
      className="group flex gap-3 bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-pink-100 transition-all p-3"
    >
      {/* Thumbnail */}
      <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 shrink-0 relative">
        {c.cover_image_url ? (
          <img
            src={c.cover_image_url}
            alt={c.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-pink-50">
            <Heart size={28} strokeWidth={1.8} className="text-[#EC4899]" />
          </div>
        )}

        {/* Completed overlay */}
        {isCompleted && (
          <div className="absolute inset-0 bg-emerald-500/90 flex items-center justify-center">
            <div className="text-center text-white">
              <CheckCircle2 size={20} strokeWidth={2.5} className="mx-auto" />
              <p className="text-[9px] font-bold mt-0.5">100%</p>
            </div>
          </div>
        )}

        {/* Verified badge (compact) */}
        {!isCompleted && c.is_verified && (
          <div className="absolute top-1 right-1">
            <span
              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 shadow-sm"
              title="Terverifikasi"
            >
              <ShieldCheck size={10} strokeWidth={3} className="text-white" />
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-0.5">
        {/* Category */}
        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-0.5">
          {categoryLabel(c.category)}
        </p>

        {/* Title */}
        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">
          {c.title}
        </h3>

        {/* Beneficiary */}
        {c.beneficiary_name && (
          <p className="text-[11px] text-gray-400 mt-0.5 truncate">
            untuk {c.beneficiary_name}
          </p>
        )}

        {/* Progress */}
        <div className="mt-2 h-1 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: isCompleted
                ? 'linear-gradient(90deg, #10B981, #059669)'
                : 'linear-gradient(90deg, #EC4899, #BE185D)',
            }}
          />
        </div>

        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs font-bold text-[#003526]">
            {shortAmount(c.collected_amount)}
          </span>
          <span className="text-[11px] text-gray-400">
            {(c.donor_count ?? 0).toLocaleString('id-ID')} donatur
          </span>
        </div>
      </div>
    </Link>
  );
}
