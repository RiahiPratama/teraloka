'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { AdminThemeContext, DARK_THEME, LIGHT_THEME } from '@/components/admin/AdminThemeContext';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

interface Stats {
  articles: { total: number; draft: number };
  reports:  { total: number; pending: number };
}

const NAV = [
  {
    section: 'Redaksi BAKABAR',
    sectionIcon: '📰',
    items: [
      { href: '/office/newsroom/bakabar/hub',                  label: 'Dashboard', icon: '📊' },
      { href: '/office/newsroom/bakabar/hub?status=draft',     label: 'Draft',     icon: '📝', badgePath: 'articles.draft' },
      { href: '/office/newsroom/bakabar/hub?status=review',    label: 'Review',    icon: '🔍' },
      { href: '/office/newsroom/bakabar/hub?status=published', label: 'Publikasi', icon: '✅' },
      { href: '/office/newsroom/bakabar/hub?status=archived',  label: 'Archived',  icon: '🗂️' },
      { href: '/admin/rss',                                    label: 'RSS Feed',  icon: '📡' },
    ],
  },
  {
    section: 'BALAPOR',
    sectionIcon: '🚨',
    items: [
      {
        href: '/office/newsroom/balapor',
        label: 'Semua Laporan',
        icon: '📋',
        badgePath: 'reports.pending',
        children: [
          { href: '/office/newsroom/balapor?status=pending',  label: 'Pending',    icon: '⏳', badgePath: 'reports.pending' },
          { href: '/office/newsroom/balapor?status=verified', label: 'In Review',  icon: '🔍' },
          { href: '/office/newsroom/balapor',                 label: 'All Reports',icon: '📋' },
        ],
      },
    ],
  },
  {
    section: 'Performance',
    sectionIcon: '📊',
    items: [
      { href: '/admin/analytics', label: 'Artikel Trending', icon: '🔥' },
      { href: '/admin/analytics', label: 'Engagement',       icon: '📊' },
      { href: '/admin/analytics', label: 'CTR Notifikasi',   icon: '📈' },
    ],
  },
  {
    section: 'Tools',
    sectionIcon: '⚙️',
    items: [
      { href: '/admin/notifications', label: 'Push Notification', icon: '🔔' },
      { href: '/admin/notifications', label: 'WA Blast',          icon: '💬' },
      { href: '/admin/ticker',        label: 'Ticker',            icon: '📺' },
    ],
  },
] as const;

function getBadge(stats: Stats | null, path?: string): number | null {
  if (!stats || !path) return null;
  const [section, key] = path.split('.');
  const val = (stats as any)[section]?.[key];
  return typeof val === 'number' && val > 0 ? val : null;
}

function OfficeBakabarLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router        = useRouter();
  const pathname      = usePathname();
  const searchParams  = useSearchParams();
  const currentStatus = searchParams?.get('status') ?? '';

  const [dark, setDark]   = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'Redaksi BAKABAR': true, 'BALAPOR': false, 'Performance': false, 'Tools': false,
  });

  useEffect(() => {
    setDark(localStorage.getItem('tl_admin_theme') !== 'light');
  }, []);

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login?redirect=/office/newsroom');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;
    fetch(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.data); })
      .catch(() => {});
  }, [user]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('tl_admin_theme', next ? 'dark' : 'light');
  };

  const t = dark ? DARK_THEME : LIGHT_THEME;

  if (isLoading || !user) return (
    <div style={{ minHeight: '100vh', background: '#0D1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #1B6B4A', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const isActive = (href: string): boolean => {
    const [hrefPath, hrefQuery] = href.split('?');
    const pathMatch = pathname === hrefPath || pathname.startsWith(hrefPath + '/');
    if (!pathMatch) return false;
    if (hrefQuery) {
      const hrefStatus = new URLSearchParams(hrefQuery).get('status') ?? '';
      return hrefStatus === currentStatus;
    }
    return currentStatus === '';
  };

  return (
    <AdminThemeContext.Provider value={{ dark, t }}>
      <div style={{ display: 'flex', minHeight: '100vh', background: t.mainBg, fontFamily: "'Outfit', system-ui, sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
          * { box-sizing: border-box; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #374151; border-radius: 2px; }
          .bk-item:hover { background: ${t.navHover} !important; color: ${t.accent} !important; }
        `}</style>

        {/* ── SIDEBAR ── */}
        <aside style={{
          width: 240, minHeight: '100vh',
          background: t.sidebar, borderRight: `1px solid ${t.sidebarBorder}`,
          display: 'flex', flexDirection: 'column',
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 40, overflowY: 'auto',
        }}>

          {/* Header */}
          <div style={{ padding: '18px 16px 14px', borderBottom: `1px solid ${t.sidebarBorder}` }}>
            <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: t.textDim, textDecoration: 'none', marginBottom: 12, fontWeight: 600, opacity: 0.7 }}>
              ← Super Admin
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, #1B6B4A, #0891B2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', boxShadow: '0 0 12px rgba(27,107,74,0.3)' }}>T</div>
              <div>
                <div style={{ color: t.textPrimary, fontWeight: 700, fontSize: 13 }}>
                  TeraLoka <span style={{ color: '#1B6B4A' }}>BAKABAR</span>
                </div>
                <div style={{ color: t.accentDim, fontSize: 9, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Office</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
            {NAV.map(section => {
              const isExpanded = expanded[section.section];
              return (
                <div key={section.section} style={{ marginBottom: 6 }}>
                  <div
                    onClick={() => setExpanded(e => ({ ...e, [section.section]: !e[section.section] }))}
                    className="bk-item"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 8, cursor: 'pointer', marginBottom: 2 }}
                  >
                    <span style={{ fontSize: 12 }}>{section.sectionIcon}</span>
                    <span style={{ color: t.textDim, fontSize: 9.5, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', flex: 1 }}>
                      {section.section}
                    </span>
                    <span style={{ fontSize: 9, color: t.textDim, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                  </div>

                  {isExpanded && (
                    <div style={{ marginBottom: 8 }}>
                      {section.items.map((item: any) => {
                        const hasChildren = item.children && item.children.length > 0;
                        const active = isActive(item.href);
                        const badge = getBadge(stats, item.badgePath);

                        if (hasChildren) {
                          return (
                            <div key={item.href}>
                              <Link href={item.href} style={{ textDecoration: 'none' }}>
                                <div className="bk-item" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, marginBottom: 1, background: active ? t.navActive : 'transparent', borderLeft: `2px solid ${active ? t.accentDim : 'transparent'}`, color: active ? t.accent : t.textMuted, transition: 'all 0.15s', cursor: 'pointer' }}>
                                  <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span>
                                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: active ? 700 : 500 }}>{item.label}</span>
                                  {badge !== null && <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 99, background: '#EF4444', color: '#fff' }}>{badge}</span>}
                                </div>
                              </Link>
                              <div style={{ marginLeft: 18, marginBottom: 4 }}>
                                {item.children.map((child: any) => {
                                  const cb = getBadge(stats, child.badgePath);
                                  const ca = isActive(child.href);
                                  return (
                                    <Link key={child.href + child.label} href={child.href} style={{ textDecoration: 'none' }}>
                                      <div className="bk-item" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px', borderRadius: 7, marginBottom: 1, background: ca ? t.navActive : 'transparent', color: ca ? t.accent : t.textDim, fontSize: 12, fontWeight: ca ? 600 : 400, transition: 'all 0.15s', cursor: 'pointer' }}>
                                        <span style={{ fontSize: 11 }}>{child.icon}</span>
                                        <span style={{ flex: 1 }}>{child.label}</span>
                                        {cb !== null && <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 99, background: '#EF4444', color: '#fff' }}>{cb}</span>}
                                      </div>
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <Link key={item.href + item.label} href={item.href} style={{ textDecoration: 'none' }}>
                            <div className="bk-item" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, marginBottom: 1, background: active ? t.navActive : 'transparent', borderLeft: `2px solid ${active ? t.accentDim : 'transparent'}`, color: active ? t.accent : t.textMuted, transition: 'all 0.15s', cursor: 'pointer' }}>
                              <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span>
                              <span style={{ flex: 1, fontSize: 12.5, fontWeight: active ? 600 : 400 }}>{item.label}</span>
                              {badge !== null && <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 99, background: '#F59E0B', color: '#fff' }}>{badge}</span>}
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

          {/* User card */}
          <div style={{ padding: '12px', borderTop: `1px solid ${t.sidebarBorder}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', background: t.userCard, borderRadius: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #1B6B4A, #0891B2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {user.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: t.textPrimary, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || 'Admin'}</div>
                <div style={{ color: t.accentDim, fontSize: 10 }}>{user.role === 'super_admin' ? 'Super Admin' : 'Admin Konten'}</div>
              </div>
              <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textDim, fontSize: 14 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                onMouseLeave={e => (e.currentTarget.style.color = t.textDim)}>⏻</button>
            </div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <header style={{ height: 56, background: t.topbar, borderBottom: `1px solid ${t.topbarBorder}`, display: 'flex', alignItems: 'center', padding: '0 20px', position: 'sticky', top: 0, zIndex: 30, gap: 10 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 12, color: t.textMuted }}>
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <button onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: dark ? '#1F2937' : '#F3F4F6', border: `1px solid ${dark ? '#374151' : '#E5E7EB'}`, borderRadius: 20, cursor: 'pointer', fontSize: 11.5, fontWeight: 600, color: t.textMuted }}>
              {dark ? '☀️' : '🌙'} {dark ? 'Terang' : 'Gelap'}
            </button>
            <div style={{ padding: '4px 10px', background: dark ? 'rgba(27,107,74,0.12)' : 'rgba(27,107,74,0.08)', border: '1px solid rgba(27,107,74,0.25)', borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#1B6B4A', display: 'flex', alignItems: 'center', gap: 5 }}>
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

export default function OfficeBakabarLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0D1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #1B6B4A', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <OfficeBakabarLayoutInner>{children}</OfficeBakabarLayoutInner>
    </Suspense>
  );
}
