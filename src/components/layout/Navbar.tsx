'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function Navbar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const isAdmin = user?.role === 'super_admin' || user?.role?.startsWith('admin_')

  function handleLogout() {
    logout()
    setMenuOpen(false)
    window.location.href = '/'
  }

  return (
    <nav className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" onClick={() => setMenuOpen(false)}>
          <span className="text-xl font-black">
            <span className="text-green-700">Tera</span>
            <span className="text-teal-500">Loka</span>
          </span>
        </Link>

        {/* Nav links — desktop */}
        <div className="hidden sm:flex items-center gap-4 text-sm">
          <Link href="/news"
            className={`font-medium transition-colors ${pathname.startsWith('/news') ? 'text-green-700' : 'text-gray-600 hover:text-gray-900'}`}>
            BAKABAR
          </Link>
          <Link href="/fundraising"
            className={`font-medium transition-colors ${pathname.startsWith('/fundraising') ? 'text-green-700' : 'text-gray-600 hover:text-gray-900'}`}>
            BASUMBANG
          </Link>
          <Link href="/kos"
            className={`font-medium transition-colors ${pathname.startsWith('/kos') ? 'text-green-700' : 'text-gray-600 hover:text-gray-900'}`}>
            BAKOS
          </Link>
          <Link href="/reports"
            className={`font-medium transition-colors ${pathname === '/reports' ? 'text-orange-600' : 'text-gray-600 hover:text-gray-900'}`}>
            BALAPOR
          </Link>
        </div>

        {/* Auth area */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {user.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <span className="max-w-20 truncate">{user.name?.split(' ')[0] || 'Profil'}</span>
                <svg className={`w-3.5 h-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden z-50">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-gray-50">
                    <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.phone}</p>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mt-1 inline-block">
                      {user.role?.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <Link href="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      <span>👤</span> Profil Saya
                    </Link>
                    <Link href="/my-reports"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      <span>📋</span> Laporan Saya
                    </Link>
                    {user.role === 'owner_listing' || isAdmin ? (
                      <Link href="/owner"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                        <span>🏠</span> Portal Owner
                      </Link>
                    ) : null}

                    {/* Admin link */}
                    {isAdmin && (
                      <>
                        <div className="border-t border-gray-50 my-1" />
                        <Link href="/admin"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-green-700 font-medium hover:bg-green-50">
                          <span>⚙️</span> Admin Panel
                        </Link>
                      </>
                    )}

                    <div className="border-t border-gray-50 my-1" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left"
                    >
                      <span>🚪</span> Keluar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login"
              className="bg-green-600 text-white text-sm font-semibold px-4 py-1.5 rounded-xl hover:bg-green-700 transition-colors">
              Masuk
            </Link>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-40">
        <div className="flex">
          {[
            { href: '/', icon: '🏠', label: 'Beranda' },
            { href: '/news', icon: '📰', label: 'Berita' },
            { href: '/reports', icon: '📢', label: 'Lapor' },
            { href: '/fundraising', icon: '💚', label: 'Donasi' },
            { href: user ? '/my-reports' : '/login', icon: '📋', label: user ? 'Laporanku' : 'Masuk' }
          ].map(item => (
            <Link key={item.href} href={item.href}
              className={`flex-1 flex flex-col items-center py-2 text-center transition-colors ${
                pathname === item.href || pathname.startsWith(item.href + '/') && item.href !== '/'
                  ? 'text-green-600'
                  : 'text-gray-400'
              }`}>
              <span className="text-lg">{item.icon}</span>
              <span className="text-xs mt-0.5">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Overlay untuk tutup dropdown */}
      {menuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
      )}
    </nav>
  )
}
