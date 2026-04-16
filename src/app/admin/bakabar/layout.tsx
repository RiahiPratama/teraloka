'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { AdminThemeContext, DARK_THEME, LIGHT_THEME } from '@/components/admin/AdminThemeContext';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

interface Stats {
  articles: { total: number; draft: number };
  reports:  { total: number; pending: number };
}

// ── Nav item types ────────────────────────────────────────────────
interface NavChild {
  href: string;
  label: string;
  icon: string;
  badgeKey?: keyof Stats | null;
  badgePath?: string; // e.g. 'reports.pending'
}
interface NavItem {
  href: string;
  label: string;
  icon: string;
  badgePath?: string;
  children?: NavChild[];
  exact?: boolean;
}
interface NavSection {
  section: string;
  sectionIcon: string;
  items: NavItem[];
}

const buildNav = (): NavSection[] => [
  {
    section: 'Teraft HUB',
    sectionIcon: '📰',
    items: [
      {
        href: '/admin/bakabar/hub',
        label: 'Draft',
        icon: '📝',
        badgePath: 'articles.draft',
        children: [
          { href: '/admin/bakabar/hub',                label: 'Draft',             icon: '📝', badgePath: 'articles.draft' },
          { href: '/admin/bakabar/hub?status=review',  label: 'Review',            icon: '🔍' },
          { href: '/admin/bakabar/hub?status=published',label: 'Publikasi',        icon: '✅' },
          { href: '/admin/bakabar/hub?status=archived', label: 'Archived',         icon: '🗂️' },
        ],
      },
    ],
  },
  {
    section: 'BALAPOR',
    sectionIcon: '🚨',
    items: [
      {
        href: '/admin/bakabar/reports',
        label: 'Semua Laporan',
        icon: '📋',
        badgePath: 'reports.pending',
        children: [
          { href: '/admin/bakabar/reports?priority=urgent', label: 'Urgent',     icon: '🔴' },
          { href: '/admin/bakabar/reports?priority=high',   label: 'High',       icon: '🟠' },
          { href: '/admin/bakabar/reports?status=pending',  label: 'Pending',    icon: '⏳', badgePath: 'reports.pending' },
          { href: '/admin/bakabar/reports?status=verified', label: 'In Review',  icon: '🔍' },
          { href: '/admin/bakabar/reports',                 label: 'All Reports', icon: '📋' },
        ],
      },
    ],
  },
  {
    section: 'Performance',
    sectionIcon: '📊',
    items: [
      { href: '/admin/analytics',          label: 'Artikel Trending', icon: '🔥' },
      { href: '/admin/analytics',          label: 'Engagement',       icon: '📊' },
      { href: '/admin/analytics',          label: 'CTR Notifikasi',   icon: '📈' },
    ],
  },
  {
    section: 'Tools',
    sectionIcon: '⚙️',
    items: [
      { href: '/admin/notifications', label: 'Push Notification', icon: '🔔' },
      { href: '/admin/notifications', label: 'WA Blast',          icon: '💬' },
      { href: '/admin/rss',           label: 'RSS Feed',          icon: '📡' },
      { href: '/admin/ticker',        label: 'Ticker',            icon: '📺' },
    ],
  },
];

function getBadge(stats: Stats | null, path?: string): number | null {
  if (!stats || !path) return null;
  const [section, key] = path.split('.') as [keyof Stats, string];
  const val = (stats[section] as any)?.[key];
  return typeof val === 'number' && val > 0 ? val : null;
}

