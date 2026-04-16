'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { AdminThemeContext, DARK_THEME, LIGHT_THEME } from '@/components/admin/AdminThemeContext';

// ── Navigasi BAKABAR Portal ────────────────────────────────────────
const NAV = [
  {
    section: 'Teraft HUB',
    items: [
      {
        href: '/admin/bakabar/hub',
        label: 'Draft',
        icon: '📝',
        badge: null as number | null,
        children: [
          { href: '/admin/bakabar/hub?status=draft',     label: 'Draft',              icon: '📝', badge: null as number | null },
          { href: '/admin/bakabar/hub/push',             label: 'Push Notification',  icon: '🔔', badge: null as number | null },
          { href: '/admin/bakabar/hub/wa-blast',         label: 'WA Blast',           icon: '💬', badge: null as number | null },
          { href: '/admin/rss',                          label: 'RSS Feed',           icon: '📡', badge: null as number | null },
          { href: '/admin/ticker',                       label: 'Ticker',             icon: '📺', badge: null as number | null },
        ],
      },
      { href: '/admin/bakabar/hub?status=review',     label: 'Review',     icon: '🔍', badge: null as number | null },
      { href: '/admin/bakabar/hub?status=published',  label: 'Publikasi',  icon: '✅', badge: null as number | null },
      { href: '/admin/bakabar/hub?status=archived',   label: 'Archived',   icon: '🗂️', badge: null as number | null },
    ],
  },
  {
    section: 'Performance',
    items: [
      { href: '/admin/bakabar/trending',   label: 'Artikel Trending', icon: '🔥', badge: null as number | null },
      { href: '/admin/bakabar/engagement', label: 'Engagement',       icon: '📊', badge: null as number | null },
      { href: '/admin/analytics',          label: 'CTR Notifikasi',   icon: '📈', badge: null as number | null },
    ],
  },
  {
    section: 'Incident & Report',
    items: [
      { href: '/admin/reports',              label: 'BALAPOR',      icon: '🚨', badge: null as number | null },
      { href: '/admin/bakabar/user-reports', label: 'User Report',  icon: '👤', badge: 10 },
      { href: '/admin/bakabar/moderation',   label: 'Moderation',   icon: '🛡️', badge: null as number | null },
    ],
  },
];

