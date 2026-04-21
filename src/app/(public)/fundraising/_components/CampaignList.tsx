'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowRight } from 'lucide-react';
import CampaignCard from './CampaignCard';

const INITIAL_LIMIT = 6;
const INCREMENT = 6;
const MAX_INPLACE = 18; // After 18 cards, redirect to /fundraising/semua

type Props = {
  campaigns: any[];
  hasUrgent: boolean;
  activeCategory?: string;
};

export default function CampaignList({ campaigns, hasUrgent, activeCategory }: Props) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_LIMIT);
  const displayed = campaigns.slice(0, visibleCount);
  const total = campaigns.length;

  const canExpandInPlace = visibleCount < Math.min(MAX_INPLACE, total);
  const hitMaxInPlace = visibleCount >= MAX_INPLACE && total > MAX_INPLACE;
  const showAllBrowseLink = hitMaxInPlace;
  const remaining = total - visibleCount;
  const loadIncrement = Math.min(INCREMENT, remaining);

  function handleLoadMore() {
    setVisibleCount((v) => Math.min(v + INCREMENT, Math.min(MAX_INPLACE, total)));
  }

  if (total === 0) return null;

  // URL for "Lihat Semua" — preserve category filter
  const semuaHref = activeCategory && activeCategory !== 'all'
    ? `/fundraising/semua?cat=${activeCategory}`
    : '/fundraising/semua';

  return (
    <div>
      {/* Section Header */}
      {hasUrgent && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Kampanye Lainnya
          </p>
          <span className="text-[10px] text-gray-400 font-medium">
            {visibleCount < total ? `${visibleCount} dari ${total}` : `${total} kampanye`}
          </span>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-3">
        {displayed.map((c: any) => (
          <CampaignCard key={c.id} campaign={c} variant="row" />
        ))}
      </div>

      {/* Load More Button (in-place, up to MAX_INPLACE) */}
      {canExpandInPlace && !showAllBrowseLink && (
        <button
          onClick={handleLoadMore}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50/50 hover:bg-pink-100/50 text-sm font-bold text-[#BE185D] transition-colors group"
        >
          <ChevronDown size={16} strokeWidth={2.5} className="group-hover:translate-y-0.5 transition-transform" />
          <span>Muat {loadIncrement} Lagi</span>
          <span className="text-[11px] font-medium text-pink-400">
            ({remaining} tersisa)
          </span>
        </button>
      )}

      {/* "Lihat Semua" Link — after hitting MAX_INPLACE cap */}
      {showAllBrowseLink && (
        <Link
          href={semuaHref}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#BE185D] hover:opacity-90 text-sm font-bold text-white transition-opacity shadow-md group"
        >
          <span>Jelajahi Semua {total} Kampanye</span>
          <ArrowRight size={14} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* All loaded message (for small counts) */}
      {!canExpandInPlace && !showAllBrowseLink && total > INITIAL_LIMIT && (
        <div className="mt-4 text-center py-3 text-[11px] text-gray-400 font-medium">
          ✨ Kamu udah liat semua {total} kampanye
        </div>
      )}
    </div>
  );
}
