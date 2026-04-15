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

// Navbar fixed top-8 (32px) + navbar height ~52px + sedikit gap = 88px
const NAVBAR_OFFSET = 88;

function CategoryTabsInner() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [visible,     setVisible]     = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [atTop,       setAtTop]       = useState(true);

  const isNewsPage = pathname === '/news';
  const category   = searchParams.get('category') || 'all';

  // ── Scroll-aware behavior ─────────────────────────────────
  useEffect(() => {
    if (!isNewsPage) return;

    function onScroll() {
      const currentY = window.scrollY;

      setAtTop(currentY < 60);

      if (currentY < 60) {
        // Di atas — selalu tampil
        setVisible(true);
      } else if (currentY > lastScrollY + 4) {
        // Scroll down — sembunyikan
        setVisible(false);
      } else if (currentY < lastScrollY - 4) {
        // Scroll up — tampilkan
        setVisible(true);
      }

      setLastScrollY(currentY);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [lastScrollY, isNewsPage]);

  // Hanya render di halaman /news
  if (!isNewsPage) return null;

  function setCategory(key: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (key === 'all') p.delete('category');
    else p.set('category', key);
    // Hapus query search kalau ganti kategori
    const q = p.get('q');
    router.push(`/news?${p.toString()}`);
  }

  return (
    <div
      className="bg-white border-b border-gray-100"
      style={{
        position: 'sticky',
        top: NAVBAR_OFFSET,
        zIndex: 30,
        transform: visible ? 'translateY(0)' : `translateY(calc(-100% - ${NAVBAR_OFFSET}px))`,
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: atTop ? 'none' : '0 2px 12px rgba(0,0,0,0.06)',
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
                category === cat.key
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

// Wraps in Suspense karena pakai useSearchParams
export default function CategoryTabs() {
  return (
    <Suspense fallback={null}>
      <CategoryTabsInner />
    </Suspense>
  );
}
