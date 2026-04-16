'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const NAV_SECTIONS = [
  {
    label: 'Utama',
    items: [
      { href: '/admin', label: 'Overview', icon: '⚡', exact: true, roles: ['super_admin'] },
      { href: '/admin/content', label: 'BAKABAR', sub: 'Artikel berita', icon: '📰', roles: [] },
      { href: '/admin/rss', label: 'RSS Nasional', sub: 'Review & approve feed', icon: '📡', roles: [] },
      { href: '/admin/reports', label: 'BALAPOR', sub: 'Laporan warga', icon: '🚨', roles: ['super_admin'] },
      { href: '/admin/listings', label: 'Listing', sub: 'Kos, Properti, dll', icon: '🏠', roles: ['super_admin'] },
      { href: '/admin/funding', label: 'BASUMBANG', sub: 'Kampanye donasi', icon: '❤️', roles: ['super_admin'] },
      { href: '/admin/users', label: 'Users', sub: 'Manajemen akun', icon: '👥', roles: ['super_admin'] },
    ],
  },
  {
    label: 'Operasional',
    items: [
      { href: '/admin/transport', label: 'Transport', sub: 'Kapal & Speed', icon: '🚢', roles: ['super_admin'] },
      { href: '/admin/ticker', label: 'Ticker', sub: 'Running text', icon: '📡', roles: ['super_admin'] },
      { href: '/admin/notifications', label: 'Notifikasi', sub: 'Push & WA blast', icon: '🔔', roles: ['super_admin'] },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/admin/ads',         label: 'Iklan',        sub: 'Kelola & pantau iklan',  icon: '📢', roles: ['super_admin'] },
      { href: '/admin/financial',   label: 'Finansial',    sub: 'Revenue & transaksi',    icon: '💰', roles: ['super_admin'] },
      { href: '/admin/analytics',   label: 'Analytics',    sub: 'Trafik & engagement',    icon: '📊', roles: ['super_admin'] },
      { href: '/admin/system-health', label: 'System Health', sub: 'Server & API',        icon: '🔧', roles: ['super_admin'] },
      { href: '/admin/trust-safety',  label: 'Trust & Safety', sub: 'Fraud & abuse',      icon: '🛡️', roles: ['super_admin'] },
    ],
  },
];

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin_content: 'Admin Konten',
  admin_transport: 'Admin Transport',
  admin_listing: 'Admin Listing',
  admin_funding: 'Admin Funding',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('tl_admin_theme');
    if (saved === 'light') setDark(false);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('tl_admin_theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login?redirect=/admin');
    if (!isLoading && user && user.role === 'admin_content' && !pathname.startsWith('/admin/content') && !pathname.startsWith('/admin/rss')) {
      router.replace('/admin/content');
    }
  }, [user, isLoading, router, pathname]);

  const t = dark ? {
    bg: '#0D1117',
    sidebar: '#0D1117',
    sidebarBorder: '#1F2937',
    navActive: 'rgba(27,107,74,0.15)',
    navHover: 'rgba(27,107,74,0.1)',
    textPrimary: '#F9FAFB',
    textMuted: '#9CA3AF',
    textDim: '#4B5563',
    accent: '#4ADE80',
    accentDim: '#1B6B4A',
    topbar: '#111827',
    topbarBorder: '#1F2937',
    mainBg: '#0A0F1A',
    userCard: '#111827',
  } : {
    bg: '#F3F4F6',
    sidebar: '#FFFFFF',
    sidebarBorder: '#E5E7EB',
    navActive: 'rgba(0,53,38,0.08)',
    navHover: 'rgba(0,53,38,0.06)',
    textPrimary: '#111827',
    textMuted: '#6B7280',
    textDim: '#9CA3AF',
    accent: '#003526',
    accentDim: '#1B6B4A',
    topbar: '#FFFFFF',
    topbarBorder: '#E5E7EB',
    mainBg: '#F3F4F6',
    userCard: '#F9FAFB',
  };

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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: t.mainBg, fontFamily: "'Outfit', system-ui, sans-serif", transition: 'background 0.2s' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #374151; border-radius: 2px; }
        @media (max-width: 768px) {
          .tl-sidebar { transform: translateX(-100%); transition: transform 0.25s ease; }
          .tl-sidebar.open { transform: translateX(0); }
          .tl-main { margin-left: 0 !important; }
          .tl-hamburger { display: flex !important; }
        }
      `}</style>

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ display: 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 39 }}
          className="tl-sidebar-overlay"
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`tl-sidebar ${sidebarOpen ? 'open' : ''}`}
        style={{ width: 256, minHeight: '100vh', background: t.sidebar, borderRight: `1px solid ${t.sidebarBorder}`, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 40, overflowY: 'auto', transition: 'background 0.2s, border-color 0.2s' }}>

        {/* Logo */}
        <div style={{ padding: '22px 18px 18px', borderBottom: `1px solid ${t.sidebarBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #1B6B4A, #0891B2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', boxShadow: '0 0 16px rgba(27,107,74,0.35)' }}>T</div>
            <div>
              <div style={{ color: t.textPrimary, fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px', transition: 'color 0.2s' }}>TeraLoka</div>
              <div style={{ color: t.accentDim, fontSize: 10, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Admin Portal</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '14px 10px', overflowY: 'auto' }}>
          {NAV_SECTIONS.filter(s => s.items.some(i => !i.roles?.length || i.roles.includes(user.role || ''))).map(section => (
            <div key={section.label} style={{ marginBottom: 20 }}>
              <div style={{ color: t.textDim, fontSize: 9.5, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', padding: '0 8px', marginBottom: 4, transition: 'color 0.2s' }}>
                {section.label}
              </div>
              {section.items.filter(i => !i.roles?.length || i.roles.includes(user.role || '')).map(item => {
                const active = isActive(item.href, item.exact);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, marginBottom: 1, textDecoration: 'none', background: active ? t.navActive : 'transparent', borderLeft: `2px solid ${active ? t.accentDim : 'transparent'}`, color: active ? t.accent : t.textMuted, transition: 'all 0.15s' }}
                    onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = t.navHover; e.currentTarget.style.color = t.accent; } }}
                    onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textMuted; } }}
                  >
                    <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{item.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: active ? 600 : 400, lineHeight: 1.2 }}>{item.label}</div>
                      {item.sub && <div style={{ fontSize: 10.5, color: t.textDim, marginTop: 1, transition: 'color 0.2s' }}>{item.sub}</div>}
                    </div>
                    {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: t.accentDim, boxShadow: `0 0 5px ${t.accentDim}`, flexShrink: 0 }} />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '14px', borderTop: `1px solid ${t.sidebarBorder}`, transition: 'border-color 0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', background: t.userCard, borderRadius: 10, transition: 'background 0.2s' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #1B6B4A, #0891B2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {user.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: t.textPrimary, fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 0.2s' }}>{user.name || 'Admin'}</div>
              <div style={{ color: t.accentDim, fontSize: 10.5, fontWeight: 500 }}>{ROLE_LABEL[user.role || ''] || user.role}</div>
            </div>
            <button onClick={logout} title="Logout"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textDim, fontSize: 15, padding: 4, borderRadius: 6, transition: 'color 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = t.textDim)}>⏻</button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="tl-main" style={{ marginLeft: 256, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Top Bar */}
        <header style={{ height: 58, background: t.topbar, borderBottom: `1px solid ${t.topbarBorder}`, display: 'flex', alignItems: 'center', padding: '0 20px', position: 'sticky', top: 0, zIndex: 30, gap: 10, transition: 'background 0.2s, border-color 0.2s' }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="tl-hamburger"
            style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', fontSize: 19, color: t.textMuted, padding: 4, alignItems: 'center', justifyContent: 'center' }}>
            ☰
          </button>

          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, color: t.textMuted, fontWeight: 400, transition: 'color 0.2s' }}>
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={toggleTheme}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: dark ? '#1F2937' : '#F3F4F6', border: `1px solid ${dark ? '#374151' : '#E5E7EB'}`, borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: t.textMuted, transition: 'all 0.2s' }}
              title="Toggle mode terang/gelap">
              <span style={{ fontSize: 14 }}>{dark ? '☀️' : '🌙'}</span>
              <span>{dark ? 'Terang' : 'Gelap'}</span>
            </button>

            <div style={{ padding: '4px 10px', background: dark ? 'rgba(27,107,74,0.12)' : 'rgba(27,107,74,0.08)', border: `1px solid rgba(27,107,74,0.25)`, borderRadius: 20, fontSize: 11.5, fontWeight: 600, color: '#1B6B4A', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              API Live
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: '20px', overflowX: 'hidden', transition: 'background 0.2s' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
