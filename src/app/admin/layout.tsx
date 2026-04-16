'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminThemeContext, DARK_THEME, LIGHT_THEME } from '@/components/admin/AdminThemeContext';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

const BAKABAR_CHILDREN = [
  { href: '/admin/bakabar-command',              label: 'Command Center', icon: '📊', primary: true },
  { href: '/admin/bakabar/hub',                  label: 'Editor Hub',     icon: '📰' },
  { href: '/admin/bakabar/hub',                  label: 'Draft',          icon: '📝', badgeKey: 'draft' },
  { href: '/admin/bakabar/hub?status=review',    label: 'Review',         icon: '🔍' },
  { href: '/admin/bakabar/hub?status=published', label: 'Publikasi',      icon: '✅' },
  { href: '/admin/bakabar/hub?status=archived',  label: 'Archived',       icon: '🗂️' },
  { href: '/admin/rss',                          label: 'RSS Feed',       icon: '📡' },
];

const NAV_SECTIONS = [
  {
    label: 'Utama',
    items: [
      { href: '/admin',          label: 'Overview',   icon: '⚡', exact: true, roles: ['super_admin'] },
      // BAKABAR dropdown dihandle terpisah setelah Overview
      { href: '/admin/reports',  label: 'BALAPOR',    sub: 'Laporan warga',      icon: '🚨', roles: ['super_admin'] },
      { href: '/admin/funding',  label: 'BASUMBANG',  sub: 'Kampanye donasi',    icon: '❤️', roles: ['super_admin'] },
      { href: '/admin/listings', label: 'Listing',    sub: 'Kos, Properti, dll', icon: '🏠', roles: ['super_admin'] },
      { href: '/admin/users',    label: 'Users',      sub: 'Manajemen akun',     icon: '👥', roles: ['super_admin'] },
    ],
  },
  {
    label: 'Operasional',
    items: [
      { href: '/admin/transport',     label: 'Transport',  sub: 'Kapal & Speed',   icon: '🚢', roles: ['super_admin'] },
      { href: '/admin/ticker',        label: 'Ticker',     sub: 'Running text',     icon: '📡', roles: ['super_admin'] },
      { href: '/admin/notifications', label: 'Notifikasi', sub: 'Push & WA blast', icon: '🔔', roles: ['super_admin'] },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/admin/analytics',     label: 'Analytics',     sub: 'Trafik & engagement', icon: '📊', roles: ['super_admin'] },
      { href: '/admin/financial',     label: 'Finansial',     sub: 'Revenue & transaksi', icon: '💰', roles: ['super_admin'] },
      { href: '/admin/ads',           label: 'Ads',           sub: 'Iklan & performa',    icon: '📢', roles: ['super_admin'] },
      { href: '/admin/system-health', label: 'System Health', sub: 'Server & API',        icon: '🔧', roles: ['super_admin'] },
      { href: '/admin/trust-safety',  label: 'Trust & Safety',sub: 'Fraud & abuse',       icon: '🛡️', roles: ['super_admin'] },
    ],
  },
];

