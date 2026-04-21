import Link from 'next/link';
import { Heart, Sparkles, Quote } from 'lucide-react';

type Donation = {
  id: string;
  donor_name: string;
  amount: number;
  message?: string | null;
  created_at: string;
  campaign_title: string;
  campaign_slug: string;
};

function shortAmount(n: number): string {
  if (n >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + n.toLocaleString('id-ID');
}

// ═══ CLEAR TIME LABELS — bahasa Indonesia lengkap, ga ambigu ═══
function relativeTime(date: string): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return 'baru saja';
  if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    return `${mins} menit lalu`;
  }
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours} jam lalu`;
  }
  if (diff < 2592000) {
    const days = Math.floor(diff / 86400);
    return `${days} hari lalu`;
  }
  if (diff < 31536000) {
    const months = Math.floor(diff / 2592000);
    return `${months} bulan lalu`;
  }
  const years = Math.floor(diff / 31536000);
  return `${years} tahun lalu`;
}

export default function DonorWall({ donations }: { donations: Donation[] }) {
  // ═══ SAFETY NET: Sort by created_at DESC (newest first) ═══
  const sortedDonations = [...donations].sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    return timeB - timeA;
  });

  const withDoa = sortedDonations.filter(d => d.message && d.message.trim().length > 0).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-pink-100 overflow-hidden">

      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-pink-50 to-white border-b border-pink-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EC4899] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EC4899]"></span>
          </div>
          <p className="text-xs font-bold text-[#BE185D] uppercase tracking-wider">
            Donasi & Doa Terbaru
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-medium">
          <span className="text-gray-400">{sortedDonations.length} donatur</span>
          {withDoa > 0 && (
            <>
              <span className="text-gray-300">•</span>
              <span className="text-[#EC4899] font-bold">{withDoa} doa</span>
            </>
          )}
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto scrollbar-none">
        {sortedDonations.map((d) => {
          const hasMessage = d.message && d.message.trim().length > 0;
          return (
            <Link
              key={d.id}
              href={d.campaign_slug ? `/fundraising/${d.campaign_slug}` : '/fundraising'}
              className="flex items-start gap-3 px-4 py-3 hover:bg-pink-50/50 transition-colors"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center shrink-0 mt-0.5">
                <Heart size={14} strokeWidth={2.5} className="text-[#EC4899]" fill="#EC4899" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Line 1: name + amount */}
                <p className="text-xs text-gray-700 leading-snug">
                  <span className="font-bold text-gray-900">{d.donor_name}</span>
                  <span className="text-gray-400"> donasi </span>
                  <span className="font-bold text-[#EC4899]">{shortAmount(d.amount)}</span>
                </p>

                {/* Line 2: campaign */}
                <p className="text-[11px] text-gray-500 truncate mt-0.5">
                  untuk <span className="text-gray-700 font-medium">{d.campaign_title}</span>
                </p>

                {/* Line 3: message (doa) if present */}
                {hasMessage && (
                  <div className="mt-2 relative pl-3 border-l-2 border-pink-200">
                    <Quote
                      size={10}
                      className="absolute -left-[5px] top-0 bg-white text-pink-300"
                      fill="#EC4899"
                      strokeWidth={0}
                    />
                    <p className="text-[11px] italic text-gray-600 line-clamp-3 leading-relaxed">
                      {d.message}
                    </p>
                  </div>
                )}
              </div>

              {/* Time — CLEAR LABELS */}
              <span className="text-[10px] text-gray-400 shrink-0 font-medium mt-0.5 whitespace-nowrap">
                {relativeTime(d.created_at)}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      {sortedDonations.length >= 8 && (
        <div className="px-4 py-2 bg-gray-50 text-center">
          <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
            <Sparkles size={10} />
            Makasih untuk semua donatur baik hati
          </p>
        </div>
      )}
    </div>
  );
}
