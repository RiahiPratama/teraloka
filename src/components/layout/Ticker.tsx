const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

async function getTickerItems(): Promise<{ id: string; text: string; link?: string }[]> {
  try {
    const res = await fetch(`${API}/ticker`, {
      next: { revalidate: 300 }, // refresh setiap 5 menit
    });
    const data = await res.json();
    if (data.success && data.data?.length) return data.data;
    return [];
  } catch {
    return [];
  }
}

export default async function Ticker() {
  const items = await getTickerItems();

  if (!items.length) return null;

  // Duplikasi 3x untuk seamless loop yang lebih panjang
  const repeated = [...items, ...items, ...items];

  return (
    <div
      className="overflow-hidden relative z-[60]"
      style={{ background: 'var(--green)', color: '#fff', padding: '8px 0' }}
    >
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .ticker-track {
          animation: ticker-scroll 60s linear infinite;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="ticker-track flex gap-12 whitespace-nowrap w-max">
        {repeated.map((item, i) => (
          item.link ? (
            <a
              key={i}
              href={item.link}
              target={item.link.startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs font-semibold tracking-wider hover:opacity-80 transition-opacity"
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: item.id === 'bmkg-live' ? '#FCD34D' : 'var(--orange)' }}
              />
              {item.text}
            </a>
          ) : (
            <span
              key={i}
              className="flex items-center gap-2 text-xs font-semibold tracking-wider"
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: 'var(--orange)' }}
              />
              {item.text}
            </span>
          )
        ))}
      </div>
    </div>
  );
}
