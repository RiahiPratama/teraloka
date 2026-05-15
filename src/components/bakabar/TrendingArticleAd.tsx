'use client';

// ════════════════════════════════════════════════════════════════
// BAKABAR — Trending Article Ad v1.1 (Mission 7 Phase 3)
// PATH: src/components/bakabar/TrendingArticleAd.tsx
// ────────────────────────────────────────────────────────────────
// v1.1 UPDATE (15 Mei 2026, Mission 7 Phase 3):
//   - Conditional render DCABanner saat ad.creative_frames punya 2+
//     frames → headline + image rotation auto.
//   - Fallback ke single-frame rendering (Mission 6 behavior) saat
//     creative_frames null/empty/1-frame.
//
// ────────────────────────────────────────────────────────────────
// v1.0 PRIOR (Mission 6 Phase 4) — preserved unchanged:
//   - Native ad mirror trending row layout v10.2
//   - Pattern AAA editorial blend (IKLAN badge + amber tint)
//   - KPU disclaimer auto-render untuk politisi
//   - External link rel="sponsored noopener noreferrer"
//   - Empty state preserves LEAN aesthetic
// ════════════════════════════════════════════════════════════════

import { useState } from 'react';
import DCABanner, { type AdFrame } from './DCABanner';

// Match backend response shape — extended Mission 7 dengan creative_frames
export type TrendingNativeAd = {
  id:                  string;
  title:               string | null;
  body:                string | null;
  link_url:            string | null;
  image_url:           string | null;
  positions:           string[];
  target_regions:      string[] | null;
  creative_frames:     AdFrame[] | null;   // Mission 7
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

const FALLBACK_GRADIENT = 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)';
const BG_DEFAULT        = 'rgba(254, 252, 232, 0.15)';
const BG_HOVER          = 'rgba(254, 252, 232, 0.4)';
const IKLAN_AMBER       = '#F59E0B';
const ADV_TEXT_AMBER    = '#92400E';

export default function TrendingArticleAd({ ad, regionSlug, short_label }: Props) {
  const [imgFailed, setImgFailed] = useState(false);

  if (!ad) return null;

  const href = ad.link_url ?? '#';
  const ariaLabel = `Iklan dari ${ad.advertiser_name}${ad.title ? `: ${ad.title}` : ''}`;
  const showDisclaimer = ad.advertiser_type === 'politisi' && ad.disclaimer_text;

  // Mission 7: detect DCA mode (2+ frames = rotation, else static)
  const isDCA = Array.isArray(ad.creative_frames) && ad.creative_frames.length >= 2;

  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored noopener noreferrer"
      aria-label={ariaLabel}
      data-region={regionSlug}
      data-ad-id={ad.id}
      data-ad-position="trending_native"
      data-ad-mode={isDCA ? 'dca' : 'static'}
      className="flex flex-col gap-2 px-3.5 py-2.5 cursor-pointer transition-colors"
      style={{
        borderBottom: '1px solid #F3F4F6',
        background:   BG_DEFAULT,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = BG_HOVER; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = BG_DEFAULT; }}
    >
      {/* Top section: headline + thumbnail (DCA rotating atau static) */}
      <div className="flex gap-2 w-full">
        {isDCA ? (
          // ─── Mission 7 DCA mode — rotation banner ───
          <DCABanner frames={ad.creative_frames as AdFrame[]} />
        ) : (
          // ─── Mission 6 static mode — single frame fallback ───
          <>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-1.5">
                <h4
                  className="text-[11.5px] font-semibold leading-[1.3] text-gray-900 line-clamp-2 flex-1"
                  style={{ fontFamily: "'Lora', Georgia, serif" }}
                >
                  {ad.title ?? 'Iklan'}
                </h4>
              </div>
            </div>
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
          </>
        )}
      </div>

      {/* Bottom section: IKLAN badge + advertiser attribution (both modes) */}
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex flex-col min-w-0 flex-1">
          <div
            className="flex items-center gap-1 text-[9px] truncate"
            style={{ color: ADV_TEXT_AMBER, fontWeight: 600 }}
          >
            <span className="truncate">{ad.advertiser_name}</span>
          </div>
          <div className="text-[9px] text-gray-400">
            Pilihan sponsor
          </div>
        </div>
        <span
          className="shrink-0 text-white font-extrabold uppercase"
          style={{
            background:    IKLAN_AMBER,
            fontSize:      '9px',
            padding:       '1.5px 5px',
            borderRadius:  '2px',
            letterSpacing: '0.4px',
          }}
          aria-hidden="true"
        >
          Iklan
        </span>
      </div>

      {/* KPU compliance: disclaimer untuk politisi advertorial */}
      {showDisclaimer && (
        <div className="text-[8px] text-gray-500 line-clamp-1 italic">
          {ad.disclaimer_text}
        </div>
      )}
    </a>
  );
}
