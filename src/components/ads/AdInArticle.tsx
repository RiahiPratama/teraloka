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

export default function AdInArticle() {
  const [ad,      setAd]      = useState<Ad | null>(null);
  const [loaded,  setLoaded]  = useState(false);
  const [visible, setVisible] = useState(false);
  const [refEl,   setRefEl]   = useState<HTMLElement | null>(null);

  // Fetch iklan aktif
  useEffect(() => {
    fetchActiveAd('in_article').then(a => { setAd(a); setLoaded(true); });
  }, []);

  // IntersectionObserver: trigger fade-in + slide-up saat element scroll into view
  useEffect(() => {
    if (!refEl) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' },
    );
    obs.observe(refEl);
    return () => obs.disconnect();
  }, [refEl]);

  const setRef = useCallback((el: HTMLElement | null) => {
    setRefEl(el);
  }, []);

  const animStyle: React.CSSProperties = {
    opacity:    visible ? 1 : 0,
    transform:  visible ? 'translateY(0)' : 'translateY(24px)',
    transition: 'opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1), transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
    willChange: 'opacity, transform',
  };

  // ═══ Skeleton loading ═══
  if (!loaded) {
    return (
      <>
        <style>{`
          @keyframes bk-ad-shimmer {
            0%   { background-position: -200% 0; }
            100% { background-position:  200% 0; }
          }
          .bk-ad-skel {
            background: linear-gradient(90deg, #F3F4F6 0%, #E5E7EB 50%, #F3F4F6 100%);
            background-size: 200% 100%;
            animation: bk-ad-shimmer 1.8s ease-in-out infinite;
          }
        `}</style>
        <div ref={setRef} className="my-6 rounded-xl overflow-hidden border border-gray-100" style={animStyle}>
          <div className="bk-ad-skel h-48 w-full" />
          <div className="p-4 bg-white">
            <div className="bk-ad-skel h-4 w-3/4 rounded mb-2" />
            <div className="bk-ad-skel h-3 w-1/2 rounded" />
          </div>
        </div>
      </>
    );
  }

  // ═══ Fallback (no active ad) — CTA untuk advertiser ═══
  if (!ad) {
    return (
      <div ref={setRef} className="my-6 rounded-xl p-4 flex items-center gap-3"
        style={{ ...animStyle, background: 'linear-gradient(to right, #F0FDF4, #F9FAFB)', border: '1.5px dashed #BBF7D0' }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
          style={{ background: '#D1FAE5' }}>📢</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-0.5">IKLAN MITRA TERALOKA</p>
          <p className="text-sm font-semibold text-gray-700">Iklankan bisnis kamu di sini</p>
          <p className="text-xs text-gray-400 mt-0.5">Jangkau pembaca BAKABAR langsung di tengah artikel</p>
        </div>
        <a href="mailto:ads@teraloka.com"
          className="shrink-0 text-xs font-bold text-white px-4 py-2 rounded-full"
          style={{ background: '#003526' }}>
          Pasang Iklan
        </a>
      </div>
    );
  }

  // ═══ Real ad ═══
  return (
    <>
      <style>{`
        @keyframes bk-ad-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7); }
          50%      { box-shadow: 0 0 0 6px rgba(251, 191, 36, 0); }
        }
        .bk-ad-label-pulse {
          animation: bk-ad-pulse 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
      <a ref={setRef} href={ad.link_url} target="_blank" rel="noopener noreferrer sponsored"
        onClick={() => trackAdClick(ad.id)}
        className="block my-6 rounded-xl overflow-hidden relative hover:opacity-95 transition-opacity border border-gray-200"
        style={animStyle}>
        {ad.image_url ? (
          <>
            <img src={ad.image_url} alt={ad.title}
              className="w-full h-auto object-cover" loading="lazy" />
            {(ad.title || ad.body) && (
              <div className="p-4">
                {ad.title && <p className="text-sm font-bold text-gray-900">{ad.title}</p>}
                {ad.body  && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{ad.body}</p>}
              </div>
            )}
          </>
        ) : (
          <div className="p-6 flex items-center gap-4"
            style={{ background: 'linear-gradient(135deg, #1B6B4A, #0891B2)' }}>
            <div className="flex-1">
              <p className="text-white font-bold text-base">{ad.title}</p>
              {ad.body && <p className="text-white/90 text-sm mt-1">{ad.body}</p>}
            </div>
            <span className="shrink-0 text-xs font-bold text-[#1B6B4A] bg-white px-4 py-2 rounded-full">
              Lihat →
            </span>
          </div>
        )}
        <span className="bk-ad-label-pulse absolute top-2 right-2 text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded uppercase tracking-wider">
          Iklan
        </span>
      </a>
    </>
  );
}
