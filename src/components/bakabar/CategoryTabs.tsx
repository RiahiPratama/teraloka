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
import { usePathname, useRouter } from 'next/navigation';
import PrayerBreakingBar from '@/components/bakabar/PrayerBreakingBar';
import {
  Newspaper, Landmark, Wallet, HeartHandshake, Ship, Trophy,
  Stethoscope, GraduationCap, Drama, Cpu, Cloud, MessageSquare,
  Tag, Check, ChevronDown,
} from 'lucide-react';

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
  { key: 'berita',       label: 'Berita',       Icon: Newspaper },
  { key: 'politik',      label: 'Politik',      Icon: Landmark },
  { key: 'ekonomi',      label: 'Ekonomi',      Icon: Wallet },
  { key: 'sosial',       label: 'Sosial',       Icon: HeartHandshake },
  { key: 'transportasi', label: 'Transportasi', Icon: Ship },
  { key: 'olahraga',     label: 'Olahraga',     Icon: Trophy },
  { key: 'kesehatan',    label: 'Kesehatan',    Icon: Stethoscope },
  { key: 'pendidikan',   label: 'Pendidikan',   Icon: GraduationCap },
  { key: 'budaya',       label: 'Budaya',       Icon: Drama },
  { key: 'teknologi',    label: 'Teknologi',    Icon: Cpu },
  { key: 'cuaca',        label: 'Cuaca',        Icon: Cloud },
  { key: 'opini',        label: 'Opini',        Icon: MessageSquare },
];

// NAVBAR_OFFSET = 92 (29 Mei sore rev 3, tight no gap):
//   - Ticker top: 0-36px (fixed, spacer 36 in flow)
//   - BakabarHeader fixed top: 36, height 56 → ends at viewport y=92
//   - CategoryTabs sticky top: 92 (right below header, zero gap)
const NAVBAR_OFFSET = 92;

function CategoryTabsInner() {
  const pathname     = usePathname();
  const router       = useRouter();

  const [atTop,         setAtTop]         = useState(true);
  const [topicOpen,     setTopicOpen]     = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);

  const isHome     = pathname === '/bakabar';
  const isKanal    = pathname.startsWith('/bakabar/kanal/');
  const isKategori = pathname.startsWith('/bakabar/kategori/');
  const showTabs   = isHome || isKanal || isKategori;

  // Active state diturunkan dari URL path (bukan query lagi)
  const currentNav   = isKanal    ? (pathname.split('/')[3] || '') : '';
  const currentTopic = isKategori ? (pathname.split('/')[3] || '') : '';

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

  const setNav   = (n: string) => router.push(`/bakabar/kanal/${n}`);
  const setTopic = (tp: string) => {
    setTopicOpen(false);
    router.push(tp ? `/bakabar/kategori/${tp}` : '/bakabar');
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
      <div className="max-w-[1400px] mx-auto px-4 py-1">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '160px 20px minmax(0, 1000px) 20px 160px',
            justifyContent: 'center',
            alignItems: 'start',
          }}
        >
          {/* COL 1: empty (left sky-space) */}
          <div />
          {/* COL 2: gap */}
          <div />

          {/* COL 3: main content — sejajar Hero Banner */}
          <div className="min-w-0">

            {/* ── Row 1: 13 nav items + Topik dropdown ─────────────────────── */}
            <div className="relative flex items-center">

          <div
            ref={scrollRef}
            className="flex items-center flex-1 overflow-x-auto"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
              gap: 6,
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
                    color: active ? '#ffffff' : '#6D28D9',
                    background: active ? '#8B5CF6' : '#F5F3FF',
                    borderRadius: 999,
                    boxShadow: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    letterSpacing: 0.1,
                    transition: 'background 0.15s ease, color 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.background = '#EDE9FE';
                      e.currentTarget.style.color = '#5B21B6';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.background = '#F5F3FF';
                      e.currentTarget.style.color = '#6D28D9';
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
                padding: '9px 14px',
                fontSize: 14,
                fontWeight: currentTopic ? 700 : 600,
                color: currentTopic ? '#ffffff' : '#6D28D9',
                background: currentTopic ? '#8B5CF6' : '#F5F3FF',
                border: 'none',
                borderRadius: 999,
                cursor: 'pointer',
                letterSpacing: 0.1,
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
              onMouseEnter={e => {
                if (!currentTopic) {
                  e.currentTarget.style.background = '#EDE9FE';
                  e.currentTarget.style.color = '#5B21B6';
                }
              }}
              onMouseLeave={e => {
                if (!currentTopic) {
                  e.currentTarget.style.background = '#F5F3FF';
                  e.currentTarget.style.color = '#6D28D9';
                }
              }}
            >
              {currentTopic ? (
                <>
                  {(() => {
                    const t = TOPICS.find(x => x.key === currentTopic);
                    if (!t) return null;
                    const Icon = t.Icon;
                    return <Icon size={15} strokeWidth={2} />;
                  })()}
                  <span>{TOPICS.find(t => t.key === currentTopic)?.label}</span>
                </>
              ) : (
                <>
                  <Tag size={15} strokeWidth={2} />
                  <span>Topik</span>
                </>
              )}
              <ChevronDown
                size={14}
                strokeWidth={2.25}
                className="transition-transform"
                style={{
                  transform: topicOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  opacity: 0.7,
                }}
              />
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
                  <span className="w-4 inline-flex items-center justify-center">
                    {!currentTopic ? <Check size={14} strokeWidth={2.5} /> : null}
                  </span>
                  <span>Semua topik</span>
                </button>
                <div className="h-px" style={{ background: '#F3F4F6' }} />
                {TOPICS.map(t => {
                  const active = currentTopic === t.key;
                  const Icon = t.Icon;
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
                      <span className="w-4 inline-flex items-center justify-center">
                        {active
                          ? <Check size={14} strokeWidth={2.5} />
                          : <Icon size={14} strokeWidth={2} className="text-gray-500" />
                        }
                      </span>
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
          {/* COL 4: gap */}
          <div />
          {/* COL 5: empty (right sky-space) */}
          <div />
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
