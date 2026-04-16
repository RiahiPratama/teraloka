'use client';

import { useState, useEffect, Suspense } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';

// ── Type tabs (Layer 1) ───────────────────────────────────────
const TYPE_TABS = [
  { key: 'terbaru',  label: 'Terbaru' },
  { key: 'viral',    label: '🔥 Viral' },
  { key: 'nasional', label: '🗞️ Nasional' },
];

// ── Location chips (Layer 2) ──────────────────────────────────
const LOCATION_API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

const NAVBAR_OFFSET = 100; // ticker(36) + navbar-top(44) + navbar-height(52) - spacer(36) + buffer = ~100px
const NEAR_END      = 70; // % scroll untuk reveal

type Location = { id: string; name: string; slug: string; type: string };

function CategoryTabsInner() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [visible,     setVisible]     = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [atTop,       setAtTop]       = useState(true);
  const [locations,   setLocations]   = useState<Location[]>([]);

  const isNewsPage    = pathname === '/news';
  const isArticlePage = pathname.startsWith('/news/');
  const showTabs      = isNewsPage || isArticlePage;

  const currentType     = searchParams.get('type')     || 'terbaru';
  const currentLocation = searchParams.get('location') || 'all';

  // ── Fetch locations dari API ──────────────────────────────
  useEffect(() => {
    fetch(`${LOCATION_API}/locations`)
      .then(r => r.json())
      .then(d => { if (d.success) setLocations(d.data); })
      .catch(() => {});
  }, []);

  // ── Scroll-aware (context-aware) ─────────────────────────
  useEffect(() => {
    if (!showTabs) return;

    function onScroll() {
      const currentY   = window.scrollY;
      const docHeight  = document.documentElement.scrollHeight;
      const winHeight  = window.innerHeight;
      const progress   = docHeight > winHeight
        ? (currentY / (docHeight - winHeight)) * 100 : 100;

      const nearEnd     = progress >= NEAR_END;
      const scrollingUp = currentY < lastScrollY - 4;
      const scrollingDn = currentY > lastScrollY + 4;

      setAtTop(currentY < 60);

      if (nearEnd) {
        setVisible(true);
      } else if (scrollingUp) {
        setVisible(true);
      } else if (scrollingDn && currentY > 120) {
        setVisible(false);
      } else if (currentY < 60) {
        setVisible(true);
      }

      setLastScrollY(currentY);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [lastScrollY, showTabs]);

  if (!showTabs) return null;

  // ── Navigation helper ─────────────────────────────────────
  function navigate(type: string, location: string) {
    const p = new URLSearchParams();
    if (type !== 'terbaru')  p.set('type', type);
    if (location !== 'all')  p.set('location', location);
    router.push(`/news?${p.toString()}`);
  }

  const setType     = (t: string) => navigate(t, currentLocation);
  const setLocation = (l: string) => navigate(currentType, l);

  return (
    <div
      style={{
        position: 'sticky',
        top: NAVBAR_OFFSET,
        zIndex: 30,
        background: '#fff',
        borderBottom: '1px solid #F3F4F6',
        transform: visible ? 'translateY(0)' : `translateY(calc(-100% - ${NAVBAR_OFFSET}px))`,
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: atTop ? 'none' : '0 2px 16px rgba(0,0,0,0.06)',
      }}
    >
      {/* ── Layer 1: Type tabs ── */}
      <div className="max-w-4xl mx-auto border-b border-gray-100">
        <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TYPE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setType(tab.key)}
              className={`px-5 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all flex-shrink-0 ${
                isNewsPage && currentType === tab.key
                  ? 'border-[#003526] text-[#003526]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Layer 2: Location chips ── */}
      {/* Tidak tampil di artikel detail dan tidak tampil kalau type=nasional */}
      {isNewsPage && currentType !== 'nasional' && (
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {/* "Semua" chip */}
            <button
              onClick={() => setLocation('all')}
              className={`flex-shrink-0 text-xs font-bold px-3 py-1 rounded-full transition-all ${
                currentLocation === 'all'
                  ? 'bg-[#003526] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Semua
            </button>

            {/* Location chips dari API */}
            {locations.map(loc => (
              <button
                key={loc.slug}
                onClick={() => setLocation(loc.slug)}
                className={`flex-shrink-0 text-xs font-bold px-3 py-1 rounded-full transition-all ${
                  currentLocation === loc.slug
                    ? 'bg-[#003526] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {loc.name}
              </button>
            ))}

            {/* Fallback kalau API belum ready */}
            {locations.length === 0 && [
              { slug: 'ternate', name: 'Ternate' },
              { slug: 'tidore',  name: 'Tidore' },
              { slug: 'sofifi',  name: 'Sofifi' },
              { slug: 'halsel',  name: 'Halsel' },
              { slug: 'halbar',  name: 'Halbar' },
              { slug: 'halut',   name: 'Halut' },
              { slug: 'halteng', name: 'Halteng' },
              { slug: 'haltim',  name: 'Haltim' },
              { slug: 'sula',    name: 'Sula' },
              { slug: 'taliabu', name: 'Taliabu' },
              { slug: 'morotai', name: 'Morotai' },
            ].map(loc => (
              <button key={loc.slug} onClick={() => setLocation(loc.slug)}
                className={`flex-shrink-0 text-xs font-bold px-3 py-1 rounded-full transition-all ${
                  currentLocation === loc.slug
                    ? 'bg-[#003526] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {loc.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Nasional mode: tampilkan label sumber */}
      {isNewsPage && currentType === 'nasional' && (
        <div className="max-w-4xl mx-auto px-4 py-1.5">
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#003526] inline-block" />
            Berita nasional yang dikurasi tim TeraLoka — relevan dengan Maluku Utara
          </p>
        </div>
      )}
    </div>
  );
}

export default function CategoryTabs() {
  return (
    <Suspense fallback={null}>
      <CategoryTabsInner />
    </Suspense>
  );
}
