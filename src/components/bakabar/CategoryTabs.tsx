'use client';

// ════════════════════════════════════════════════════════════════
// CATEGORY TABS — BAKABAR vertical nav
// PATH: src/components/bakabar/CategoryTabs.tsx (Batch B v5a: moved here)
// ────────────────────────────────────────────────────────────────
// History:
//   - Initial build: 2-row layout (TYPE tabs + LOCATION pills)
//   - 14 Mei 2026 (Sprint 2A Batch 1-3): route migration + UX-optimized 13-item nav
//   - 15 Mei 2026 (Sprint 2A Batch A): REMOVED auto-hide-on-scroll
//   - 15 Mei 2026 (Batch B initial→fix): NAVBAR_OFFSET back to 100
//   - 15 Mei 2026 (Batch B v3): Merge PrayerBreakingBar inside container
//   - 15 Mei 2026 (Batch B v4): Hapus helper text row 3
//   
//   - 15 Mei 2026 (Batch B v5a — Folder Refactor):
//     File MOVED dari src/components/layout/ → src/components/bakabar/.
//     Reasoning per CEO instruction:
//     - CategoryTabs cuma render di /bakabar (conditional `if !showTabs return null`)
//     - Folder bakabar/ punya komponen domain-spec lain (TopLeaderboardAd, 
//       HeroWithSidebar, RegionSection, PrayerBreakingBar, etc)
//     - Consistent dengan Pattern (XX) Semantic Folder Match Domain Scope
//     - Co-located dengan PrayerBreakingBar yang udah di bakabar/
//     - Single consumer (src/app/(public)/layout.tsx) update import path
//     
//     NOTE: User akan DELETE file lama di src/components/layout/CategoryTabs.tsx
//     setelah copy file baru ini ke path target. Atau pakai `git mv` untuk
//     preserve git history.
//
// Folder convention LOCKED:
//   - src/components/layout/ = persistent global UI (Navbar, Footer, Fab, BottomNav)
//   - src/components/bakabar/ = BAKABAR-spec UI (semua component cuma di /bakabar)
// ════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, Suspense } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import PrayerBreakingBar from '@/components/bakabar/PrayerBreakingBar';

// ─── 13 nav items (single row, urutan LOCKED) ─────────────────
const NAV_ITEMS = [
  { key: 'nasional', label: 'Nasional',        kind: 'type' as const },
  { key: 'ternate',  label: 'Ternate',         kind: 'location' as const },
  { key: 'tidore',   label: 'Tidore',          kind: 'location' as const },
  { key: 'sofifi',   label: 'Sofifi',          kind: 'location' as const },
  { key: 'halbar',   label: 'Halbar',          kind: 'location' as const },
  { key: 'halut',    label: 'Halut',           kind: 'location' as const },
  { key: 'halteng',  label: 'Halteng',         kind: 'location' as const },
  { key: 'halsel',   label: 'Halsel',          kind: 'location' as const },
  { key: 'haltim',   label: 'Haltim',          kind: 'location' as const },
  { key: 'morotai',  label: 'Kep. Morotai',    kind: 'location' as const },
  { key: 'sula',     label: 'Kep. Sula',       kind: 'location' as const },
  { key: 'taliabu',  label: 'P. Taliabu',      kind: 'location' as const },
  { key: 'viral',    label: '🔥 Viral Medsos', kind: 'type' as const },
];

// ─── 12 Topik ─────────────────────────────────────────────────
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

// NAVBAR_OFFSET stay at 100 (Navbar.tsx top-[44px] sm:top-[52px] hardcoded).
const NAVBAR_OFFSET = 100;

// ─── URL state hybrid parser ─────────────────────────────────
function parseCurrentNav(params: URLSearchParams): string {
  const nav = params.get('nav');
  if (nav) return nav;
  const type = params.get('type');
  if (type && type !== 'terbaru') return type;
  const location = params.get('location');
  if (location && location !== 'all') return location;
  return 'terbaru';
}

