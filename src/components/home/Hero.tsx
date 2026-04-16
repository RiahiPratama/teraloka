'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1'

const HERO_PHOTO_URL = process.env.NEXT_PUBLIC_HERO_BG_URL || ''

const POPULAR_TAGS = [
  { label: 'Speedboat Ternate–Sidangoli', href: '/speed' },
  { label: 'Kos di Akehuda', href: '/kos?area=akehuda' },
  { label: 'Berita Hari Ini', href: '/news' },
  { label: 'Donasi Kemanusiaan', href: '/fundraising' },
]

const FLOAT_CARDS = [
  { icon: '📰', label: 'BAKABAR',   sub: 'Berita Lokal',       href: '/news',        style: { top: '10%', right: '6%' },    delay: '0s' },
  { icon: '💚', label: 'BASUMBANG', sub: 'Donasi Kemanusiaan', href: '/fundraising', style: { top: '46%', right: '-3%' },   delay: '1.2s' },
  { icon: '🏠', label: 'BAKOS',     sub: 'Kos & Properti',     href: '/kos',         style: { bottom: '14%', right: '10%' }, delay: '2.4s' },
]

export default function Hero() {
  const router = useRouter()
  const [search, setSearch]               = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [weather, setWeather]             = useState<any>(null)
  const [imgLoaded, setImgLoaded]         = useState(false)

  useEffect(() => {
    fetch(`${API}/public/weather`)
      .then(r => r.json())
      .then(d => { if (d.success) setWeather(d.data) })
      .catch(() => {})
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) router.push(`/news?q=${encodeURIComponent(search.trim())}`)
  }

  const weatherText = weather
    ? `${weather.cuaca?.icon || '☁️'} ${weather.suhu ?? 27}°C · ${weather.cuaca?.label ?? 'Berawan'} · Hari ini`
    : '☁️ Hari ini'

  return (
    <section
      className="hero-section"
      style={{
        position: 'relative',
        overflow: 'hidden',
        paddingTop: 100,
        paddingBottom: 48,
        background: 'var(--surface)',
      }}
    >
      {/* ── Photo background ── */}
      {HERO_PHOTO_URL && (
        <div
          className="hero-photo-bg"
          style={{
            position: 'absolute',
            top: 0, right: 0, bottom: 0,
            width: '58%',
            zIndex: 0,
          }}
        >
          <img
            src={HERO_PHOTO_URL}
            alt="Ternate, Maluku Utara"
            onLoad={() => setImgLoaded(true)}
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center 30%',
              opacity: imgLoaded ? 1 : 0,
              transition: 'opacity 0.6s ease',
            }}
          />
          {/* Gradient desktop: fade ke kiri */}
          <div className="hero-photo-overlay-desktop" style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to right, var(--surface) 0%, rgba(247,249,251,0.8) 20%, rgba(247,249,251,0.2) 45%, transparent 65%)',
            pointerEvents: 'none',
          }} />
          {/* Gradient mobile: overlay gelap agar teks terbaca */}
          <div className="hero-photo-overlay-mobile" style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(247,249,251,0.15) 0%, rgba(247,249,251,0.6) 50%, var(--surface) 80%)',
            pointerEvents: 'none',
          }} />
        </div>
      )}

      {/* Fallback gradient kalau belum ada foto */}
      {!HERO_PHOTO_URL && (
        <div className="hero-photo-bg" style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: '58%', zIndex: 0,
          background: 'linear-gradient(160deg, #002a1e 0%, #1B6B4A 35%, #0891B2 100%)',
          opacity: 0.25,
        }} />
      )}

      {/* ── Content ── */}
      <div
        className="hero-grid"
        style={{
          position: 'relative', zIndex: 1,
          maxWidth: 1200, margin: '0 auto',
          padding: '0 24px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 48, alignItems: 'center',
        }}
      >
        {/* LEFT */}
        <div>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,53,38,0.07)', border: '1px solid rgba(0,53,38,0.12)',
            borderRadius: 99, padding: '6px 14px', marginBottom: 18,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8963A', display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--primary)' }}>
              Digital Curator of Maluku Utara
            </span>
          </div>

          {/* H1 */}
          <h1 className="font-sora" style={{
            fontSize: 'clamp(30px, 4.5vw, 56px)', fontWeight: 800,
            lineHeight: 1.06, letterSpacing: '-0.02em',
            color: 'var(--text)', marginBottom: 12,
          }}>
            Temukan Apa Saja di
            <br />
            <span style={{ color: 'var(--cyan)' }}>Maluku Utara</span>
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--text-muted)', marginBottom: 20, maxWidth: 380 }}>
            Berita, transportasi, kos, hingga bantuan —
            <br />semua dalam satu pencarian.
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#fff', borderRadius: 99,
            padding: '6px 6px 6px 20px',
            border: searchFocused ? '1.5px solid rgba(0,53,38,0.4)' : '1.5px solid var(--border-light)',
            boxShadow: searchFocused ? '0 8px 40px rgba(0,53,38,0.15)' : '0 4px 24px rgba(0,53,38,0.08)',
            marginBottom: 12, maxWidth: 480, transition: 'all 0.2s ease',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
              type="search" placeholder="Cari speedboat, kos, berita, atau layanan..."
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13.5, color: 'var(--text)', fontFamily: 'inherit' }} />
            <button type="submit" style={{
              width: 40, height: 40, borderRadius: 99, flexShrink: 0,
              background: 'var(--primary)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
            </button>
          </form>

          {/* Sense of place */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              Ternate, Maluku Utara
            </span>
            <span style={{ color: 'var(--border-light)', fontSize: 14 }}>|</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{weatherText}</span>
          </div>

          {/* Popular tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-light)' }}>🔥 Populer:</span>
            {POPULAR_TAGS.map(tag => (
              <Link key={tag.href} href={tag.href} style={{
                fontSize: 12, fontWeight: 500, color: 'var(--text-muted)',
                background: '#fff', border: '1px solid var(--border-light)',
                borderRadius: 99, padding: '4px 11px', textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,53,38,0.3)'; e.currentTarget.style.color = 'var(--primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                {tag.label}
              </Link>
            ))}
          </div>
        </div>

        {/* RIGHT — floating cards (desktop only) */}
        <div className="hero-photo" style={{ position: 'relative', height: 500 }}>
          {FLOAT_CARDS.map((card) => (
            <Link key={card.label} href={card.href} className="float-card"
              style={{
                position: 'absolute', ...card.style, animationDelay: card.delay,
                textDecoration: 'none', background: 'rgba(255,255,255,0.96)',
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                borderRadius: 18, padding: '11px 15px',
                display: 'flex', alignItems: 'center', gap: 10,
                boxShadow: '0 12px 40px rgba(0,0,0,0.14)', border: '1px solid rgba(255,255,255,0.9)',
                zIndex: 10, minWidth: 165, transition: 'transform 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}>
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
