'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import Logo from '@/components/ui/Logo';
import { useAuth } from '@/hooks/useAuth';

const NAV_LINKS = [
  { label: 'BAKABAR', href: '/news' },
  { label: 'BALAPOR', href: '/reports' },
  { label: 'BAPASIAR', href: '/speed' },
  { label: 'BAKOS', href: '/kos' },
  { label: 'BASUMBANG', href: '/fundraising' },
];

export default function Navbar() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Tutup dropdown kalau klik di luar
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    setDropdownOpen(false);
    router.push('/');
  }

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin_content';

  return (
    <header className="fixed top-8 left-0 right-0 z-50 px-6">
      <nav
        className="glass-nav max-w-[1200px] mx-auto flex items-center justify-between rounded-full px-6 py-2.5 pr-2.5"
        style={{
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(53,37,205,0.08)',
        }}
      >
        {/* Left: Logo + Links */}
        <div className="flex items-center">
          <Link href="/" aria-label="TeraLoka Home">
            <Logo height={26} />
          </Link>

          <div className="hidden md:flex items-center gap-1 ml-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-200 whitespace-nowrap"
                style={{ color: 'var(--text-muted)' }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Auth */}
        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="h-8 w-20 animate-pulse rounded-full bg-gray-100" />
          ) : user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(v => !v)}
                className="flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-semibold transition-all hover:bg-gray-100/70"
                style={{ color: 'var(--text-muted)' }}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1B6B4A] text-xs font-bold text-white">
                  {user.name ? user.name[0].toUpperCase() : '+'}
                </div>
                <span className="hidden md:block max-w-[100px] truncate">
                  {user.name ?? '+' + user.phone?.slice(-4)}
                </span>
                <svg className={`h-3.5 w-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-gray-100 bg-white py-1 shadow-lg">
                  <Link href="/owner" onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    🏠 Portal Mitra
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      ⚙️ Admin Dashboard
                    </Link>
                  )}
                  <Link href="/owner/campaign/new" onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    💚 Ajukan Campaign
                  </Link>
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
              <Link
                href="/login"
                className="px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-200 hover:bg-gray-100/70"
                style={{ color: 'var(--text-muted)' }}
              >
                Masuk
              </Link>
              <Link
                href="/login"
                className="px-5 py-2.5 rounded-full text-[13px] font-bold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'var(--primary)',
                  boxShadow: '0 4px 16px rgba(53,37,205,0.25)',
                }}
              >
                Daftar Gratis
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
