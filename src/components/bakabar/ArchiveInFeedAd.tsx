'use client';

// ════════════════════════════════════════════════════════════════
// BAKABAR — Archive In-Feed Ad v1.0 (native card, posisi kanal_infeed)
// PATH: src/components/bakabar/ArchiveInFeedAd.tsx
// ────────────────────────────────────────────────────────────────
// Kartu iklan native yang NIRU ArticleCard (cover 16:9 + judul + byline),
// disisip di grid BakabarArchive (kanal/kategori) tiap N kartu.
//   - 1 sel grid (ukuran identik ArticleCard) → grid tetap simetris.
//   - Editorial-ADS Firewall: tint amber + badge label (getAdLabel by tipe).
//   - Reuse total: getAdLabel / useAdView (impression IAB) / queueClick (beacon).
//   - Self-fetch posisi `kanal_infeed` (1x per halaman, cache modul → semua
//     instance share, gak N-fetch). Empty → return null (sel gak muncul,
//     grid auto-fill rapat → tetap simetris).
//   - `slot` prop = rotasi iklan kalau ada >1 (tiap titik inject beda iklan).
// ════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { getAdLabel } from '@/lib/ads/getAdLabel';
import { useAdView } from '@/hooks/useAdView';
import { queueClick } from '@/lib/adTracking';
import type { TrendingNativeAd } from './TrendingArticleAd';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';
const THUMB_FALLBACK = 'linear-gradient(135deg, #1e3a8a, #0f172a)';

// Cache modul: 1 fetch per halaman, di-share semua instance ArchiveInFeedAd.
let _cache: TrendingNativeAd[] | null = null;
let _inflight: Promise<TrendingNativeAd[]> | null = null;

async function loadKanalAds(): Promise<TrendingNativeAd[]> {
  if (_cache) return _cache;
  if (_inflight) return _inflight;
  _inflight = (async () => {
    try {
      const res = await fetch(`${API}/public/ads?position=kanal_infeed`);
      const json = await res.json();
      _cache = json?.success && Array.isArray(json.data) ? (json.data as TrendingNativeAd[]) : [];
    } catch {
      _cache = [];
    }
    return _cache;
  })();
  return _inflight;
}

export default function ArchiveInFeedAd({ slot = 0 }: { slot?: number }) {
  const [ad, setAd] = useState<TrendingNativeAd | null>(null);
  // useAdView dipanggil sebelum early-return (rules of hooks).
  const viewRef = useAdView<HTMLElement>(ad?.id ?? null);

  useEffect(() => {
    let alive = true;
    loadKanalAds().then((list) => {
      if (alive && list.length) setAd(list[slot % list.length]);
    });
    return () => { alive = false; };
  }, [slot]);

  if (!ad) return null;

  const label = getAdLabel({ advertiser_type: ad.advertiser_type, ad_format: ad.ad_format }) ?? 'Iklan';
  const href = ad.link_url ?? '#';
  const showDisclaimer = ad.advertiser_type === 'politisi' && ad.disclaimer_text;

  return (
    <a
      ref={viewRef as any}
      onClick={() => queueClick(ad.id)}
      href={href}
      target="_blank"
      rel="sponsored noopener noreferrer"
      data-ad-id={ad.id}
      data-ad-position="kanal_infeed"
      aria-label={`Iklan dari ${ad.advertiser_name}${ad.title ? `: ${ad.title}` : ''}`}
      className="group flex flex-col rounded-lg overflow-hidden border hover:shadow-md transition-shadow"
      style={{ background: '#FEFCE8', borderColor: '#FDE68A' }}
    >
      {/* Cover 16:9 — identik ArticleCard */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16 / 9', background: THUMB_FALLBACK }}>
        {ad.image_url && (
          <img
            src={ad.image_url}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        )}
        {/* Firewall: badge label per tipe advertiser (politisi → Iklan Kampanye, dst) */}
        <span
          className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide"
          style={{ background: 'rgba(255,255,255,0.95)', color: '#92400E', border: '0.5px solid #F59E0B' }}
        >
          {label}
        </span>
      </div>

      <div className="flex flex-col flex-1 p-3.5">
        <h3
          className="text-[15px] font-bold leading-snug text-gray-900 line-clamp-3 mb-2"
          style={{ fontFamily: "'Lora', Georgia, serif" }}
        >
          {ad.title ?? ad.advertiser_name}
        </h3>
        {ad.body && <p className="text-[12.5px] text-gray-500 line-clamp-2 mb-2.5">{ad.body}</p>}
        <div className="mt-auto flex items-center gap-1.5 text-[11px]">
          <span className="font-semibold" style={{ color: '#92400E' }}>{ad.advertiser_name}</span>
        </div>
        {showDisclaimer && (
          <div className="text-[8px] text-gray-500 italic line-clamp-1 mt-1">{ad.disclaimer_text}</div>
        )}
      </div>
    </a>
  );
}