const ROLE_LABEL: Record<string, string> = {
  super_admin:    'Super Admin',
  admin_content:  'Admin Konten',
  admin_transport:'Admin Transport',
  admin_listing:  'Admin Listing',
  admin_funding:  'Admin Funding',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [dark, setDark]                 = useState(true);
  const [bakabarOpen, setBakabarOpen]   = useState(false);
  const [articleDraft, setArticleDraft] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('tl_admin_theme');
    if (saved === 'light') setDark(false);
  }, []);

  useEffect(() => {
    // Auto-expand BAKABAR dropdown kalau sedang di halaman terkait
    if (pathname.startsWith('/admin/bakabar') || pathname.startsWith('/admin/rss') || pathname === '/admin/bakabar-command') {
      setBakabarOpen(true);
    }
  }, [pathname]);

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login?redirect=/admin');
    if (!isLoading && user && user.role === 'admin_content') {
      if (!pathname.startsWith('/admin/bakabar') && !pathname.startsWith('/admin/rss')) {
        router.replace('/admin/bakabar');
      }
    }
  }, [user, isLoading, router, pathname]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;
    fetch(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setArticleDraft(d.data.articles?.draft ?? 0); })
      .catch(() => {});
  }, [user]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('tl_admin_theme', next ? 'dark' : 'light');
  };

  const t = dark ? DARK_THEME : LIGHT_THEME;

  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: '#0D1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid #1B6B4A', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#6B7280', fontFamily: 'system-ui', fontSize: 14 }}>Memuat Admin Portal...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!user) return null;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const isBakabarActive = pathname === '/admin/bakabar-command' ||
    pathname.startsWith('/admin/bakabar/') ||
    pathname === '/admin/bakabar' ||
    pathname.startsWith('/admin/rss');

  // BAKABAR portal (/admin/bakabar/*) punya layout sendiri — pass-through
  // /admin/bakabar-command tetap pakai admin layout (bukan bakabar portal)
  const isBakabarPortalRoute = pathname === '/admin/bakabar' ||
    pathname.startsWith('/admin/bakabar/');

  return (
    <AdminThemeContext.Provider value={{ dark, t }}>
      {isBakabarPortalRoute ? (
        <>{children}</>
      ) : (
        <div style={{ display: 'flex', minHeight: '100vh', background: t.mainBg, fontFamily: "'Outfit', system-ui, sans-serif", transition: 'background 0.2s' }}>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
            * { box-sizing: border-box; }
            ::-webkit-scrollbar { width: 4px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: #374151; border-radius: 2px; }
            .tl-nav-hover:hover { background: ${t.navHover} !important; color: ${t.accent} !important; }
            @media (max-width: 768px) {
              .tl-sidebar { transform: translateX(-100%); transition: transform 0.25s ease; }
              .tl-sidebar.open { transform: translateX(0); }
              .tl-main { margin-left: 0 !important; }
              .tl-hamburger { display: flex !important; }
            }
          `}</style>

          {sidebarOpen && (
            <div onClick={() => setSidebarOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 39 }} />
          )}

          {/* ── SIDEBAR ── */}
          <aside className={`tl-sidebar ${sidebarOpen ? 'open' : ''}`}
            style={{ width: 256, minHeight: '100vh', background: t.sidebar, borderRight: `1px solid ${t.sidebarBorder}`, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 40, overflowY: 'auto', transition: 'background 0.2s' }}>

            {/* Brand */}
            <div style={{ padding: '22px 18px 18px', borderBottom: `1px solid ${t.sidebarBorder}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #1B6B4A, #0891B2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', boxShadow: '0 0 16px rgba(27,107,74,0.35)' }}>T</div>
                <div>
                  <div style={{ color: t.textPrimary, fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px' }}>TeraLoka</div>
                  <div style={{ color: t.accentDim, fontSize: 10, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Super Admin</div>
                </div>
              </div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '14px 10px', overflowY: 'auto' }}>
              {NAV_SECTIONS
                .filter(s => s.items.some(i => !i.roles?.length || i.roles.includes(user.role || '')))
                .map(section => (
                  <div key={section.label} style={{ marginBottom: 20 }}>
                    <div style={{ color: t.textDim, fontSize: 9.5, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', padding: '0 8px', marginBottom: 4 }}>
                      {section.label}
                    </div>

                    {section.items
                      .filter(i => !i.roles?.length || i.roles.includes(user.role || ''))
                      .map((item, idx) => {
                        const active = isActive(item.href, item.exact);
                        return (
                          <div key={item.href}>
                            <Link href={item.href} onClick={() => setSidebarOpen(false)}
                              className="tl-nav-hover"
                              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, marginBottom: 1, textDecoration: 'none', background: active ? t.navActive : 'transparent', borderLeft: `2px solid ${active ? t.accentDim : 'transparent'}`, color: active ? t.accent : t.textMuted, transition: 'all 0.15s' }}>
                              <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{item.icon}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12.5, fontWeight: active ? 600 : 400, lineHeight: 1.2 }}>{item.label}</div>
                                {item.sub && <div style={{ fontSize: 10.5, color: t.textDim, marginTop: 1 }}>{item.sub}</div>}
                              </div>
                              {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: t.accentDim, flexShrink: 0 }} />}
                            </Link>

                            {/* BAKABAR dropdown — inject setelah Overview (idx === 0, section Utama) */}
                            {section.label === 'Utama' && idx === 0 && (
                              <div style={{ marginBottom: 1 }}>
                                {/* Toggle BAKABAR */}
                                <div
                                  onClick={() => setBakabarOpen(o => !o)}
                                  className="tl-nav-hover"
                                  style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, marginBottom: 1, cursor: 'pointer', background: isBakabarActive ? t.navActive : 'transparent', borderLeft: `2px solid ${isBakabarActive ? t.accentDim : 'transparent'}`, color: isBakabarActive ? t.accent : t.textMuted, transition: 'all 0.15s' }}>
                                  <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>📰</span>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12.5, fontWeight: isBakabarActive ? 600 : 400, lineHeight: 1.2 }}>BAKABAR</div>
                                    <div style={{ fontSize: 10.5, color: t.textDim, marginTop: 1 }}>Portal berita lokal</div>
                                  </div>
                                  {articleDraft > 0 && (
                                    <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 99, background: '#EF4444', color: '#fff', marginRight: 4 }}>{articleDraft}</span>
                                  )}
                                  <span style={{ fontSize: 10, color: t.textDim, flexShrink: 0, transform: bakabarOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                                </div>

                                {/* BAKABAR children */}
                                {bakabarOpen && (
                                  <div style={{ marginLeft: 16, marginBottom: 4 }}>
                                    {BAKABAR_CHILDREN.map(child => {
                                      const childActive = pathname === child.href.split('?')[0] ||
                                        (child.href === '/admin/bakabar-command' && pathname === '/admin/bakabar-command') ||
                                        (child.href === '/admin/rss' && pathname.startsWith('/admin/rss'));
                                      const badge = child.badgeKey === 'draft' ? articleDraft : null;
                                      return (
                                        <Link key={child.href + child.label} href={child.href} onClick={() => setSidebarOpen(false)} style={{ textDecoration: 'none' }}>
                                          <div
                                            className="tl-nav-hover"
                                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: child.primary ? '7px 10px' : '5px 10px', borderRadius: 8, marginBottom: 1, background: childActive ? t.navActive : 'transparent', color: childActive ? t.accent : t.textDim, fontSize: child.primary ? 12.5 : 12, fontWeight: child.primary ? 700 : (childActive ? 600 : 400), transition: 'all 0.15s', cursor: 'pointer' }}>
                                            <span style={{ fontSize: child.primary ? 14 : 12 }}>{child.icon}</span>
                                            <span style={{ flex: 1 }}>{child.label}</span>
                                            {badge !== null && badge > 0 && (
                                              <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 99, background: '#EF4444', color: '#fff' }}>{badge}</span>
                                            )}
                                          </div>
                                        </Link>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ))}
            </nav>

            {/* User card */}
            <div style={{ padding: '14px', borderTop: `1px solid ${t.sidebarBorder}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', background: t.userCard, borderRadius: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #1B6B4A, #0891B2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {user.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: t.textPrimary, fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || 'Admin'}</div>
                  <div style={{ color: t.accentDim, fontSize: 10.5, fontWeight: 500 }}>{ROLE_LABEL[user.role || ''] || user.role}</div>
                </div>
                <button onClick={logout} title="Logout"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textDim, fontSize: 15, padding: 4, borderRadius: 6 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = t.textDim)}>⏻</button>
              </div>
            </div>
          </aside>

          {/* ── MAIN ── */}
          <div className="tl-main" style={{ marginLeft: 256, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <header style={{ height: 58, background: t.topbar, borderBottom: `1px solid ${t.topbarBorder}`, display: 'flex', alignItems: 'center', padding: '0 20px', position: 'sticky', top: 0, zIndex: 30, gap: 10 }}>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="tl-hamburger"
                style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', fontSize: 19, color: t.textMuted, padding: 4, alignItems: 'center', justifyContent: 'center' }}>☰</button>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12, color: t.textMuted }}>
                  {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <button onClick={toggleTheme}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: dark ? '#1F2937' : '#F3F4F6', border: `1px solid ${dark ? '#374151' : '#E5E7EB'}`, borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: t.textMuted }}>
                <span style={{ fontSize: 14 }}>{dark ? '☀️' : '🌙'}</span>
                <span>{dark ? 'Terang' : 'Gelap'}</span>
              </button>
              <div style={{ padding: '4px 10px', background: dark ? 'rgba(27,107,74,0.12)' : 'rgba(27,107,74,0.08)', border: '1px solid rgba(27,107,74,0.25)', borderRadius: 20, fontSize: 11.5, fontWeight: 600, color: '#1B6B4A', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                API Live
              </div>
            </header>
            <main style={{ flex: 1, padding: '20px', overflowX: 'hidden' }}>
              {children}
            </main>
          </div>
        </div>
      )}
    </AdminThemeContext.Provider>
  );
}
