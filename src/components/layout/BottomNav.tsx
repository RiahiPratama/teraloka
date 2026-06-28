'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Bike } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

// 14 Mei 2026 — Sprint 2A Batch 1: route migration /news → /bakabar
// Internal key 'news' tetap (mental model BAKABAR = berita, gak break activeKey logic)
// href + startsWith pakai /bakabar (URL public baru)
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
    href: '/bakabar',
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
    key: 'balaju',
    label: 'BALAJU',
    href: '/balaju/pesan',
    icon: (active: boolean) => (
      <Bike width={22} height={22} fill="none"
        stroke={active ? 'var(--primary)' : '#9CA3AF'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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
      router.push(`/cari?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  function isActive(key: string) {
    if (key === 'home') return pathname === '/'
    if (key === 'news') return pathname.startsWith('/bakabar')
    if (key === 'balaju') return pathname.startsWith('/balaju')
    if (key === 'akun') return pathname === '/profile' || pathname.startsWith('/profile/') || pathname === '/my-reports'
    return false
  }

  const akunHref = user ? '/profile' : '/login'

  // Insert items dengan slot kosong di tengah untuk tombol Cari
  const leftItems = NAV_ITEMS.slice(0, 2)   // Home, BAKABAR
  const rightItems = NAV_ITEMS.slice(2)     // BALAJU, Akun

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

            {/* Quick shortcuts — layanan TeraLoka */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'BALAPOR',  href: '/reports',              color: '#DC2626', bg: 'rgba(220,38,38,0.1)',  icon: 'm3 11 19-9-9 19-2-8-8-2z' },
                { label: 'BADONASI', href: '/fundraising/badonasi', color: '#EC4899', bg: 'rgba(236,72,153,0.1)', icon: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' },
                { label: 'BAKOS',    href: '/bakos',                color: '#D97706', bg: 'rgba(217,119,6,0.1)',  icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10' },
              ].map(s => (
                <Link key={s.href} href={s.href}
                  onClick={() => setSearchOpen(false)}
                  className="flex flex-col items-center justify-center gap-2 px-2 py-3 rounded-xl hover:bg-gray-50 transition-colors"
                  style={{ border: '1px solid var(--border-light)' }}>
                  <span className="flex items-center justify-center rounded-lg shrink-0"
                    style={{ width: 36, height: 36, background: s.bg }}>
                    <svg viewBox="0 0 24 24" width={20} height={20} fill="none"
                      stroke={s.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d={s.icon} />
                    </svg>
                  </span>
                  <span className="text-xs font-semibold text-gray-700">{s.label}</span>
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
