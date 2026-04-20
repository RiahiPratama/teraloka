'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import Logo from '@/components/ui/Logo';
import { useAuth } from '@/hooks/useAuth';

const NAV_LINKS = [
  { label: 'BAKABAR',   href: '/news' },
  { label: 'BALAPOR',   href: '/reports' },
  { label: 'BAPASIAR',  href: '/speed' },
  { label: 'BAKOS',     href: '/kos' },
  { label: 'BASUMBANG', href: '/fundraising' },
];

const PLACEHOLDERS = [
  'Cari berita di Ternate...',
  'Kos murah di Akehuda...',
  'Speedboat Ternate–Sidangoli...',
  'Laporan warga Tidore...',
  'Donasi bencana Maluku Utara...',
  'Jadwal kapal Ternate–Tobelo...',
];

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  super_admin:     { label: 'Super Admin',     color: '#fff',    bg: '#E8963A' },
  admin_content:   { label: 'Admin Konten',    color: '#fff',    bg: '#0891B2' },
  admin_transport: { label: 'Admin Transport', color: '#fff',    bg: '#6366F1' },
  admin_listing:   { label: 'Admin Listing',   color: '#fff',    bg: '#8B5CF6' },
  admin_funding:   { label: 'Admin Funding',   color: '#fff',    bg: '#1B6B4A' },
  user:            { label: 'Pengguna',        color: '#374151', bg: '#E5E7EB' },
};

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();

  // Handler buat nav link: kalau user klik link yang pathname-nya sama dengan
  // current URL, paksa clean query string (Next.js Link default ga reset query).
  // Fixes: /news?type=nasional&location=halsel klik BAKABAR → stuck di URL.
  function handleNavClick(e: React.MouseEvent, href: string, closeMenu?: () => void) {
    if (pathname === href) {
      e.preventDefault();
      router.replace(href);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    closeMenu?.();
  }

  const [dropdownOpen, setDropdownOpen]     = useState(false);
  const [searchOpen, setSearchOpen]         = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery]       = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  const dropdownRef    = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchWrapRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length), 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node))
        setSearchOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (e.key === '/' && !inInput) { e.preventDefault(); openSearch(); }
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(prev => { if (!prev) setTimeout(() => searchInputRef.current?.focus(), 50); return !prev; });
      }
      if (e.key === 'Escape') {
        setSearchOpen(false); setSearchQuery('');
        setDropdownOpen(false); setMobileMenuOpen(false);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 80);
  }, [searchOpen]);

  function openSearch() { setSearchOpen(true); setMobileMenuOpen(false); }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/news?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false); setSearchQuery('');
    }
  }

  function handleLogout() {
    logout(); setDropdownOpen(false); setMobileMenuOpen(false); router.push('/');
  }

  const isAdmin = user?.role === 'super_admin' || (user?.role ?? '').startsWith('admin_');
  const roleMeta = ROLE_META[user?.role ?? 'user'] ?? ROLE_META.user;

  return (
    <>
      {/* top-[44px] = ticker(36px) + gap(8px) mobile
          sm:top-[52px] = ticker(36px) + gap(16px) desktop
          z-[60] — di bawah ticker(z-70) tapi di atas konten */}
      <header className="fixed top-[44px] sm:top-[52px] left-0 right-0 z-[60] px-3 sm:px-6">
        <nav
          className="glass-nav max-w-[1200px] mx-auto flex items-center rounded-full px-3 sm:px-4 py-2 pr-2"
          style={{ border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(53,37,205,0.08)', gap: 6 }}
        >
          {/* Logo + Nav links */}
          <div className="flex items-center shrink-0"
            style={{
              maxWidth: searchOpen ? 0 : 600,
              overflow: 'hidden',
              opacity: searchOpen ? 0 : 1,
              transition: 'max-width 0.3s ease, opacity 0.2s ease',
              pointerEvents: searchOpen ? 'none' : 'auto',
            }}>
            <Link href="/" aria-label="TeraLoka Home" className="shrink-0">
              <Logo height={26} />
            </Link>
            <div className="hidden md:flex items-center gap-0.5 ml-5">
              {NAV_LINKS.map(link => (
                <Link key={link.href} href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold transition-all duration-200 whitespace-nowrap hover:bg-gray-100/80"
                  style={{ color: 'var(--text-muted)' }}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div ref={searchWrapRef} className="flex items-center"
            style={{ flex: searchOpen ? 1 : '0 0 auto', transition: 'flex 0.3s ease' }}>
            {searchOpen ? (
              <form onSubmit={handleSearch}
                className="flex items-center gap-2 w-full rounded-full px-3 sm:px-4 py-2"
                style={{ background: 'rgba(53,37,205,0.05)', border: '1.5px solid rgba(53,37,205,0.2)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input ref={searchInputRef} type="text" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={PLACEHOLDERS[placeholderIdx]}
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--text)', fontFamily: "'Plus Jakarta Sans', sans-serif", minWidth: 0 }} />
                <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                  className="shrink-0 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </form>
            ) : (
              <button onClick={openSearch}
                className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-full transition-all hover:bg-gray-100/80"
                title="Cari (/)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="var(--text-muted)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
              </button>
            )}
          </div>

          {/* Auth */}
          <div className="flex items-center gap-1.5 shrink-0"
            style={{ opacity: searchOpen ? 0 : 1, transition: 'opacity 0.2s ease', pointerEvents: searchOpen ? 'none' : 'auto' }}>
            {isLoading ? (
              <div className="h-8 w-16 animate-pulse rounded-full bg-gray-100" />
            ) : user ? (
              <>
                {/* Desktop dropdown */}
                <div className="relative hidden md:block" ref={dropdownRef}>
                  <button onClick={() => setDropdownOpen(v => !v)}
                    className="flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-semibold transition-all hover:bg-gray-100/70"
                    style={{ color: 'var(--text-muted)' }}>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1B6B4A] text-xs font-bold text-white shrink-0">
                      {user.name ? user.name[0].toUpperCase() : '+'}
                    </div>
                    <span className="hidden md:block max-w-[100px] truncate">
                      {user.name ?? '+' + user.phone?.slice(-4)}
                    </span>
                    <svg className={`h-3.5 w-3.5 transition-transform shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-gray-100 bg-white z-[999] overflow-hidden"
                      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
                      <div className="px-4 py-3 border-b border-gray-100"
                        style={{ background: 'linear-gradient(135deg, #f8fffe, #f0fdf9)' }}>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1B6B4A] text-sm font-bold text-white shrink-0">
                            {user.name ? user.name[0].toUpperCase() : '+'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate">{user.name ?? 'Pengguna'}</p>
                            <p className="text-[11px] text-gray-400 truncate mt-0.5">+{user.phone}</p>
                          </div>
                        </div>
                        <div className="mt-2.5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: roleMeta.bg, color: roleMeta.color }}>
                            {roleMeta.label}
                          </span>
                        </div>
                      </div>
                      <div className="py-1">
                        {[
                          { href: '/profile', icon: '👤', label: 'Profil Saya' },
                          { href: '/my-reports', icon: '📢', label: 'Laporan Saya' },
                          { href: '/owner', icon: '🏠', label: 'Portal Mitra' },
                          { href: '/owner/campaign/new/info', icon: '💚', label: 'Ajukan Campaign' },
                        ].map(item => (
                          <Link key={item.href} href={item.href} onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <span className="text-base">{item.icon}</span> {item.label}
                          </Link>
                        ))}
                        {isAdmin && (
                          <>
                            <div className="mx-3 my-1 border-t border-gray-100" />
                            <Link href="/admin" onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition-colors"
                              style={{ color: roleMeta.bg }}>
                              <span className="text-base">⚙️</span> Admin Dashboard
                            </Link>
                          </>
                        )}
                      </div>
                      <div className="border-t border-gray-100 py-1">
                        <button onClick={handleLogout}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                          <span className="text-base">🚪</span> Keluar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {/* Mobile avatar */}
                <button onClick={() => setMobileMenuOpen(v => !v)}
                  className="flex md:hidden h-8 w-8 items-center justify-center rounded-full bg-[#1B6B4A] text-xs font-bold text-white shrink-0">
                  {user.name ? user.name[0].toUpperCase() : '+'}
                </button>
              </>
            ) : (
              <>
                <Link href="/login"
                  className="hidden sm:inline-flex px-4 py-2 rounded-full text-[13px] font-semibold transition-all hover:bg-gray-100/70 whitespace-nowrap"
                  style={{ color: 'var(--text-muted)' }}>
                  Masuk
                </Link>
                <Link href="/login"
                  className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-[12px] sm:text-[13px] font-bold text-white active:scale-[0.96] whitespace-nowrap"
                  style={{ background: 'var(--primary)', boxShadow: '0 4px 16px rgba(0,53,38,0.25)' }}>
                  Daftar Gratis
                </Link>
              </>
            )}

            {/* Hamburger mobile */}
            <button
              onClick={() => setMobileMenuOpen(v => !v)}
              className="flex md:hidden flex-col items-center justify-center w-9 h-9 gap-1.5 rounded-full hover:bg-gray-100/80 transition-colors ml-1"
              aria-label="Menu"
            >
              <span className="block h-0.5 bg-gray-600 rounded transition-all duration-200" style={{ width: 18, transform: mobileMenuOpen ? 'rotate(45deg) translateY(6px)' : 'none' }} />
              <span className="block h-0.5 bg-gray-600 rounded transition-all duration-200" style={{ width: 18, opacity: mobileMenuOpen ? 0 : 1 }} />
              <span className="block h-0.5 bg-gray-600 rounded transition-all duration-200" style={{ width: 18, transform: mobileMenuOpen ? 'rotate(-45deg) translateY(-6px)' : 'none' }} />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[65] md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="absolute top-0 left-0 right-0 bg-white pb-8 px-6 rounded-b-3xl shadow-2xl"
            style={{ paddingTop: 'calc(44px + 60px + 16px)' }}
            onClick={e => e.stopPropagation()}>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {NAV_LINKS.map(link => (
                <Link key={link.href} href={link.href}
                  onClick={(e) => handleNavClick(e, link.href, () => setMobileMenuOpen(false))}
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl font-semibold text-sm transition-colors hover:bg-gray-50"
                  style={{ color: 'var(--text)', border: '1px solid var(--border-light)' }}>
                  {link.label}
                </Link>
              ))}
            </div>
            {user ? (
              <>
                <div className="border-t border-gray-100 pt-4 mb-3">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1B6B4A] font-bold text-white">
                      {user.name ? user.name[0].toUpperCase() : '+'}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{user.name ?? 'Pengguna'}</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5"
                        style={{ background: roleMeta.bg, color: roleMeta.color }}>
                        {roleMeta.label}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { href: '/profile', icon: '👤', label: 'Profil Saya' },
                      { href: '/my-reports', icon: '📢', label: 'Laporan Saya' },
                      { href: '/owner', icon: '🏠', label: 'Portal Mitra' },
                      { href: '/owner/campaign/new/info', icon: '💚', label: 'Ajukan Campaign' },
                    ].map(item => (
                      <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 border border-gray-100">
                        <span>{item.icon}</span> {item.label}
                      </Link>
                    ))}
                    {isAdmin && (
                      <Link href="/admin" onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold col-span-2 border"
                        style={{ color: roleMeta.bg, borderColor: roleMeta.bg, background: `${roleMeta.bg}15` }}>
                        <span>⚙️</span> Admin Dashboard
                      </Link>
                    )}
                  </div>
                </div>
                <button onClick={handleLogout}
                  className="w-full py-3 rounded-2xl text-sm font-semibold text-red-500 border border-red-100 hover:bg-red-50 transition-colors">
                  🚪 Keluar
                </button>
              </>
            ) : (
              <div className="flex gap-3">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold text-center border border-gray-200 hover:bg-gray-50"
                  style={{ color: 'var(--text-muted)' }}>
                  Masuk
                </Link>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold text-white text-center"
                  style={{ background: 'var(--primary)' }}>
                  Daftar Gratis
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