export default function BakabarLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const ctx = useContext(AdminThemeContext);
  const [dark, setDark] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedHub, setExpandedHub] = useState(true); // Draft dropdown default open

  useEffect(() => {
    const saved = localStorage.getItem('tl_admin_theme');
    if (saved === 'light') setDark(false);
    else setDark(true);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('tl_admin_theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login?redirect=/admin/bakabar');
  }, [user, isLoading, router]);

  const t = dark ? DARK_THEME : LIGHT_THEME;

  if (isLoading || !user) return (
    <div style={{ minHeight: '100vh', background: '#0D1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #1B6B4A', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const isActive = (href: string) => pathname === href || pathname.startsWith(href.split('?')[0]);

  return (
    <AdminThemeContext.Provider value={{ dark, t }}>
      <div style={{ display: 'flex', minHeight: '100vh', background: t.mainBg, fontFamily: "'Outfit', system-ui, sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
          * { box-sizing: border-box; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #374151; border-radius: 2px; }
          @media (max-width: 768px) {
            .bk-sidebar { transform: translateX(-100%); transition: transform 0.25s ease; }
            .bk-sidebar.open { transform: translateX(0); }
            .bk-main { margin-left: 0 !important; }
          }
        `}</style>

        {sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 39 }} />
        )}

        {/* ── SIDEBAR ── */}
        <aside className={`bk-sidebar ${sidebarOpen ? 'open' : ''}`} style={{
          width: 240, minHeight: '100vh',
          background: t.sidebar, borderRight: `1px solid ${t.sidebarBorder}`,
          display: 'flex', flexDirection: 'column',
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 40,
          overflowY: 'auto',
        }}>

          {/* Header sidebar */}
          <div style={{ padding: '18px 16px 14px', borderBottom: `1px solid ${t.sidebarBorder}` }}>
            {/* Back to Super Admin */}
            <Link href="/admin" style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 10, color: t.textDim, textDecoration: 'none',
              marginBottom: 12, fontWeight: 600, letterSpacing: '0.05em',
            }}>
              ← Super Admin
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: 'linear-gradient(135deg, #1B6B4A, #0891B2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 800, color: '#fff',
              }}>T</div>
              <div>
                <div style={{ color: t.textPrimary, fontWeight: 700, fontSize: 13.5, letterSpacing: '-0.2px' }}>
                  TeraLoka <span style={{ color: '#1B6B4A' }}>BAKABAR</span>
                </div>
                <div style={{ color: t.accentDim, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  Admin Portal
                </div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
            {NAV.map(section => (
              <div key={section.section} style={{ marginBottom: 20 }}>
                <div style={{
                  color: t.textDim, fontSize: 9.5, fontWeight: 700,
                  letterSpacing: '1.2px', textTransform: 'uppercase',
                  padding: '0 8px', marginBottom: 4,
                }}>
                  {section.section}
                </div>

                {section.items.map(item => {
                  const hasChildren = item.children && item.children.length > 0;
                  const active = isActive(item.href);

                  return (
                    <div key={item.href}>
                      {/* Parent item */}
                      <div
                        onClick={() => {
                          if (hasChildren) setExpandedHub(e => !e);
                          else router.push(item.href);
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 9,
                          padding: '7px 10px', borderRadius: 8, marginBottom: 1,
                          cursor: 'pointer',
                          background: active && !hasChildren ? t.navActive : 'transparent',
                          borderLeft: `2px solid ${active && !hasChildren ? t.accentDim : 'transparent'}`,
                          color: active ? t.accent : t.textMuted,
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          ;(e.currentTarget as HTMLElement).style.background = t.navHover
                          ;(e.currentTarget as HTMLElement).style.color = t.accent
                        }}
                        onMouseLeave={e => {
                          ;(e.currentTarget as HTMLElement).style.background = active && !hasChildren ? t.navActive : 'transparent'
                          ;(e.currentTarget as HTMLElement).style.color = active ? t.accent : t.textMuted
                        }}
                      >
                        <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: active ? 600 : 400, lineHeight: 1.2 }}>
                            {item.label}
                          </div>
                        </div>
                        {item.badge != null && (
                          <span style={{
                            fontSize: 10, fontWeight: 800, padding: '1px 6px',
                            borderRadius: 99, background: '#EF4444', color: '#fff',
                          }}>{item.badge}</span>
                        )}
                        {hasChildren && (
                          <span style={{
                            fontSize: 10, color: t.textDim,
                            transform: expandedHub ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.2s',
                          }}>▼</span>
                        )}
                      </div>

                      {/* Children dropdown */}
                      {hasChildren && expandedHub && (
                        <div style={{ marginLeft: 16, marginBottom: 4 }}>
                          {item.children!.map(child => {
                            const childActive = pathname === child.href.split('?')[0] ||
                              (pathname === '/admin/bakabar/hub' && child.href.includes('draft'));
                            return (
                              <Link key={child.href} href={child.href} style={{ textDecoration: 'none' }}>
                                <div style={{
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  padding: '6px 10px', borderRadius: 7, marginBottom: 1,
                                  background: childActive ? t.navActive : 'transparent',
                                  color: childActive ? t.accent : t.textDim,
                                  fontSize: 12, fontWeight: childActive ? 600 : 400,
                                  transition: 'all 0.15s', cursor: 'pointer',
                                }}
                                  onMouseEnter={e => {
                                    ;(e.currentTarget as HTMLElement).style.background = t.navHover
                                    ;(e.currentTarget as HTMLElement).style.color = t.accent
                                  }}
                                  onMouseLeave={e => {
                                    ;(e.currentTarget as HTMLElement).style.background = childActive ? t.navActive : 'transparent'
                                    ;(e.currentTarget as HTMLElement).style.color = childActive ? t.accent : t.textDim
                                  }}
                                >
                                  <span style={{ fontSize: 12 }}>{child.icon}</span>
                                  {child.label}
                                  {child.badge != null && (
                                    <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 99, background: '#F59E0B', color: '#fff' }}>
                                      {child.badge}
                                    </span>
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
              </div>
            ))}
          </nav>

          {/* User card */}
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
              <button onClick={logout} title="Logout"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textDim, fontSize: 14, padding: 4 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                onMouseLeave={e => (e.currentTarget.style.color = t.textDim)}>⏻</button>
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

            {/* Drafts shortcut */}
            <Link href="/admin/bakabar/hub?status=draft" style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', background: dark ? '#1F2937' : '#F3F4F6',
              border: `1px solid ${dark ? '#374151' : '#E5E7EB'}`,
              borderRadius: 20, textDecoration: 'none',
              fontSize: 11.5, fontWeight: 600, color: t.textMuted,
            }}>
              📝 Drafts
            </Link>

            <button onClick={toggleTheme} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', background: dark ? '#1F2937' : '#F3F4F6',
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
