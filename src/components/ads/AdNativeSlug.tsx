'use client';

/**
 * TeraLoka — AdNativeSlug (v4)
 * Mission 8 Sub-Phase 8-D Phase 2 Turn 2
 * ────────────────────────────────────────────────────────────────
 * Native-style ad di slug page — blend dengan related articles section.
 *
 * v4 Changes (16 Mei 2026 Phase 2 Turn 2):
 *   - Accept `formatFilter?` prop dari slug page (editor OFFICE control)
 *
 * History:
 *   - v1 (15 Mei 2026): advertorial branching + image native + Mitra badge
 *   - v2 (16 Mei 2026 Batch C2): DCA rotation silent + disclaimer + shared hook
 *   - v3 (16 Mei 2026 Batch C3): region targeting param
 *   - v4 (16 Mei 2026 Phase 2 Turn 2): formatFilter prop
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Megaphone, Newspaper, ArrowRight } from 'lucide-react';
import { useAdRotation, type AdFrame } from '@/hooks/useAdRotation';
import { useRegion, buildRegionParam } from '@/contexts/RegionContext';
import type { AdFormatFilter } from '@/lib/ad-settings';
import { buildFormatFilterParam } from '@/lib/ad-settings';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

interface Ad {
  id: string;
  title: string;
  body?: string;
  image_url?: string | null;
  link_url: string;
  ad_format?: 'image' | 'text';
  slug?: string;
  advertiser_name?: string;
  advertiser_logo_url?: string | null;
  advertiser_type?: 'umum' | 'politisi' | 'pemerintah' | 'komersial';
  disclaimer_text?: string | null;
  creative_frames?: AdFrame[] | null;
}

interface Props {
  formatFilter?: AdFormatFilter;
}

async function fetchActiveAd(
  position: string,
  region: string | null,
  formatFilter?: AdFormatFilter,
): Promise<Ad | null> {
  try {
    const url = `${API}/public/ads?position=${position}${buildRegionParam(region)}${buildFormatFilterParam(formatFilter)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) return null;
    const ads = data.data ?? [];
    if (!ads.length) return null;
    return ads[Math.floor(Math.random() * ads.length)];
  } catch {
    return null;
  }
}

function trackAdClick(adId: string) {
  fetch(`${API}/public/ads/${adId}/click`, { method: 'POST' }).catch(() => {});
}

const ADVERTISER_TYPE_LABEL: Record<string, string> = {
  pemerintah: 'Pemerintah',
  politisi:   'Kampanye Politik',
  komersial:  'Mitra Bisnis',
  umum:       'Konten Mitra',
};

function truncate(text: string, max: number): string {
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

export default function AdNativeSlug({ formatFilter }: Props = {}) {
  const { region } = useRegion();

  const [ad, setAd] = useState<Ad | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Re-fetch saat region atau formatFilter berubah
  useEffect(() => {
    setLoaded(false);
    fetchActiveAd('native', region, formatFilter).then(a => { setAd(a); setLoaded(true); });
  }, [region, formatFilter]);

  // DCA rotation SILENT (Pattern AAA Native Editorial Blend + SESI 5E Phase 2 hybrid)
  const { active: activeFrame, isDCA } = useAdRotation(ad?.creative_frames, 'native');

  // Placeholder saat loading atau tidak ada iklan aktif
  if (!loaded || !ad) {
    return (
      <div className="mt-5 rounded-2xl p-4" style={{ background: '#FDF6E8', border: '0.5px solid #FAC775', borderLeft: '3px solid #BA7517' }}>
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#FAC775' }}>
            <Megaphone size={24} strokeWidth={2} style={{ color: '#412402' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full" style={{ color: '#854F0B', background: '#FAC775', border: '0.5px solid #BA7517' }}>Mitra</span>
            </div>
            <p className="text-sm font-bold leading-snug" style={{ color: '#412402' }}>
              Iklankan Bisnis Kamu di BAKABAR TeraLoka
            </p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: '#854F0B' }}>
              Jangkau ribuan warga Maluku Utara setiap hari melalui platform berita lokal terpercaya.
            </p>
            <a href="mailto:ads@teraloka.com"
              className="inline-flex items-center gap-1 mt-2 text-xs font-bold hover:underline" style={{ color: '#BA7517' }}>
              Hubungi kami → ads@teraloka.com
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ═══ TEXT ADVERTORIAL ═══
  if (ad.ad_format === 'text' && ad.slug) {
    const typeLabel = ADVERTISER_TYPE_LABEL[ad.advertiser_type || 'umum'] || 'Konten Mitra';
    const preview = truncate(ad.body || '', 140);

    return (
      <Link href={`/sponsored/${ad.slug}`}
        onClick={() => trackAdClick(ad.id)}
        className="block mt-5 rounded-2xl border p-4 hover:shadow-md transition-all"
        style={{
          background: 'linear-gradient(to bottom right, #FFFBEB, #FEF3C7)',
          borderColor: '#FDE68A',
        }}>
        <div className="flex items-start gap-3">
          {ad.advertiser_logo_url ? (
            <img src={ad.advertiser_logo_url} alt={ad.advertiser_name}
              className="w-14 h-14 rounded-xl object-cover shrink-0 bg-white" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200">
              <Newspaper size={24} strokeWidth={2} style={{ color: '#854F0B' }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[9px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                {typeLabel}
              </span>
              <span className="text-[10px] font-semibold text-amber-900 truncate">{ad.advertiser_name}</span>
            </div>
            <p className="text-sm font-bold text-gray-900 leading-snug mb-1">
              {ad.title}
            </p>
            <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">
              {preview}
            </p>
            <p className="inline-block mt-2 text-xs font-bold text-amber-900">
              Baca selengkapnya →
            </p>

            {ad.disclaimer_text && (
              <p className="mt-2 pt-2 border-t border-amber-200 text-[9px] text-amber-800 italic leading-tight">
                {ad.disclaimer_text}
              </p>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // ═══ IMAGE NATIVE — DCA silent rotation ═══
  const displayImage = activeFrame?.image_url || ad.image_url;
  const displayTitle = activeFrame?.headline  || ad.title;
  const displayBody  = isDCA ? null : ad.body;

  return (
    <a href={ad.link_url} target="_blank" rel="noopener noreferrer sponsored"
      onClick={() => trackAdClick(ad.id)}
      className="block mt-5 rounded-2xl p-4 hover:shadow-sm transition-all"
      style={{ background: '#FDF6E8', border: '0.5px solid #FAC775', borderLeft: '3px solid #BA7517' }}>
      <div className="flex items-start gap-3">
        {displayImage ? (
          <img
            key={displayImage}
            src={displayImage}
            alt={displayTitle}
            className="w-14 h-14 rounded-xl object-cover shrink-0 transition-opacity duration-500"
            style={{ border: '0.5px solid #FAC775' }}
          />
        ) : (
          <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#FAC775' }}>
            <Megaphone size={24} strokeWidth={2} style={{ color: '#412402' }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full" style={{ color: '#854F0B', background: '#FAC775', border: '0.5px solid #BA7517' }}>Mitra</span>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#BA7517' }}>Iklan</span>
          </div>
          <p className="text-sm font-bold leading-snug" style={{ color: '#412402' }}>
            {displayTitle}
          </p>
          {displayBody && (
            <p className="text-xs mt-1 leading-relaxed line-clamp-2" style={{ color: '#854F0B' }}>
              {displayBody}
            </p>
          )}
          <p className="inline-flex items-center gap-1 mt-2 text-xs font-bold" style={{ color: '#BA7517' }}>
            Lihat detail <ArrowRight size={11} strokeWidth={2.4} />
          </p>

          {ad.disclaimer_text && (
            <p className="mt-2 pt-2 border-t text-[9px] italic leading-tight"
              style={{ borderColor: '#FAC775', color: '#854F0B' }}>
              {ad.disclaimer_text}
            </p>
          )}
        </div>
      </div>
    </a>
  );
}
