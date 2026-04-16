const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

async function getTickerItems(): Promise<{ id: string; text: string; link?: string }[]> {
  try {
    const res = await fetch(`${API}/ticker`, { next: { revalidate: 300 } });
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

  const repeated = [...items, ...items, ...items];

  return (
    <>
      {/* Spacer — mendorong konten di bawah agar tidak ketutupan ticker fixed */}
      <div aria-hidden="true" style={{ height: 36 }} />

      {/* Ticker fixed di top-0, z di atas segalanya */}
      <div
        className="fixed top-0 left-0 right-0 overflow-hidden z-[70]"
        style={{ background: 'var(--green)', color: '#fff', padding: '8px 0', height: 36 }}
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
              <a key={i} href={item.link}
                target={item.link.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-semibold tracking-wider hover:opacity-80 transition-opacity"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: item.id === 'bmkg-live' ? '#FCD34D' : 'var(--orange)' }} />
                {item.text}
              </a>
            ) : (
              <span key={i} className="flex items-center gap-2 text-xs font-semibold tracking-wider">
                <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: 'var(--orange)' }} />
                {item.text}
              </span>
            )
          ))}
        </div>
      </div>
    </>
  );
}
