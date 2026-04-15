'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

// Smart placeholders — terasa lokal & relevan
const PLACEHOLDERS = [
  'Cari berita di Ternate...',
  'Kos murah di Akehuda...',
  'Speedboat Ternate–Sidangoli...',
  'Laporan warga Tidore...',
  'Donasi bencana Maluku Utara...',
  'Jadwal kapal Ternate–Tobelo...',
  'Pungli di instansi pemerintah...',
];

export default function Navbar() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();

  const [dropdownOpen, setDropdownOpen]   = useState(false);
  const [searchOpen, setSearchOpen]       = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  const dropdownRef      = useRef<HTMLDivElement>(null);
  const searchInputRef   = useRef<HTMLInputElement>(null);
  const searchWrapRef    = useRef<HTMLDivElement>(null);

  // ── Rotate placeholder setiap 3 detik ────────────────────
  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length), 3000);
    return () => clearInterval(t);
  }, []);

  // ── Close dropdown & search on outside click ─────────────
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // "/" — focus search (hanya kalau tidak sedang di input lain)
      if (e.key === '/' && !inInput) {
        e.preventDefault();
        openSearch();
      }

      // ⌘K / Ctrl+K — toggle search
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(prev => {
          if (!prev) setTimeout(() => searchInputRef.current?.focus(), 50);
          return !prev;
        });
      }

      // Escape — tutup search
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // ── Auto-focus saat search terbuka ───────────────────────
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 80);
  }, [searchOpen]);

  function openSearch() {
    setSearchOpen(true);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/news?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  }

  function handleLogout() {
    logout();
    setDropdownOpen(false);
    router.push('/');
  }

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin_content';

  return (
    <header className="fixed top-8 left-0 right-0 z-50 px-6">
      <nav
        className="glass-nav max-w-[1200px] mx-auto flex items-center rounded-full px-4 py-2 pr-2"
        style={{ border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(53,37,205,0.08)', gap: 8 }}
      >

        {/* ── Logo + Nav links — tersembunyi saat search terbuka ── */}
        <div
          className="flex items-center shrink-0"
          style={{
            maxWidth: searchOpen ? 0 : 600,
            overflow: 'hidden',
            opacity: searchOpen ? 0 : 1,
            transition: 'max-width 0.3s ease, opacity 0.2s ease',
            pointerEvents: searchOpen ? 'none' : 'auto',
          }}
        >
          <Link href="/" aria-label="TeraLoka Home" className="shrink-0">
            <Logo height={26} />
          </Link>
          <div className="hidden md:flex items-center gap-0.5 ml-5">
            {NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href}
                className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold transition-all duration-200 whitespace-nowrap hover:bg-gray-100/80"
                style={{ color: 'var(--text-muted)' }}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Spacer ── */}
        <div className="flex-1" />

        {/* ── Search ── */}
        <div ref={searchWrapRef}
          className="flex items-center"
          style={{
            flex: searchOpen ? 1 : '0 0 auto',
            transition: 'flex 0.3s ease',
          }}
        >
          {searchOpen ? (
            // ── Expanded search bar ──────────────────────────────
            <form onSubmit={handleSearch}
              className="flex items-center gap-2 w-full rounded-full px-4 py-2"
              style={{ background: 'rgba(53,37,205,0.05)', border: '1.5px solid rgba(53,37,205,0.2)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={PLACEHOLDERS[placeholderIdx]}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--text)', fontFamily: "'Plus Jakarta Sans', sans-serif", minWidth: 0 }}
              />
              {/* Shortcut hint */}
              <kbd className="hidden sm:flex text-[10px] text-gray-400 font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200 shrink-0">
                ESC
              </kbd>
              {/* Close button */}
              <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded-full hover:bg-gray-100">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </form>
          ) : (
            // ── Search icon button ────────────────────────────────
            <button onClick={openSearch}
              className="group relative flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200 hover:bg-gray-100/80"
              title="Cari (/)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="var(--text-muted)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              {/* Keyboard hint — muncul saat hover di desktop */}
              <span className="hidden lg:block text-[10px] text-gray-300 font-mono opacity-0 group-hover:opacity-100 transition-opacity">/</span>
            </button>
          )}
        </div>

        {/* ── Auth section ── */}
        <div
          className="flex items-center gap-2 shrink-0"
          style={{
            opacity: searchOpen ? 0 : 1,
            maxWidth: searchOpen ? 0 : 300,
            overflow: 'hidden',
            transition: 'opacity 0.2s ease, max-width 0.3s ease',
            pointerEvents: searchOpen ? 'none' : 'auto',
          }}
        >
          {isLoading ? (
            <div className="h-8 w-20 animate-pulse rounded-full bg-gray-100" />
          ) : user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(v => !v)}
                className="flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-semibold transition-all hover:bg-gray-100/70"
                style={{ color: 'var(--text-muted)' }}
              >
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
                <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-gray-100 bg-white py-1 shadow-lg z-50">
                  <Link href="/profile" onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    👤 Profil Saya
                  </Link>
                  <Link href="/my-reports" onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    📢 Laporan Saya
                  </Link>
                  <Link href="/owner" onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    🏠 Portal Mitra
                  </Link>
                  <Link href="/owner/campaign/new/info" onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    💚 Ajukan Campaign
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      ⚙️ Admin Dashboard
                    </Link>
                  )}
                  <div className="my-1 border-t border-gray-100" />
                  <button onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50">
                    🚪 Keluar
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login"
                className="px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-200 hover:bg-gray-100/70 whitespace-nowrap"
                style={{ color: 'var(--text-muted)' }}>
                Masuk
              </Link>
              <Link href="/login"
                className="px-5 py-2.5 rounded-full text-[13px] font-bold text-white transition-all duration-200 active:scale-[0.96] whitespace-nowrap"
                style={{ background: 'var(--primary)', boxShadow: '0 4px 16px rgba(0,53,38,0.25)' }}
                onMouseEnter={e => {
                  const el = e.currentTarget
                  el.style.background = '#0891B2'
                  el.style.boxShadow = '0 6px 24px rgba(8,145,178,0.4)'
                  el.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget
                  el.style.background = 'var(--primary)'
                  el.style.boxShadow = '0 4px 16px rgba(0,53,38,0.25)'
                  el.style.transform = 'none'
                }}>
                Daftar Gratis
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
