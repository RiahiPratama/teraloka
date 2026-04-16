'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const HERO_PHOTO_URL = process.env.NEXT_PUBLIC_HERO_BG_URL || ''

const POPULAR_TAGS = [
  { label: 'Speedboat Ternate–Sidangoli', href: '/speed' },
  { label: 'Kos di Akehuda', href: '/kos?area=akehuda' },
  { label: 'Berita Hari Ini', href: '/news' },
  { label: 'Donasi Kemanusiaan', href: '/fundraising' },
]

// Service shortcut pills — muncul di bawah popular tags
const SERVICE_PILLS = [
  { icon: '📰', label: 'BAKABAR', sub: 'Berita Lokal', href: '/news', stroke: '#003526', bg: 'rgba(0,53,38,0.06)' },
  { icon: '⛵', label: 'SPEEDBOAT', sub: 'Jadwal & Tiket', href: '/speed', stroke: '#0891B2', bg: 'rgba(8,145,178,0.06)' },
  { icon: '🏠', label: 'KOS', sub: 'Cari & Sewa Kos', href: '/kos', stroke: '#1B6B4A', bg: 'rgba(27,107,74,0.06)' },
  { icon: '💚', label: 'DONASI', sub: 'Bantu Sesama', href: '/fundraising', stroke: '#E8963A', bg: 'rgba(232,150,58,0.06)' },
]

const FLOAT_CARDS = [
  { icon: '📰', label: 'BAKABAR', sub: 'Berita Lokal', href: '/news', style: { top: '10%', right: '6%' }, delay: '0s' },
  { icon: '💚', label: 'BASUMBANG', sub: 'Donasi Kemanusiaan', href: '/fundraising', style: { top: '46%', right: '-3%' }, delay: '1.2s' },
  { icon: '🏠', label: 'BAKOS', sub: 'Kos & Properti', href: '/kos', style: { bottom: '14%', right: '10%' }, delay: '2.4s' },
]

const FALLBACK_SPOTS = [
  { emoji: '🌊', label: 'Laut Maluku' },
  { emoji: '🏝️', label: 'Tidore' },
  { emoji: '⛵', label: 'Ternate' },
  { emoji: '🌺', label: 'Halmahera' },
]

