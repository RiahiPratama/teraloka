'use client';

import { useState, useEffect, Suspense } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';

const CATEGORIES = [
  { key: 'all',          label: 'Terbaru' },
  { key: 'berita',       label: 'Berita' },
  { key: 'politik',      label: 'Politik' },
  { key: 'ekonomi',      label: 'Ekonomi' },
  { key: 'sosial',       label: 'Sosial' },
  { key: 'transportasi', label: 'Transportasi' },
  { key: 'kesehatan',    label: 'Kesehatan' },
  { key: 'pendidikan',   label: 'Pendidikan' },
  { key: 'olahraga',     label: 'Olahraga' },
  { key: 'budaya',       label: 'Budaya' },
  { key: 'teknologi',    label: 'Teknologi' },
  { key: 'viral',        label: 'Viral' },
];

// Navbar fixed top-8 (32px) + navbar height ~52px = ~88px
const NAVBAR_OFFSET = 88;

// Threshold scroll progress untuk "near end of article"
const NEAR_END_THRESHOLD = 70; // persen

function CategoryTabsInner() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [visible,     setVisible]     = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [atTop,       setAtTop]       = useState(true);

  // Aktif di semua halaman BAKABAR: list & artikel
  const isNewsPage    = pathname === '/news';
  const isArticlePage = pathname.startsWith('/news/');
  const showTabs      = isNewsPage || isArticlePage;

  // ── Context-aware scroll logic ────────────────────────────
  useEffect(() => {
    if (!showTabs) return;

    function onScroll() {
      const currentY  = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;

      // Progress baca artikel (0–100%)
      const scrollProgress = docHeight > winHeight
        ? (currentY / (docHeight - winHeight)) * 100
        : 100;

      const nearEnd     = scrollProgress >= NEAR_END_THRESHOLD;
      const scrollingUp = currentY < lastScrollY - 4;
      const scrollingDn = currentY > lastScrollY + 4;

      setAtTop(currentY < 60);

      if (nearEnd) {
        // ── Fase EXPLORE: mendekati akhir artikel ──────────
        // Tampilkan selalu, bahkan tanpa scroll up
        setVisible(true);
      } else if (scrollingUp) {
        // ── Fase NAVIGASI: user cari arah lagi ────────────
        setVisible(true);
      } else if (scrollingDn && currentY > 120) {
        // ── Fase READING: user fokus baca ─────────────────
        setVisible(false);
      } else if (currentY < 60) {
        // Di atas halaman — selalu tampil
        setVisible(true);
      }

      setLastScrollY(currentY);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [lastScrollY, showTabs]);

  if (!showTabs) return null;

  function setCategory(key: string) {
    const p = new URLSearchParams();
    if (key !== 'all') p.set('category', key);
    router.push(`/news?${p.toString()}`);
  }

  const category = searchParams.get('category') || 'all';

  return (
    <div
      style={{
        position: 'sticky',
        top: NAVBAR_OFFSET,
        zIndex: 30,
        background: '#fff',
        borderBottom: '1px solid #F3F4F6',
        transform: visible ? 'translateY(0)' : `translateY(calc(-100% - ${NAVBAR_OFFSET}px))`,
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: atTop ? 'none' : '0 2px 12px rgba(0,0,0,0.05)',
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div
          className="flex overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all flex-shrink-0 ${
                isNewsPage && category === cat.key
                  ? 'border-[#003526] text-[#003526]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
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
