'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// roles: kosong = semua admin, diisi = hanya role tersebut
const NAV_SECTIONS = [
  {
    label: 'Utama',
    items: [
      { href: '/admin', label: 'Overview', icon: '⚡', exact: true, roles: ['super_admin'] },
      { href: '/admin/content', label: 'BAKABAR', sub: 'Artikel berita', icon: '📰', roles: [] },
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
      { href: '/admin/analytics', label: 'Analytics', sub: 'Trafik & engagement', icon: '📊', roles: ['super_admin'] },
      { href: '/admin/financial', label: 'Finansial', sub: 'Revenue & transaksi', icon: '💰', roles: ['super_admin'] },
      { href: '/admin/system-health', label: 'System Health', sub: 'Server & API', icon: '🔧', roles: ['super_admin'] },
      { href: '/admin/trust-safety', label: 'Trust & Safety', sub: 'Fraud & abuse', icon: '🛡️', roles: ['super_admin'] },
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

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login?redirect=/admin');
    }
    if (!isLoading && user && user.role !== 'super_admin') {
      // admin_content → ke /admin/content saja
      if (user.role === 'admin_content' && !pathname.startsWith('/admin/content')) {
        router.replace('/admin/content');
      }
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0D1117',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '3px solid #1B6B4A',
            borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#6B7280', fontFamily: 'system-ui', fontSize: 14 }}>
            Memuat Admin Portal...
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return null;

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F0F4F8', fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
        .nav-item { transition: all 0.15s ease; }
        .nav-item:hover { background: rgba(27, 107, 74, 0.12) !important; color: #4ADE80 !important; }
        .nav-item:hover .nav-sub { color: #9CA3AF !important; }
        .sidebar-overlay { display: none; }
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); transition: transform 0.25s ease; }
          .sidebar.open { transform: translateX(0); }
          .sidebar-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 39; }
          .main-area { margin-left: 0 !important; }
        }
      `}</style>

      {/* Sidebar Overlay Mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ── */}
      <aside
        className={`sidebar ${sidebarOpen ? 'open' : ''}`}
        style={{
          width: 260,
          minHeight: '100vh',
          background: '#0D1117',
          borderRight: '1px solid #1F2937',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          zIndex: 40,
          overflowY: 'auto',
        }}
      >
        {/* Logo */}
        <div style={{
          padding: '24px 20px 20px',
          borderBottom: '1px solid #1F2937',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36,
              background: 'linear-gradient(135deg, #1B6B4A, #0891B2)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 800, color: '#fff',
              boxShadow: '0 0 20px rgba(27,107,74,0.4)',
            }}>T</div>
            <div>
              <div style={{ color: '#F9FAFB', fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px' }}>
                TeraLoka
              </div>
              <div style={{ color: '#1B6B4A', fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Admin Portal
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          {NAV_SECTIONS.filter(section =>
            section.items.some(item => !item.roles?.length || item.roles.includes(user.role || ''))
          ).map((section) => (
            <div key={section.label} style={{ marginBottom: 24 }}>
              <div style={{
                color: '#4B5563',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                padding: '0 8px',
                marginBottom: 6,
              }}>
                {section.label}
              </div>
              {section.items.filter(item => !item.roles?.length || item.roles.includes(user.role || '')).map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className="nav-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 10px',
                      borderRadius: 8,
                      marginBottom: 2,
                      textDecoration: 'none',
                      background: active ? 'rgba(27, 107, 74, 0.15)' : 'transparent',
                      borderLeft: active ? '2px solid #1B6B4A' : '2px solid transparent',
                      color: active ? '#4ADE80' : '#9CA3AF',
                    }}
                  >
                    <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{item.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: active ? 600 : 400, lineHeight: 1.2 }}>
                        {item.label}
                      </div>
                      {item.sub && (
                        <div
                          className="nav-sub"
                          style={{ fontSize: 11, color: active ? '#6B7280' : '#4B5563', marginTop: 1 }}
                        >
                          {item.sub}
                        </div>
                      )}
                    </div>
                    {active && (
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: '#1B6B4A',
                        boxShadow: '0 0 6px #1B6B4A',
                        flexShrink: 0,
                      }} />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Profile */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid #1F2937',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px',
            background: '#111827',
            borderRadius: 10,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #1B6B4A, #0891B2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#fff',
              flexShrink: 0,
            }}>
              {user.name ? user.name.charAt(0).toUpperCase() : '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#F9FAFB', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name || 'Admin'}
              </div>
              <div style={{ color: '#1B6B4A', fontSize: 11, fontWeight: 500 }}>
                {ROLE_LABEL[user.role || ''] || user.role}
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#4B5563', fontSize: 16, padding: 4,
                borderRadius: 6, transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#4B5563')}
            >
              ⏻
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div
        className="main-area"
        style={{ marginLeft: 260, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}
      >
        {/* Top Bar */}
        <header style={{
          height: 60,
          background: '#fff',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          gap: 12,
        }}>
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              display: 'none',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 20, color: '#374151', padding: 4,
            }}
            className="mobile-menu-btn"
          >
            ☰
          </button>
          <style>{`.mobile-menu-btn { display: none; } @media (max-width: 768px) { .mobile-menu-btn { display: block !important; } }`}</style>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 400 }}>
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              padding: '4px 10px',
              background: 'rgba(27,107,74,0.08)',
              border: '1px solid rgba(27,107,74,0.2)',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              color: '#1B6B4A',
            }}>
              🟢 API Live
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: 24, overflowX: 'hidden' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
