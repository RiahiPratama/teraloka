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

import { useEffect, useRef, useState } from 'react';
import { getAdLabel } from '@/lib/ads/getAdLabel';
import { fetchAdJson } from '@/lib/ads/fetchAdJson';
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
    // fetchAdJson: res.ok + retry + gagal→[]. Dedup _cache/_inflight tetap utuh.
    _cache = await fetchAdJson<TrendingNativeAd>(`${API}/public/ads?position=kanal_infeed`);
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

  // R2 video: putar di cover sbg isi kartu. IntersectionObserver = hemat
  // (play pas kelihatan, pause pas keluar layar). muted+loop = autoplay policy.
  // TANPA klik sendiri → <a> kartu yang nangkap klik (1 pintu).
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoSource = ad?.video_sources?.['kanal_infeed'] ?? null;
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoSource) return;
    if (typeof IntersectionObserver === 'undefined') {
      el.play().catch(() => { /* autoplay blocked — poster tetap */ });
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => { /* graceful */ });
        else el.pause();
      },
      { threshold: 0.5, rootMargin: '0px 0px -50px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [videoSource]);

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
        {videoSource && (videoSource.mp4 || videoSource.webm) ? (
          // webM dulu (ringan, mayoritas pembaca MalUt) → mp4 fallback universal.
          <video
            ref={videoRef}
            muted
            playsInline
            loop
            preload="metadata"
            poster={videoSource.poster || ad.image_url || undefined}
            className="w-full h-full object-cover"
          >
            {videoSource.webm && <source src={videoSource.webm} type="video/webm" />}
            {videoSource.mp4 && <source src={videoSource.mp4} type="video/mp4" />}
          </video>
        ) : ad.image_url ? (
          <img
            src={ad.image_url}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : null}
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