function CategoryTabsInner() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [atTop,         setAtTop]         = useState(true);
  const [topicOpen,     setTopicOpen]     = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);

  const isNewsPage = pathname === '/bakabar';
  const showTabs   = isNewsPage;

  const currentNav   = parseCurrentNav(searchParams);
  const currentTopic = searchParams.get('topic') || '';

  // ── Detect horizontal scroll position untuk fade indicator ──
  useEffect(() => {
    if (!showTabs) return;
    const el = scrollRef.current;
    if (!el) return;

    function checkFade() {
      if (!el) return;
      const canScrollRight = el.scrollWidth - el.scrollLeft - el.clientWidth > 4;
      setShowRightFade(canScrollRight);
    }

    checkFade();
    el.addEventListener('scroll', checkFade, { passive: true });
    window.addEventListener('resize', checkFade);

    return () => {
      el.removeEventListener('scroll', checkFade);
      window.removeEventListener('resize', checkFade);
    };
  }, [showTabs]);

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

  // ── Track atTop untuk drop-shadow effect saja ──
  useEffect(() => {
    if (!showTabs) return;
    function onScroll() {
      setAtTop(window.scrollY < 60);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [showTabs]);

  if (!showTabs) return null;

  function navigate(nav: string, topic: string = currentTopic) {
    const p = new URLSearchParams();
    if (nav !== 'terbaru') p.set('nav', nav);
    if (topic)              p.set('topic', topic);
    const qs = p.toString();
    router.push(qs ? `/bakabar?${qs}` : '/bakabar');
  }

  const setNav   = (n: string) => navigate(n, currentTopic);
  const setTopic = (tp: string) => {
    navigate(currentNav, tp);
    setTopicOpen(false);
  };

  return (
    <div
      style={{
        position: 'sticky',
        top: NAVBAR_OFFSET,
        zIndex: 30,
        background: '#ffffff',
        borderTop: '1px solid #F3F4F6',
        borderBottom: '1px solid #E5E7EB',
        boxShadow: atTop ? 'none' : '0 2px 16px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.2s ease',
      }}
    >
      <div className="max-w-4xl mx-auto px-4 py-3">

        {/* ── Row 1: 13 nav items + Topik dropdown ─────────────────────── */}
        <div className="relative flex items-center">

          <div
            ref={scrollRef}
            className="flex items-center flex-1 overflow-x-auto"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
              gap: 2,
            }}
          >
            {NAV_ITEMS.map(item => {
              const active = currentNav === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setNav(item.key)}
                  className="flex-shrink-0 whitespace-nowrap transition-all"
                  style={{
                    padding: '9px 16px',
                    fontSize: 14,
                    fontWeight: active ? 700 : 600,
                    color: active ? '#5B21B6' : '#1F2937',
                    background: active ? 'rgba(139, 92, 246, 0.10)' : 'transparent',
                    borderRadius: 999,
                    boxShadow: active
                      ? 'inset 0 0 0 1px rgba(139, 92, 246, 0.25)'
                      : 'none',
                    border: 'none',
                    cursor: 'pointer',
                    letterSpacing: 0.1,
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.background = '#F3F4F6';
                      e.currentTarget.style.color = '#000000';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#1F2937';
                    }
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {showRightFade && (
            <div
              style={{
                position: 'absolute',
                right: 92,
                top: 0,
                bottom: 0,
                width: 28,
                background: 'linear-gradient(to right, transparent, #ffffff 70%)',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
          )}

          <div
            className="relative flex-shrink-0 ml-2 pl-3"
            style={{ borderLeft: '1px solid #E5E7EB' }}
            data-topic-dropdown
          >
            <button
              onClick={() => setTopicOpen(o => !o)}
              className="whitespace-nowrap transition-all flex items-center gap-1.5"
              style={{
                padding: '8px 12px',
                fontSize: 14,
                fontWeight: currentTopic ? 700 : 600,
                color: currentTopic ? '#ffffff' : '#1F2937',
                background: currentTopic ? '#8B5CF6' : '#ffffff',
                border: currentTopic ? 'none' : '0.5px solid #D1D5DB',
                borderRadius: 8,
                cursor: 'pointer',
                letterSpacing: 0.1,
              }}
              onMouseEnter={e => {
                if (!currentTopic) {
                  e.currentTarget.style.background = '#F9FAFB';
                  e.currentTarget.style.borderColor = '#9CA3AF';
                }
              }}
              onMouseLeave={e => {
                if (!currentTopic) {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = '#D1D5DB';
                }
              }}
            >
              {currentTopic ? (
                <>
                  <span>{TOPICS.find(t => t.key === currentTopic)?.icon}</span>
                  <span>{TOPICS.find(t => t.key === currentTopic)?.label}</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 15 }}>🏷️</span>
                  <span>Topik</span>
                </>
              )}
              <span
                className="transition-transform"
                style={{
                  fontSize: 10,
                  transform: topicOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  opacity: 0.7,
                }}
              >
                ▼
              </span>
            </button>

            {topicOpen && (
              <div
                className="absolute right-0 top-full mt-2 border rounded-xl shadow-lg z-50 overflow-hidden"
                style={{
                  minWidth: 200,
                  maxHeight: '70vh',
                  overflowY: 'auto',
                  background: '#ffffff',
                  borderColor: '#E5E7EB',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.10), 0 8px 10px -6px rgba(0,0,0,0.05)',
                }}
              >
                <button
                  onClick={() => setTopic('')}
                  className="w-full text-left flex items-center gap-2 transition-colors"
                  style={{
                    padding: '10px 14px',
                    fontSize: 13,
                    fontWeight: !currentTopic ? 700 : 600,
                    background: !currentTopic ? 'rgba(139, 92, 246, 0.10)' : 'transparent',
                    color: !currentTopic ? '#5B21B6' : '#1F2937',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    if (currentTopic) e.currentTarget.style.background = '#F9FAFB';
                  }}
                  onMouseLeave={e => {
                    if (currentTopic) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span className="w-4 text-center">{!currentTopic ? '✓' : ''}</span>
                  <span>Semua topik</span>
                </button>
                <div className="h-px" style={{ background: '#F3F4F6' }} />
                {TOPICS.map(t => {
                  const active = currentTopic === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTopic(t.key)}
                      className="w-full text-left flex items-center gap-2 transition-colors"
                      style={{
                        padding: '10px 14px',
                        fontSize: 13,
                        fontWeight: active ? 700 : 600,
                        background: active ? 'rgba(139, 92, 246, 0.10)' : 'transparent',
                        color: active ? '#5B21B6' : '#1F2937',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => {
                        if (!active) e.currentTarget.style.background = '#F9FAFB';
                      }}
                      onMouseLeave={e => {
                        if (!active) e.currentTarget.style.background = 'transparent';
                      }}
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

        {/* ── Row 2: 🔴 Breaking (kiri) | 🕌 Shalat MalUt (kanan) ── */}
        <PrayerBreakingBar />

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
