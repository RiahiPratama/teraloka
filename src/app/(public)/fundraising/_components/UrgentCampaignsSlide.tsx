import Link from 'next/link';
import CampaignCard from './CampaignCard';

const URGENT_LIMIT = 5;

export default function UrgentCampaignsSlide({ campaigns }: { campaigns: any[] }) {
  const showAll = campaigns.length <= URGENT_LIMIT;
  const displayed = showAll ? campaigns : campaigns.slice(0, URGENT_LIMIT);
  const remaining = campaigns.length - URGENT_LIMIT;

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          BUTUH BANTUAN SEGERA
        </div>
        <span className="text-[10px] text-gray-400 font-medium">
          {campaigns.length} kampanye · geser →
        </span>
      </div>

      {/* Horizontal Swipe Container */}
      <div
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-4 px-4 pb-2"
        style={{ scrollPaddingLeft: '1rem', scrollPaddingRight: '1rem' }}
      >
        {displayed.map((c: any) => (
          <div
            key={c.id}
            className="snap-start flex-shrink-0 w-[85%] max-w-[340px]"
          >
            <CampaignCard campaign={c} variant="card" />
          </div>
        ))}

        {/* "Lihat Semua" card if more than URGENT_LIMIT */}
        {!showAll && (
          <Link
            href="/fundraising?cat=urgent"
            className="snap-start flex-shrink-0 w-[85%] max-w-[340px] rounded-2xl border-2 border-dashed border-red-200 bg-red-50/50 flex flex-col items-center justify-center gap-3 py-8 hover:bg-red-100/50 transition-colors"
          >
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-2xl">🔴</span>
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-bold text-red-700 mb-1">
                +{remaining} kampanye urgent lainnya
              </p>
              <p className="text-xs text-red-500">
                Lihat semua →
              </p>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
