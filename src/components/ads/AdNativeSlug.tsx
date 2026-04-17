'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

interface Ad {
  id: string;
  title: string;
  body?: string;
  image_url?: string;
  link_url: string;
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

export default function AdNativeSlug() {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchActiveAd('native').then(a => { setAd(a); setLoaded(true); });
  }, []);

  // Placeholder saat loading atau tidak ada iklan aktif
  if (!loaded || !ad) {
    return (
      <div className="mt-5 bg-white border border-gray-100 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center text-2xl shrink-0">📦</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black text-[#003526] border border-[#003526]/30 px-1.5 py-0.5 rounded-full">Mitra</span>
            </div>
            <p className="text-sm font-bold text-gray-800 leading-snug">
              Iklankan Bisnis Kamu di BAKABAR TeraLoka
            </p>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              Jangkau ribuan warga Maluku Utara setiap hari melalui platform berita lokal terpercaya.
            </p>
            <a href="mailto:ads@teraloka.com"
              className="inline-block mt-2 text-xs font-bold text-[#003526] hover:underline">
              Hubungi kami → ads@teraloka.com
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <a href={ad.link_url} target="_blank" rel="noopener noreferrer sponsored"
      onClick={() => trackAdClick(ad.id)}
      className="block mt-5 bg-white border border-gray-100 rounded-2xl p-4 hover:border-gray-200 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        {ad.image_url ? (
          <img src={ad.image_url} alt={ad.title}
            className="w-14 h-14 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center text-2xl shrink-0">📦</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black text-[#003526] border border-[#003526]/30 px-1.5 py-0.5 rounded-full">Mitra</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Iklan</span>
          </div>
          <p className="text-sm font-bold text-gray-800 leading-snug">
            {ad.title}
          </p>
          {ad.body && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
              {ad.body}
            </p>
          )}
          <p className="inline-block mt-2 text-xs font-bold text-[#003526]">
            Lihat detail →
          </p>
        </div>
      </div>
    </a>
  );
}
