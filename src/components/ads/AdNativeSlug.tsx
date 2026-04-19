'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Megaphone, Newspaper, ArrowRight } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

interface Ad {
  id: string;
  title: string;
  body?: string;
  image_url?: string | null;
  link_url: string;
  ad_format?: 'image' | 'text';
  // Advertorial fields
  slug?: string;
  advertiser_name?: string;
  advertiser_logo_url?: string | null;
  advertiser_type?: 'umum' | 'politisi' | 'pemerintah' | 'komersial';
  disclaimer_text?: string | null;
}

async function fetchActiveAd(position: string): Promise<Ad | null> {
  try {
    const res = await fetch(`${API}/public/ads?position=${position}`);
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

export default function AdNativeSlug() {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchActiveAd('native').then(a => { setAd(a); setLoaded(true); });
  }, []);

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

  // ═══ TEXT ADVERTORIAL di native feed ═══
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
          {/* Logo atau icon fallback */}
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
          </div>
        </div>
      </Link>
    );
  }

  // ═══ IMAGE BANNER — existing behavior ═══
  return (
    <a href={ad.link_url} target="_blank" rel="noopener noreferrer sponsored"
      onClick={() => trackAdClick(ad.id)}
      className="block mt-5 rounded-2xl p-4 hover:shadow-sm transition-all"
      style={{ background: '#FDF6E8', border: '0.5px solid #FAC775', borderLeft: '3px solid #BA7517' }}>
      <div className="flex items-start gap-3">
        {ad.image_url ? (
          <img src={ad.image_url} alt={ad.title}
            className="w-14 h-14 rounded-xl object-cover shrink-0" style={{ border: '0.5px solid #FAC775' }} />
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
            {ad.title}
          </p>
          {ad.body && (
            <p className="text-xs mt-1 leading-relaxed line-clamp-2" style={{ color: '#854F0B' }}>
              {ad.body}
            </p>
          )}
          <p className="inline-flex items-center gap-1 mt-2 text-xs font-bold" style={{ color: '#BA7517' }}>
            Lihat detail <ArrowRight size={11} strokeWidth={2.4} />
          </p>
        </div>
      </div>
    </a>
  );
}
