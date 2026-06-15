import { TICKER_URGENSI } from '@/utils/constants';
import { formatRelative } from '@/utils/format';
import type { TickerItem } from '@/types/common';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

async function getTickerItems(): Promise<TickerItem[]> {
  try {
    const res = await fetch(`${API}/ticker`, { next: { revalidate: 300 } });
    const data = await res.json();
    // 🛡️ Backend sudah sort + firewall (drop promo saat darurat) + cap.
    // FE TINGGAL RENDER apa adanya — JANGAN re-sort / re-filter.
    if (data.success && data.data?.length) return data.data as TickerItem[];
    return [];
  } catch {
    return [];
  }
}

export default async function Ticker() {
  const items = await getTickerItems();
  if (!items.length) return null;

  const repeated = [...items, ...items, ...items];

  return (
    <>
      {/* Spacer — mendorong konten di bawah agar tidak ketutupan ticker fixed */}
      <div aria-hidden="true" style={{ height: 36 }} />

      {/* Ticker fixed di top-0 */}
      <div
        className="ticker-bar fixed top-0 left-0 right-0 overflow-hidden z-[70]"
        style={{ background: 'var(--green)', color: '#fff', padding: '8px 0', height: 36 }}
        role="region"
        aria-label="Berita berjalan"
      >
        {/*
          🛡️ a11y (LOCK #2):
          - pausable on hover + focus-within (keyboard)
          - prefers-reduced-motion: matikan animasi, izinkan scroll manual
        */}
        <style>{`
          @keyframes ticker-scroll {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-33.333%); }
          }
          .ticker-track {
            animation: ticker-scroll 60s linear infinite;
          }
          .ticker-track:hover,
          .ticker-bar:focus-within .ticker-track {
            animation-play-state: paused;
          }
          @media (prefers-reduced-motion: reduce) {
            .ticker-track { animation: none; }
            .ticker-bar { overflow-x: auto; }
          }
        `}</style>

        <div className="ticker-track flex gap-12 whitespace-nowrap w-max">
          {repeated.map((item, i) => {
            const dot = TICKER_URGENSI[item.urgensi]?.dot ?? 'var(--orange)';
            const showSource = item.kategori === 'bahaya' || !!item.source_name;

            return (
              <span
                key={i}
                className="flex items-center gap-2 text-xs font-semibold tracking-wider"
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: dot }}
                  aria-hidden="true"
                />

                {/* Teks (link kalau ada) */}
                {item.link ? (
                  <a
                    href={item.link}
                    target={item.link.startsWith('http') ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className="hover:opacity-80 transition-opacity"
                  >
                    {item.text}
                  </a>
                ) : (
                  <span>{item.text}</span>
                )}

                {/* 🛡️ LOCK #1 — atribusi sumber WAJIB (life-safety, mis. BMKG). */}
                {showSource && item.source_name && (
                  <span className="opacity-90">
                    · Sumber:{' '}
                    {item.source_url ? (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:opacity-80"
                      >
                        {item.source_name}
                      </a>
                    ) : (
                      <span>{item.source_name}</span>
                    )}
                    {item.source_timestamp && <> ({formatRelative(item.source_timestamp)})</>}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </>
  );
}
