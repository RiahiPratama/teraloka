'use client';

import { useEffect, useState, useCallback } from 'react';

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
  const [ad,      setAd]      = useState<Ad | null>(null);
  const [loaded,  setLoaded]  = useState(false);
  const [visible, setVisible] = useState(false);
  const [refEl,   setRefEl]   = useState<HTMLElement | null>(null);

  useEffect(() => {
    fetchActiveAd('sidebar').then(a => { setAd(a); setLoaded(true); });
  }, []);

  useEffect(() => {
    if (!refEl) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );
    obs.observe(refEl);
    return () => obs.disconnect();
  }, [refEl]);

  const setRef = useCallback((el: HTMLElement | null) => {
    setRefEl(el);
  }, []);

  const animStyle: React.CSSProperties = {
    opacity:    visible ? 1 : 0,
    transform:  visible ? 'translateY(0)' : 'translateY(16px)',
    transition: 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1), transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
    willChange: 'opacity, transform',
  };

  // ═══ Skeleton loading ═══
  if (!loaded) {
    return (
      <>
        <style>{`
          @keyframes bk-sb-shimmer {
            0%   { background-position: -200% 0; }
            100% { background-position:  200% 0; }
          }
          .bk-sb-skel {
            background: linear-gradient(90deg, #F3F4F6 0%, #E5E7EB 50%, #F3F4F6 100%);
            background-size: 200% 100%;
            animation: bk-sb-shimmer 1.8s ease-in-out infinite;
          }
        `}</style>
        <div ref={setRef} className="bk-sb-skel rounded-xl h-52 w-full" style={animStyle} />
      </>
    );
  }

  // ═══ Fallback placeholder ═══
  if (!ad) {
    return (
      <div ref={setRef} className="bg-gray-50 border border-dashed border-gray-200 rounded-xl h-52 flex items-center justify-center"
        style={animStyle}>
        <div className="text-center">
          <p className="text-xs text-gray-400 font-bold uppercase">IKLAN MITRA</p>
          <p className="text-xs text-gray-300 mt-1">300 × 200</p>
        </div>
      </div>
    );
  }

  // ═══ Real ad ═══
  return (
    <>
      <style>{`
        @keyframes bk-sb-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7); }
          50%      { box-shadow: 0 0 0 5px rgba(251, 191, 36, 0); }
        }
        .bk-sb-label-pulse {
          animation: bk-sb-pulse 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
      <a ref={setRef} href={ad.link_url} target="_blank" rel="noopener noreferrer sponsored"
        onClick={() => trackAdClick(ad.id)}
        className="block rounded-xl overflow-hidden relative h-52 hover:opacity-95 transition-opacity"
        style={animStyle}>
        {ad.image_url ? (
          <img src={ad.image_url} alt={ad.title}
            className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4"
            style={{ background: 'linear-gradient(to bottom, #1B6B4A, #0891B2)' }}>
            <p className="text-white font-bold text-sm text-center">{ad.title}</p>
            {ad.body && <p className="text-white/80 text-xs mt-1 text-center line-clamp-2">{ad.body}</p>}
          </div>
        )}
        <span className="bk-sb-label-pulse absolute top-2 right-2 text-[9px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded uppercase tracking-wider">
          Iklan
        </span>
      </a>
    </>
  );
}