export default function BakabarLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const [dark, setDark] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'Teraft HUB': true,
    'BALAPOR': false,
    'Performance': false,
    'Tools': false,
  });

  // Load theme
  useEffect(() => {
    const saved = localStorage.getItem('tl_admin_theme');
    setDark(saved !== 'light');
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('tl_admin_theme', next ? 'dark' : 'light');
  };

  // Auth guard
  useEffect(() => {
    if (!isLoading && !user) router.replace('/login?redirect=/admin/bakabar');
  }, [user, isLoading, router]);

  // Fetch badge counts
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;
    fetch(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.data); })
      .catch(() => {});
  }, [user]);

  const t = dark ? DARK_THEME : LIGHT_THEME;

  if (isLoading || !user) return (
    <div style={{ minHeight: '100vh', background: '#0D1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #1B6B4A', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const isActive = (href: string, exact?: boolean) => {
    const base = href.split('?')[0];
    return exact ? pathname === base : pathname === base || pathname.startsWith(base);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const NAV = buildNav();

  return (
    <AdminThemeContext.Provider value={{ dark, t }}>
      <div style={{ display: 'flex', minHeight: '100vh', background: t.mainBg, fontFamily: "'Outfit', system-ui, sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
          * { box-sizing: border-box; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #374151; border-radius: 2px; }
          .bk-nav-item:hover { background: ${t.navHover} !important; color: ${t.accent} !important; }
          @media (max-width: 768px) {
            .bk-sidebar { transform: translateX(-100%); }
            .bk-sidebar.open { transform: translateX(0); }
            .bk-main { margin-left: 0 !important; }
          }
        `}</style>

        {/* ── SIDEBAR ── */}
        <aside className="bk-sidebar" style={{
          width: 240, minHeight: '100vh',
          background: t.sidebar, borderRight: `1px solid ${t.sidebarBorder}`,
          display: 'flex', flexDirection: 'column',
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 40,
          overflowY: 'auto', transition: 'background 0.2s',
        }}>

          {/* ── Sidebar Header ── */}
          <div style={{ padding: '18px 16px 14px', borderBottom: `1px solid ${t.sidebarBorder}` }}>
            <Link href="/admin" style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10, color: t.textDim, textDecoration: 'none',
              marginBottom: 12, fontWeight: 600, letterSpacing: '0.05em',
              opacity: 0.7,
            }}>
              ← Super Admin
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: 'linear-gradient(135deg, #1B6B4A, #0891B2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 800, color: '#fff',
                boxShadow: '0 0 12px rgba(27,107,74,0.3)',
              }}>T</div>
              <div>
                <div style={{ color: t.textPrimary, fontWeight: 700, fontSize: 13, letterSpacing: '-0.2px' }}>
                  TeraLoka <span style={{ color: '#1B6B4A' }}>BAKABAR</span>
                </div>
                <div style={{ color: t.accentDim, fontSize: 9, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Admin Portal
                </div>
              </div>
            </div>
          </div>

          {/* ── Nav ── */}
          <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
            {NAV.map(section => {
              const isExpanded = expandedSections[section.section];
              const sectionHasBadge = section.items.some(item => {
                const b = getBadge(stats, item.badgePath);
                return b !== null && b > 0;
              });

              return (
                <div key={section.section} style={{ marginBottom: 6 }}>

                  {/* Section header — clickable untuk collapse */}
                  <div
                    onClick={() => toggleSection(section.section)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
                      marginBottom: 2, transition: 'all 0.15s',
                    }}
                    className="bk-nav-item"
                  >
                    <span style={{ fontSize: 12 }}>{section.sectionIcon}</span>
                    <span style={{
                      color: t.textDim, fontSize: 9.5, fontWeight: 700,
                      letterSpacing: '1px', textTransform: 'uppercase', flex: 1,
                    }}>
                      {section.section}
                    </span>
                    {sectionHasBadge && (
                      <span style={{
                        fontSize: 9, fontWeight: 800, padding: '1px 5px',
                        borderRadius: 99, background: '#EF4444', color: '#fff',
                      }}>●</span>
                    )}
                    <span style={{
                      fontSize: 9, color: t.textDim,
                      transform: isExpanded ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}>▼</span>
                  </div>

                  {/* Section items */}
                  {isExpanded && (
                    <div style={{ marginBottom: 8 }}>
                      {section.items.map(item => {
                        const hasChildren  = item.children && item.children.length > 0;
                        const active       = isActive(item.href, item.exact);
                        const badge        = getBadge(stats, item.badgePath);

                        // Item dengan children = expandable group
                        if (hasChildren) {
                          return (
                            <div key={item.href}>
                              {/* Group label */}
                              <Link href={item.href} style={{ textDecoration: 'none' }}>
                                <div
                                  className="bk-nav-item"
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '7px 10px', borderRadius: 8, marginBottom: 1,
                                    background: active ? t.navActive : 'transparent',
                                    borderLeft: `2px solid ${active ? t.accentDim : 'transparent'}`,
                                    color: active ? t.accent : t.textMuted,
                                    transition: 'all 0.15s', cursor: 'pointer',
                                  }}
                                >
                                  <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span>
                                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: active ? 700 : 500 }}>
                                    {item.label}
                                  </span>
                                  {badge !== null && (
                                    <span style={{
                                      fontSize: 10, fontWeight: 800, padding: '1px 6px',
                                      borderRadius: 99, background: '#EF4444', color: '#fff',
                                    }}>{badge}</span>
                                  )}
                                </div>
                              </Link>

                              {/* Children */}
                              <div style={{ marginLeft: 18, marginBottom: 4 }}>
                                {item.children!.map(child => {
                                  const childActive = pathname === child.href.split('?')[0] ||
                                    (child.href === item.href && pathname === item.href.split('?')[0]);
                                  const childBadge = getBadge(stats, child.badgePath);
                                  return (
                                    <Link key={child.href + child.label} href={child.href} style={{ textDecoration: 'none' }}>
                                      <div
                                        className="bk-nav-item"
                                        style={{
                                          display: 'flex', alignItems: 'center', gap: 7,
                                          padding: '5px 10px', borderRadius: 7, marginBottom: 1,
                                          background: childActive ? t.navActive : 'transparent',
                                          color: childActive ? t.accent : t.textDim,
                                          fontSize: 12, fontWeight: childActive ? 600 : 400,
                                          transition: 'all 0.15s', cursor: 'pointer',
                                        }}
                                      >
                                        <span style={{ fontSize: 11 }}>{child.icon}</span>
                                        <span style={{ flex: 1 }}>{child.label}</span>
                                        {childBadge !== null && (
                                          <span style={{
                                            fontSize: 9, fontWeight: 800, padding: '1px 5px',
                                            borderRadius: 99, background: '#EF4444', color: '#fff',
                                          }}>{childBadge}</span>
                                        )}
                                      </div>
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }

                        // Item biasa tanpa children
                        return (
                          <Link key={item.href + item.label} href={item.href} style={{ textDecoration: 'none' }}>
                            <div
                              className="bk-nav-item"
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '7px 10px', borderRadius: 8, marginBottom: 1,
                                background: isActive(item.href, item.exact) ? t.navActive : 'transparent',
                                borderLeft: `2px solid ${isActive(item.href, item.exact) ? t.accentDim : 'transparent'}`,
                                color: isActive(item.href, item.exact) ? t.accent : t.textMuted,
                                transition: 'all 0.15s',
                              }}
                            >
                              <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span>
                              <span style={{ flex: 1, fontSize: 12.5, fontWeight: isActive(item.href, item.exact) ? 600 : 400 }}>
                                {item.label}
                              </span>
                              {badge !== null && (
                                <span style={{
                                  fontSize: 10, fontWeight: 800, padding: '1px 6px',
                                  borderRadius: 99, background: '#F59E0B', color: '#fff',
                                }}>{badge}</span>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* ── User card ── */}
          <div style={{ padding: '12px', borderTop: `1px solid ${t.sidebarBorder}` }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '8px 10px', background: t.userCard, borderRadius: 10,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1B6B4A, #0891B2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {user.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: t.textPrimary, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name || 'Admin'}
                </div>
                <div style={{ color: t.accentDim, fontSize: 10, fontWeight: 500 }}>
                  {user.role === 'super_admin' ? 'Super Admin' : 'Admin Konten'}
                </div>
              </div>
              <button
                onClick={logout}
                title="Logout"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textDim, fontSize: 14, padding: 4 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                onMouseLeave={e => (e.currentTarget.style.color = t.textDim)}
              >⏻</button>
            </div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="bk-main" style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* Topbar */}
          <header style={{
            height: 56, background: t.topbar, borderBottom: `1px solid ${t.topbarBorder}`,
            display: 'flex', alignItems: 'center', padding: '0 20px',
            position: 'sticky', top: 0, zIndex: 30, gap: 10,
          }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 12, color: t.textMuted }}>
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            <Link href="/admin/bakabar/hub" style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px',
              background: dark ? '#1F2937' : '#F3F4F6',
              border: `1px solid ${dark ? '#374151' : '#E5E7EB'}`,
              borderRadius: 20, textDecoration: 'none',
              fontSize: 11.5, fontWeight: 600, color: t.textMuted,
            }}>
              📝 Drafts
              {stats?.articles.draft ? (
                <span style={{ fontSize: 10, fontWeight: 800, padding: '0 5px', borderRadius: 99, background: '#EF4444', color: '#fff' }}>
                  {stats.articles.draft}
                </span>
              ) : null}
            </Link>

            <button onClick={toggleTheme} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px',
              background: dark ? '#1F2937' : '#F3F4F6',
              border: `1px solid ${dark ? '#374151' : '#E5E7EB'}`,
              borderRadius: 20, cursor: 'pointer',
              fontSize: 11.5, fontWeight: 600, color: t.textMuted,
            }}>
              {dark ? '☀️' : '🌙'} {dark ? 'Terang' : 'Gelap'}
            </button>

            <div style={{
              padding: '4px 10px',
              background: dark ? 'rgba(27,107,74,0.12)' : 'rgba(27,107,74,0.08)',
              border: '1px solid rgba(27,107,74,0.25)',
              borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#1B6B4A',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              API Live
            </div>
          </header>

          <main style={{ flex: 1, padding: '20px', overflowX: 'hidden' }}>
            {children}
          </main>
        </div>
      </div>
    </AdminThemeContext.Provider>
  );
}
