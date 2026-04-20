'use client';

import { useState, useEffect, Suspense } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';

// ── Type tabs (Layer 1) ───────────────────────────────────────
const TYPE_TABS = [
  { key: 'terbaru',  label: 'Terbaru' },
  { key: 'viral',    label: '🔥 Viral' },
  { key: 'nasional', label: '🗞️ Nasional' },
];

// ── Topik dropdown (skip 'viral' — sudah jadi tab utama) ──────
const TOPICS = [
  { key: 'berita',       label: 'Berita',       icon: '📰' },
  { key: 'politik',      label: 'Politik',      icon: '🏛️' },
  { key: 'ekonomi',      label: 'Ekonomi',      icon: '💰' },
  { key: 'sosial',       label: 'Sosial',       icon: '🤝' },
  { key: 'transportasi', label: 'Transportasi', icon: '🚤' },
  { key: 'olahraga',     label: 'Olahraga',     icon: '⚽' },
  { key: 'kesehatan',    label: 'Kesehatan',    icon: '🩺' },
  { key: 'pendidikan',   label: 'Pendidikan',   icon: '🎓' },
  { key: 'budaya',       label: 'Budaya',       icon: '🎭' },
  { key: 'teknologi',    label: 'Teknologi',    icon: '💡' },
  { key: 'cuaca',        label: 'Cuaca',        icon: '☁️' },
  { key: 'opini',        label: 'Opini',        icon: '💬' },
];

// ── Location chips (Layer 2) ──────────────────────────────────
const LOCATION_API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

const NAVBAR_OFFSET = 100; // ticker(36) + navbar-top(44~52) + navbar-height(52) - spacer(36) ≈ 100px
const NEAR_END      = 70; // % scroll untuk reveal

// Urutan tampil location chips — urutan resmi 11 kabupaten/kota Maluku Utara
// Slug sesuai DB public.locations — jangan diubah tanpa update DB schema
const LOCATION_ORDER = [
  'ternate',       // 1. Ternate (ibukota de facto)
  'sofifi',        // 2. Sofifi (ibukota resmi)
  'tidore',        // 3. Tidore Kepulauan
  'halteng',       // 4. Halmahera Tengah
  'halut',         // 5. Halmahera Utara
  'halsel',        // 6. Halmahera Selatan
  'halbar',        // 7. Halmahera Barat
  'haltim',        // 8. Halmahera Timur
  'morotai',       // 9. Kepulauan Morotai
  'sula',          // 10. Kepulauan Sula
  'taliabu',       // 11. Pulau Taliabu
];

type Location = { id: string; name: string; slug: string; type: string };

function CategoryTabsInner() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [visible,     setVisible]     = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [atTop,       setAtTop]       = useState(true);
  const [locations,   setLocations]   = useState<Location[]>([]);
  const [topicOpen,   setTopicOpen]   = useState(false);

  const isNewsPage    = pathname === '/news';
  const showTabs      = isNewsPage; // tabs HANYA di /news, tidak di artikel slug

  const currentType     = searchParams.get('type')     || 'terbaru';
  const currentLocation = searchParams.get('location') || 'all';
  const currentTopic    = searchParams.get('topic')    || '';

  // Close topic dropdown on outside click atau Escape
  useEffect(() => {
    if (!topicOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-topic-dropdown]')) setTopicOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTopicOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [topicOpen]);

  // ── Fetch locations dari API ──────────────────────────────
  useEffect(() => {
    fetch(`${LOCATION_API}/locations`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          // Sort sesuai LOCATION_ORDER, sisanya di belakang
          const sorted = [...d.data].sort((a: Location, b: Location) => {
            const ai = LOCATION_ORDER.indexOf(a.slug);
            const bi = LOCATION_ORDER.indexOf(b.slug);
            if (ai === -1 && bi === -1) return 0;
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
          });
          setLocations(sorted);
        }
      })
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
  function navigate(type: string, location: string, topic: string = currentTopic) {
    const p = new URLSearchParams();
    if (type !== 'terbaru')  p.set('type', type);
    if (location !== 'all')  p.set('location', location);
    if (topic)               p.set('topic', topic);
    router.push(`/news?${p.toString()}`);
  }

  const setType     = (t: string) => navigate(t, currentLocation, currentTopic);
  const setLocation = (l: string) => navigate(currentType, l, currentTopic);
  const setTopic    = (tp: string) => { navigate(currentType, currentLocation, tp); setTopicOpen(false); };

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
      {/* ── Layer 1: Type tabs + Topic dropdown ── */}
      <div className="max-w-4xl mx-auto border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
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

          {/* Topic dropdown — pinned right */}
          <div className="relative flex-shrink-0 pr-4" data-topic-dropdown>
            <button
              onClick={() => setTopicOpen(o => !o)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                currentTopic
                  ? 'bg-[#1B6B4A] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {currentTopic ? (
                <>
                  <span>{TOPICS.find(t => t.key === currentTopic)?.icon}</span>
                  <span>{TOPICS.find(t => t.key === currentTopic)?.label}</span>
                </>
              ) : (
                <span>Topik</span>
              )}
              <span className={`text-[10px] transition-transform ${topicOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {topicOpen && (
              <div
                className="absolute right-4 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden"
                style={{ minWidth: 180, maxHeight: '70vh', overflowY: 'auto' }}
              >
                <button
                  onClick={() => setTopic('')}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-colors ${
                    !currentTopic ? 'bg-[#1B6B4A]/10 text-[#1B6B4A]' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="w-4 text-center">{!currentTopic ? '✓' : ''}</span>
                  <span>Semua topik</span>
                </button>
                <div className="h-px bg-gray-100" />
                {TOPICS.map(t => {
                  const active = currentTopic === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTopic(t.key)}
                      className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-colors ${
                        active ? 'bg-[#1B6B4A]/10 text-[#1B6B4A]' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="w-4 text-center">{active ? '✓' : t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
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

            {/* Fallback kalau API belum ready — slug WAJIB match DB public.locations */}
            {locations.length === 0 && [
              { slug: 'ternate',  name: 'Ternate' },
              { slug: 'sofifi',   name: 'Sofifi' },
              { slug: 'tidore',   name: 'Tidore' },
              { slug: 'halteng',  name: 'Halmahera Tengah' },
              { slug: 'halut',    name: 'Halmahera Utara' },
              { slug: 'halsel',   name: 'Halmahera Selatan' },
              { slug: 'halbar',   name: 'Halmahera Barat' },
              { slug: 'haltim',   name: 'Halmahera Timur' },
              { slug: 'morotai',  name: 'Kepulauan Morotai' },
              { slug: 'sula',     name: 'Kepulauan Sula' },
              { slug: 'taliabu',  name: 'Pulau Taliabu' },
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
