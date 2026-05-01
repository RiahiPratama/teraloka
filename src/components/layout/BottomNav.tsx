'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

const NAV_ITEMS = [
  {
    key: 'home',
    label: 'Home',
    href: '/',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" width={22} height={22} fill={active ? 'var(--primary)' : 'none'}
        stroke={active ? 'var(--primary)' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    key: 'news',
    label: 'BAKABAR',
    href: '/news',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" width={22} height={22} fill="none"
        stroke={active ? 'var(--primary)' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
        <path d="M18 14h-8M15 18h-5M10 6h8v4h-8Z"/>
      </svg>
    ),
  },
  // Cari — special center button, ditangani terpisah
  {
    key: 'speed',
    label: 'BAPASIAR',
    href: '/speed',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" width={22} height={22} fill="none"
        stroke={active ? 'var(--primary)' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 16c3-3.5 7-5 12-4.5l7 1.5-1 5H2z"/>
        <path d="M2 16h20"/>
        <path d="M3 19.5c4.5-1 9-1 13 0"/>
      </svg>
    ),
  },
  {
    key: 'akun',
    label: 'Akun',
    href: '/profile',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" width={22} height={22} fill="none"
        stroke={active ? 'var(--primary)' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Close search on route change
  useEffect(() => { setSearchOpen(false); setSearchQuery('') }, [pathname])

  // Block body scroll saat search overlay terbuka
  useEffect(() => {
    document.body.style.overflow = searchOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [searchOpen])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/news?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  function isActive(key: string) {
    if (key === 'home') return pathname === '/'
    if (key === 'news') return pathname.startsWith('/news')
    if (key === 'speed') return pathname.startsWith('/speed') || pathname.startsWith('/ship') || pathname.startsWith('/ferry')
    if (key === 'akun') return pathname === '/profile' || pathname.startsWith('/profile/') || pathname === '/my-reports'
    return false
  }

  const akunHref = user ? '/profile' : '/login'

  // Insert items dengan slot kosong di tengah untuk tombol Cari
  const leftItems = NAV_ITEMS.slice(0, 2)   // Home, BAKABAR
  const rightItems = NAV_ITEMS.slice(2)     // BAPASIAR, Akun

  return (
    <>
      {/* ── Search Overlay ── */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[80] md:hidden"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white px-5 pt-5 pb-8"
            style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />

            <p className="text-base font-bold text-gray-800 mb-4">
              Cari di TeraLoka
            </p>

            <form onSubmit={handleSearch}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-4"
              style={{ background: 'var(--surface-low)', border: '1.5px solid var(--border-light)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                autoFocus
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Speedboat, kos, berita, donasi..."
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: 'var(--text)', fontFamily: 'inherit' }}
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-gray-600">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </form>

            {/* Quick shortcuts */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: '⛵', label: 'Speedboat Ternate', href: '/speed' },
                { icon: '🏠', label: 'Kos di Akehuda', href: '/kos?area=akehuda' },
                { icon: '📰', label: 'Berita Terkini', href: '/news' },
                { icon: '💚', label: 'Donasi Aktif', href: '/fundraising' },
              ].map(s => (
                <Link key={s.href} href={s.href}
                  onClick={() => setSearchOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  style={{ border: '1px solid var(--border-light)' }}>
                  <span className="text-base">{s.icon}</span>
                  <span className="truncate text-xs font-semibold">{s.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Navigation Bar ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        style={{
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--border-light)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.06)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex items-center justify-around px-2" style={{ height: 60 }}>

          {/* Left 2 items */}
          {leftItems.map(item => {
            const active = isActive(item.key)
            const href = item.key === 'akun' ? akunHref : item.href
            return (
              <Link key={item.key} href={href}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-opacity active:opacity-70"
              >
                {item.icon(active)}
                <span style={{
                  fontSize: 10, fontWeight: active ? 700 : 500,
                  color: active ? 'var(--primary)' : '#9CA3AF',
                  letterSpacing: '0.01em',
                }}>
                  {item.label}
                </span>
              </Link>
            )
          })}

          {/* CENTER — Cari (floating) */}
          <div className="flex flex-col items-center justify-center flex-1 h-full relative">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center rounded-full transition-all active:scale-95"
              style={{
                width: 52, height: 52,
                background: 'var(--primary)',
                boxShadow: '0 6px 24px rgba(0,53,38,0.35)',
                marginTop: -20, // angkat ke atas
              }}
              aria-label="Cari"
            >
              <svg viewBox="0 0 24 24" width={22} height={22} fill="none"
                stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
            </button>
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: '#9CA3AF', marginTop: 2,
              letterSpacing: '0.01em',
            }}>
              Cari
            </span>
          </div>

          {/* Right 2 items */}
          {rightItems.map(item => {
            const active = isActive(item.key)
            const href = item.key === 'akun' ? akunHref : item.href
            return (
              <Link key={item.key} href={href}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-opacity active:opacity-70"
              >
                {item.icon(active)}
                <span style={{
                  fontSize: 10, fontWeight: active ? 700 : 500,
                  color: active ? 'var(--primary)' : '#9CA3AF',
                  letterSpacing: '0.01em',
                }}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
