'use client';

// ════════════════════════════════════════════════════════════════
// VERTICAL NAV (was CategoryTabs)
// ────────────────────────────────────────────────────────────────
// History:
//   - Initial build: 2-row layout (TYPE tabs + LOCATION pills)
//   - 14 Mei 2026 (Sprint 2A Batch 1): route migration /news → /bakabar
//   - 14 Mei 2026 (Sprint 2A Batch 2): filter dropdown daerah 1073 → 11
//   - 14 Mei 2026 (Sprint 2A Batch 3 V4 FINAL): UX-optimized 13-item nav
//     - 13 items single row (urutan LOCKED per user requirement)
//     - Pill style (border-radius 999px) — softer, news portal modern
//     - Typography baseline: SEMUA items font-weight 600 + #1F2937 dark
//       (readable like navbar BAKABAR/BALAPOR), active boost ke 700 purple
//     - Active state: bg purple 10% + inset shadow + bold + color
//     - Container white bg + border-top separator dari navbar
//     - Scroll fade indicator right edge (hint ada items lain)
//     - Topik dropdown dengan icon 🏷️ (visual differentiation)
//     - Container max-w-4xl (align content area BAKABAR)
//     - Font text-sm (14px) untuk readability comfort
//     - URL state Hybrid: write ?nav=, read ?nav OR legacy ?type/?location
//     - Hardcoded colors (#5B21B6, #8B5CF6) BUKAN CSS vars karena
//       --color-bakabar-strong di dark mode = #DDD6FE (near-white).
//       VerticalNav design untuk LIGHT BG context, hardcode safer.
//       (Pattern UU lessons learned: verify CSS var dark mode value)
//     - Default landing = 'terbaru' (no filter, semua published tampil)
//       BUG FIX: 'nasional' default bikin backend filter strict.
//       Trade-off: landing no item highlighted (acceptable).
//
// File kept as CategoryTabs.tsx (no rename) — single consumer
// (src/app/(public)/layout.tsx) tidak butuh touch.
// ════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, Suspense } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';

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

// ─── 12 Topik (preserved dari sebelumnya) ──────────────────────
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

const NAVBAR_OFFSET = 100; // ticker(36) + navbar-top(44~52) + navbar-height(52) - spacer(36) ≈ 100px
const NEAR_END      = 70;  // % scroll untuk reveal sticky

// ─── URL state hybrid parser ─────────────────────────────────
// PRIORITY 1: ?nav=     (new, written by VerticalNav)
// PRIORITY 2: ?type=    (legacy: nasional/viral/terbaru)
// PRIORITY 3: ?location= (legacy: 11 daerah slug)
// Default: 'nasional' (clear default untuk landing user)
function parseCurrentNav(params: URLSearchParams): string {
  const nav = params.get('nav');
  if (nav) return nav;
  const type = params.get('type');
  if (type && type !== 'terbaru') return type;
  const location = params.get('location');
  if (location && location !== 'all') return location;
  // BUG FIX (V4.3): Default 'nasional' bikin backend filter strict
  // (category=nasional OR source=rss) → hanya 1-2 article tampil.
  // Revert ke 'terbaru' = no filter = semua published article tampil.
  // Trade-off: landing no item highlighted (acceptable untuk UX).
  return 'terbaru';
}

function CategoryTabsInner() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [visible,        setVisible]        = useState(true);
  const [lastScrollY,    setLastScrollY]    = useState(0);
  const [atTop,          setAtTop]          = useState(true);
  const [topicOpen,      setTopicOpen]      = useState(false);
  const [showRightFade,  setShowRightFade]  = useState(true);

  // Scroll container ref untuk fade indicator
  const scrollRef = useRef<HTMLDivElement>(null);

  // 14 Mei 2026 — Sprint 2A Batch 1: route migration /news → /bakabar
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
      // Show fade kalau masih bisa scroll ke kanan (ada items hidden)
      const canScrollRight = el.scrollWidth - el.scrollLeft - el.clientWidth > 4;
      setShowRightFade(canScrollRight);
    }

    checkFade(); // initial
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

  // ── Scroll-aware (context-aware) sticky behavior ─────────
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
  function navigate(nav: string, topic: string = currentTopic) {
    const p = new URLSearchParams();
    // Default 'terbaru' = no nav param di URL (cleaner /bakabar)
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
        transform: visible ? 'translateY(0)' : `translateY(calc(-100% - ${NAVBAR_OFFSET}px))`,
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: atTop ? 'none' : '0 2px 16px rgba(0,0,0,0.06)',
      }}
    >
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="relative flex items-center">

          {/* ── 13 nav items horizontal scroll ── */}
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
                    // ✏️ Typography baseline: SEMUA items semibold (600) 
                    // untuk readability comfort. Active boost ke bold (700).
                    // Mengikuti pattern navbar TeraLoka (BAKABAR/BALAPOR dll
                    // semua bold walau "non-active" — clearly readable).
                    fontWeight: active ? 700 : 600,
                    // Color: SEMUA items dark gray (#1F2937 gray-800) untuk
                    // contrast tinggi di bg white. Active = purple strong.
                    color: active ? '#5B21B6' : '#1F2937',
                    // Active bg: rgba inline karena --color-bakabar-muted (#FAF5FF)
                    // terlalu pucat untuk visible. 10% opacity = clearly differ.
                    background: active ? 'rgba(139, 92, 246, 0.10)' : 'transparent',
                    borderRadius: 999,
                    // Inset shadow untuk depth (active state lebih solid)
                    boxShadow: active
                      ? 'inset 0 0 0 1px rgba(139, 92, 246, 0.25)'
                      : 'none',
                    border: 'none',
                    cursor: 'pointer',
                    // Letter spacing untuk readability comfort
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

          {/* ── Scroll fade indicator (right edge) ── */}
          {/* Cue user "ada items lain, geser ke kanan" */}
          {showRightFade && (
            <div
              style={{
                position: 'absolute',
                right: 92, // breathing space sebelum Topik divider
                top: 0,
                bottom: 0,
                width: 28,
                background: 'linear-gradient(to right, transparent, #ffffff 70%)',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
          )}

          {/* ── Topik dropdown pinned right ── */}
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
                // Typography baseline same as nav items (600, boost ke 700 active)
                fontWeight: currentTopic ? 700 : 600,
                color: currentTopic ? '#ffffff' : '#1F2937',
                background: currentTopic
                  ? '#8B5CF6'
                  : '#ffffff',
                border: currentTopic
                  ? 'none'
                  : '0.5px solid #D1D5DB',
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

        {/* ── Nasional mode helper text (preserved) ── */}
        {currentNav === 'nasional' && (
          <div className="px-1 pt-2">
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ background: '#8B5CF6' }}
              />
              Berita nasional yang dikurasi tim TeraLoka — relevan dengan Maluku Utara
            </p>
          </div>
        )}
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
