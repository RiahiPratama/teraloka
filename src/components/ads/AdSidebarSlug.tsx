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

export default function AdSidebarSlug() {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchActiveAd('sidebar').then(a => { setAd(a); setLoaded(true); });
  }, []);

  if (!loaded || !ad) {
    return (
      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl h-52 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xs text-gray-400 font-bold uppercase">IKLAN MITRA</p>
          <p className="text-xs text-gray-300 mt-1">300 × 200</p>
        </div>
      </div>
    );
  }

  return (
    <a href={ad.link_url} target="_blank" rel="noopener noreferrer sponsored"
      onClick={() => trackAdClick(ad.id)}
      className="block rounded-xl overflow-hidden relative h-52 hover:opacity-95 transition-opacity">
      {ad.image_url ? (
        <img src={ad.image_url} alt={ad.title}
          className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-4"
          style={{ background: 'linear-gradient(to bottom, #1B6B4A, #0891B2)' }}>
          <p className="text-white font-bold text-sm text-center">{ad.title}</p>
          {ad.body && <p className="text-white/80 text-xs mt-1 text-center line-clamp-2">{ad.body}</p>}
        </div>
      )}
      <span className="absolute top-2 right-2 text-[9px] font-bold text-white bg-black/40 px-1.5 py-0.5 rounded uppercase tracking-wider">
        Iklan
      </span>
    </a>
  );
}