export default function Hero() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) router.push(`/news?q=${encodeURIComponent(search.trim())}`)
  }

  return (
    <section
      className="hero-section"
      style={{
        minHeight: '88vh',
        display: 'flex',
        alignItems: 'center',
        /* paddingTop account: ticker(36) + gap(8) + navbar-top(44) + navbar-height(52) + gap(20) = ~160px */
        paddingTop: 160,
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--surface)',
      }}
    >
      {/* Background glows */}
      <div style={{
        position: 'absolute', top: '10%', right: '5%', width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(8,145,178,0.06) 0%, transparent 70%)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '5%', left: '2%', width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(27,107,74,0.05) 0%, transparent 70%)', pointerEvents: 'none',
      }} />

      <div className="hero-grid" style={{
        maxWidth: 1200, margin: '0 auto',
        padding: '0 24px 60px',
        width: '100%',
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 56, alignItems: 'center',
      }}>

        {/* LEFT */}
        <div>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,53,38,0.07)', border: '1px solid rgba(0,53,38,0.12)',
            borderRadius: 99, padding: '6px 14px', marginBottom: 22,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8963A', display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--primary)' }}>
              Digital Curator of the Archipelago
            </span>
          </div>

          {/* H1 */}
          <h1 className="font-sora" style={{
            fontSize: 'clamp(32px, 5vw, 64px)', fontWeight: 800,
            lineHeight: 1.06, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 16,
          }}>
            Temukan Apa Saja
            <br />
            di <span style={{ color: 'var(--cyan)' }}>Maluku Utara</span>
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: 16, lineHeight: 1.65, color: 'var(--text-muted)', marginBottom: 28, maxWidth: 420 }}>
            Berita, transportasi, kos, hingga bantuan —
            <br />semua dalam satu pencarian.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#fff', borderRadius: 99,
            padding: '6px 6px 6px 22px',
            border: searchFocused ? '1.5px solid rgba(0,53,38,0.35)' : '1.5px solid var(--border-light)',
            boxShadow: searchFocused ? '0 8px 40px rgba(0,53,38,0.15)' : '0 8px 32px rgba(0,53,38,0.10)',
            marginBottom: 16, maxWidth: 520, transition: 'all 0.2s ease',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
              type="search" placeholder="Cari speedboat, kos, berita, atau layanan..."
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--text)', fontFamily: 'inherit' }} />
            <button type="submit" style={{
              width: 42, height: 42, borderRadius: 99, flexShrink: 0,
              background: 'var(--primary)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
            </button>
          </form>

          {/* Popular tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 28 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-light)' }}>Populer:</span>
            {POPULAR_TAGS.map(tag => (
              <Link key={tag.href} href={tag.href} style={{
                fontSize: 12, fontWeight: 500, color: 'var(--text-muted)',
                background: '#fff', border: '1px solid var(--border-light)',
                borderRadius: 99, padding: '5px 12px', textDecoration: 'none', transition: 'all 0.15s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,53,38,0.25)'; e.currentTarget.style.color = 'var(--primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                {tag.label}
              </Link>
            ))}
          </div>

          {/* Service shortcut pills */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 520 }}>
            {SERVICE_PILLS.map(svc => (
              <Link key={svc.href} href={svc.href} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#fff', border: '1.5px solid var(--border-light)',
                borderRadius: 14, padding: '10px 14px', textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = svc.stroke
                  e.currentTarget.style.background = svc.bg
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border-light)'
                  e.currentTarget.style.background = '#fff'
                  e.currentTarget.style.transform = 'none'
                }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{svc.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: svc.stroke, letterSpacing: '0.02em' }}>{svc.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{svc.sub}</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-light)', flexShrink: 0 }}>→</span>
              </Link>
            ))}
          </div>
        </div>

        {/* RIGHT: Photo */}
        <div className="hero-photo" style={{ position: 'relative', height: 500 }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: 28, overflow: 'hidden',
            background: 'linear-gradient(135deg, #003526, #0891B2)',
            boxShadow: '0 32px 80px rgba(0,53,38,0.2)', position: 'relative',
          }}>
            {HERO_PHOTO_URL ? (
              <img src={HERO_PHOTO_URL} alt="Maluku Utara"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%' }} />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: 'linear-gradient(160deg, #002a1e 0%, #1B6B4A 35%, #0a7a9c 65%, #0891B2 100%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
              }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} style={{
                    position: 'absolute', width: '140%', height: 1,
                    background: 'rgba(255,255,255,0.04)', top: `${15 + i * 14}%`,
                    left: '-20%', borderRadius: 99, transform: `rotate(${-3 + i * 1.5}deg)`,
                  }} />
                ))}
                <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                  <div style={{ fontSize: 64, marginBottom: 16, filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.3))' }}>🌊</div>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Maluku Utara
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 6 }}>
                    Set NEXT_PUBLIC_HERO_BG_URL di Vercel
                  </p>
                </div>
                {FALLBACK_SPOTS.map((spot, i) => {
                  const positions = [{ top: '18%', left: '22%' }, { top: '58%', left: '15%' }, { top: '72%', left: '62%' }, { top: '25%', left: '68%' }]
                  return (
                    <div key={i} style={{ position: 'absolute', ...positions[i], zIndex: 2 }}>
                      <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14 }}>{spot.emoji}</span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{spot.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(0,20,10,0.4) 100%)', borderRadius: 28, pointerEvents: 'none' }} />
          </div>

          {/* Floating cards */}
          {FLOAT_CARDS.map((card) => (
            <Link key={card.label} href={card.href} className="float-card"
              style={{
                position: 'absolute', ...card.style, animationDelay: card.delay,
                textDecoration: 'none', background: 'rgba(255,255,255,0.96)',
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                borderRadius: 18, padding: '11px 15px',
                display: 'flex', alignItems: 'center', gap: 10,
                boxShadow: '0 12px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid rgba(255,255,255,0.9)', zIndex: 10, minWidth: 165,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 20px 48px rgba(0,0,0,0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.14)'; }}>
              <span style={{ fontSize: 22 }}>{card.icon}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)' }}>{card.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{card.sub}</div>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--primary)', fontWeight: 700 }}>→</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
