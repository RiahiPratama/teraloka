'use client';

// ════════════════════════════════════════════════════════════════
// BAKABAR — Trending Article Ad v1.0 (Mission 6 Phase 4)
// PATH: src/components/bakabar/TrendingArticleAd.tsx
// ────────────────────────────────────────────────────────────────
// Native ad component yang di-inject di Col 2 Trending list
// RegionSection. Mirror visual trending row existing v10.2 dengan
// 3 differentiator subtle: IKLAN badge, amber-tinted background,
// advertiser attribution.
//
// Pattern AAA (Native Ad Editorial Blend):
//   - Same typography (Lora serif for title)
//   - Same dimensions (52×52 thumbnail, font sizes match)
//   - Same hover behavior (subtle background shift)
//   - Subtle differentiator (IKLAN badge + amber tint)
//   - Click area = whole row (large touch target)
//
// PRD: 01-PRD-ADVERTORIAL-TRENDING-v1.1
// Date: 15 Mei 2026
// ════════════════════════════════════════════════════════════════

import { useState } from 'react';

// Match backend response shape dari GET /public/ads/by-position/:position
// (src/domains/ads/public/ads-engine.ts → getActiveAds output)
export type TrendingNativeAd = {
  id:                  string;
  title:               string | null;
  body:                string | null;
  link_url:            string | null;
  image_url:           string | null;
  positions:           string[];
  target_regions:      string[] | null;
  billing_model:       string;
  ad_format:           'image' | 'text';
  advertiser_name:     string;
  advertiser_logo_url: string | null;
  disclaimer_text:     string | null;
  advertiser_type:     'umum' | 'politisi' | 'pemerintah' | 'komersial';
};

type Props = {
  ad:           TrendingNativeAd | null | undefined;
  regionSlug:   string;
  short_label?: string;
};

// Visual tokens (Pattern AAA — subtle editorial blend)
const FALLBACK_GRADIENT = 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)';
const BG_DEFAULT        = 'rgba(254, 252, 232, 0.15)';   // amber-50 at 15%
const BG_HOVER          = 'rgba(254, 252, 232, 0.4)';    // amber-50 at 40%
const IKLAN_AMBER       = '#F59E0B';                      // amber-500
const ADV_TEXT_AMBER    = '#92400E';                      // amber-800 (AAA contrast)

export default function TrendingArticleAd({ ad, regionSlug, short_label }: Props) {
  // Hook MUST be called before any early return (React rules)
  const [imgFailed, setImgFailed] = useState(false);

  // ─── Empty state — preserve LEAN aesthetic (no slot break) ─────
  if (!ad) return null;

  // Safeguard: kalau link_url null, render tapi href '#' (gak crash)
  const href = ad.link_url ?? '#';
  const ariaLabel = `Iklan dari ${ad.advertiser_name}${ad.title ? `: ${ad.title}` : ''}`;
  const showDisclaimer = ad.advertiser_type === 'politisi' && ad.disclaimer_text;

  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored noopener noreferrer"
      aria-label={ariaLabel}
      data-region={regionSlug}
      data-ad-id={ad.id}
      data-ad-position="trending_native"
      className="flex gap-2 px-3.5 py-2.5 cursor-pointer transition-colors"
      style={{
        borderBottom: '1px solid #F3F4F6',
        background:   BG_DEFAULT,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = BG_HOVER; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = BG_DEFAULT; }}
    >
      {/* Left: title + meta + advertiser */}
      <div className="flex-1 min-w-0">

        {/* Title row dengan IKLAN badge inline kanan */}
        <div className="flex items-start gap-1.5 mb-1">
          <h4
            className="text-[11.5px] font-semibold leading-[1.3] text-gray-900 line-clamp-2 flex-1"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            {ad.title ?? 'Iklan'}
          </h4>
          <span
            className="shrink-0 text-white font-extrabold uppercase"
            style={{
              background:    IKLAN_AMBER,
              fontSize:      '9px',
              padding:       '1.5px 5px',
              borderRadius:  '2px',
              marginTop:     '1px',
              letterSpacing: '0.4px',
            }}
            aria-hidden="true"
          >
            Iklan
          </span>
        </div>

        {/* Advertiser attribution (replace "BAKABAR {region}" baris di article) */}
        <div
          className="flex items-center gap-1 text-[9px] mt-1 truncate"
          style={{ color: ADV_TEXT_AMBER, fontWeight: 600 }}
        >
          <span className="truncate">{ad.advertiser_name}</span>
        </div>

        {/* Sponsor label (replace timestamp baris di article) */}
        <div className="text-[9px] text-gray-400 mt-0.5">
          Pilihan sponsor
        </div>

        {/* KPU compliance: disclaimer untuk politisi advertorial */}
        {showDisclaimer && (
          <div className="text-[8px] text-gray-500 mt-0.5 line-clamp-1 italic">
            {ad.disclaimer_text}
          </div>
        )}
      </div>

      {/* Right: 52×52 thumbnail dengan amber fallback gradient */}
      <div
        className="w-[52px] h-[52px] rounded-md shrink-0 overflow-hidden"
        style={{ background: FALLBACK_GRADIENT }}
      >
        {ad.image_url && !imgFailed && (
          <img
            src={ad.image_url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        )}
      </div>
    </a>
  );
}
