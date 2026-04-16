'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1'

// Foto Ternate oleh Zakaria Ahada — Unsplash License (free to use)
// Ganti dengan NEXT_PUBLIC_HERO_BG_URL di Vercel kalau sudah punya foto sendiri
const FALLBACK_PHOTO = 'https://source.unsplash.com/cQOE0atq6AQ/1400x900'
const HERO_PHOTO_URL = process.env.NEXT_PUBLIC_HERO_BG_URL || FALLBACK_PHOTO

const POPULAR_TAGS = [
  { label: 'Speedboat Ternate–Sidangoli', href: '/speed' },
  { label: 'Kos di Akehuda', href: '/kos?area=akehuda' },
  { label: 'Berita Hari Ini', href: '/news' },
  { label: 'Donasi Kemanusiaan', href: '/fundraising' },
]

const SERVICE_PILLS = [
  { icon: '📰', label: 'BAKABAR',   sub: 'Berita lokal & terkini',      href: '/news',        color: '#003526', bg: 'rgba(0,53,38,0.07)',     border: 'rgba(0,53,38,0.12)' },
  { icon: '⛵', label: 'BAPASIAR',  sub: 'Jadwal & tiket kapal cepat',  href: '/speed',       color: '#0891B2', bg: 'rgba(8,145,178,0.07)',   border: 'rgba(8,145,178,0.15)' },
  { icon: '🏠', label: 'BAKOS',     sub: 'Cari & sewa kos terbaik',     href: '/kos',         color: '#1B6B4A', bg: 'rgba(27,107,74,0.07)',   border: 'rgba(27,107,74,0.15)' },
  { icon: '💚', label: 'BASUMBANG', sub: 'Bantu sesama, berbagi',       href: '/fundraising', color: '#E8963A', bg: 'rgba(232,150,58,0.07)',  border: 'rgba(232,150,58,0.15)' },
]

export default function Hero() {
  const router = useRouter()
  const [search, setSearch]           = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [weather, setWeather]         = useState<any>(null)
  const [imgLoaded, setImgLoaded]     = useState(false)

  // Fetch BMKG weather dari endpoint yang sudah ada
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
    : '☁️ 27°C · Berawan · Hari ini'

  return (
    <section
      className="hero-section"
      style={{
        position: 'relative',
        overflow: 'hidden',
        paddingTop: 100,
        paddingBottom: 0,
        background: 'var(--surface)',
      }}
    >
      {/* ── Full bleed photo — right side, bleeds ke tepi viewport ── */}
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
            transition: 'opacity 0.6s ease',
            opacity: imgLoaded ? 1 : 0,
          }}
        />
        {/* Gradient fade ke kiri — blend halus ke background */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, var(--surface) 0%, rgba(247,249,251,0.85) 18%, rgba(247,249,251,0.3) 40%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        {/* Depth blur bawah */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '25%',
          background: 'linear-gradient(to top, rgba(247,249,251,0.5) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />
        {/* Fallback gradient saat foto loading */}
        {!imgLoaded && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(160deg, #002a1e 0%, #1B6B4A 40%, #0891B2 100%)',
          }} />
        )}
      </div>

      {/* ── Content layer ── */}
      <div
        className="hero-grid"
        style={{
          position: 'relative', zIndex: 1,
          maxWidth: 1200, margin: '0 auto',
          padding: '0 24px 64px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 48,
          alignItems: 'center',
        }}
      >

        {/* ── LEFT: Content ── */}
        <div>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,53,38,0.07)', border: '1px solid rgba(0,53,38,0.12)',
            borderRadius: 99, padding: '6px 14px', marginBottom: 20,
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
            color: 'var(--text)', marginBottom: 14,
          }}>
            Temukan Apa Saja di
            <br />
            <span style={{ color: 'var(--cyan)' }}>Maluku Utara</span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 15, lineHeight: 1.65,
            color: 'var(--text-muted)', marginBottom: 24, maxWidth: 380,
          }}>
            Berita, transportasi, kos, hingga bantuan —
            <br />semua dalam satu pencarian.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#fff', borderRadius: 99,
            padding: '6px 6px 6px 20px',
            border: searchFocused ? '1.5px solid rgba(0,53,38,0.4)' : '1.5px solid var(--border-light)',
            boxShadow: searchFocused
              ? '0 8px 40px rgba(0,53,38,0.15)'
              : '0 4px 24px rgba(0,53,38,0.08)',
            marginBottom: 12, maxWidth: 480,
            transition: 'all 0.2s ease',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              type="search"
              placeholder="Cari speedboat, kos, berita, atau layanan..."
              style={{
                flex: 1, border: 'none', outline: 'none',
                background: 'transparent', fontSize: 13.5,
                color: 'var(--text)', fontFamily: 'inherit',
              }}
            />
            <button type="submit" style={{
              width: 40, height: 40, borderRadius: 99, flexShrink: 0,
              background: 'var(--primary)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'opacity 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
            </button>
          </form>

          {/* ── Sense of place — BMKG dynamic ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: 16, flexWrap: 'wrap',
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Ternate, Maluku Utara
            </span>
            <span style={{ color: 'var(--border-light)', fontSize: 14, fontWeight: 300 }}>|</span>
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: weather ? 'var(--text-muted)' : 'var(--text-light)',
            }}>
              {weatherText}
            </span>
          </div>

          {/* Popular tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 24 }}>
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

          {/* Service pills — 2x2 grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 480 }}>
            {SERVICE_PILLS.map(svc => (
              <Link key={svc.href} href={svc.href} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#fff',
                border: `1.5px solid ${svc.border}`,
                borderRadius: 14, padding: '11px 14px',
                textDecoration: 'none',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = svc.bg;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.09)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0 }}>{svc.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: svc.color, letterSpacing: '0.02em' }}>
                    {svc.label}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, lineHeight: 1.3 }}>
                    {svc.sub}
                  </div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: svc.color, flexShrink: 0, fontWeight: 700 }}>→</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Floating cards area ── */}
        <div className="hero-photo" style={{ position: 'relative', height: 500 }}>

          {/* ── Card UTAMA — Speedboat (dominan, kiri atas) ── */}
          <Link href="/speed" className="float-card" style={{
            position: 'absolute', top: '6%', left: '0%',
            textDecoration: 'none',
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            borderRadius: 22, padding: '18px 22px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
            border: '1px solid rgba(255,255,255,0.95)',
            minWidth: 230, zIndex: 10,
            animationDelay: '0s',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 32px 80px rgba(0,0,0,0.22)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)'; }}
          >
            {/* Badge UTAMA */}
            <div style={{ marginBottom: 12 }}>
              <span style={{
                fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
                background: '#0891B2', color: '#fff',
                padding: '3px 10px', borderRadius: 99,
              }}>UTAMA · BAPASIAR</span>
            </div>
            {/* Content */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: 'rgba(8,145,178,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
              }}>⛵</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Speedboat Hari Ini</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Ternate → Sidangoli</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>🕐 14:00 WIT</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0891B2', letterSpacing: '-0.02em', marginBottom: 12 }}>
              Rp 75.000
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(8,145,178,0.08)', borderRadius: 10, padding: '8px 12px',
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0891B2' }}>Lihat Jadwal</span>
              <span style={{ fontSize: 14, color: '#0891B2' }}>→</span>
            </div>
          </Link>

          {/* ── Card Sekunder 1 — BAKOS (kanan tengah) ── */}
          <Link href="/kos" className="float-card" style={{
            position: 'absolute', top: '42%', right: '-2%',
            textDecoration: 'none',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
            borderRadius: 18, padding: '14px 18px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
            border: '1px solid rgba(255,255,255,0.92)',
            minWidth: 190, zIndex: 10,
            animationDelay: '-1.5s',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 24px 60px rgba(0,0,0,0.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.15)'; }}
          >
            <span style={{
              fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em',
              color: '#1B6B4A', background: 'rgba(27,107,74,0.1)',
              padding: '2px 8px', borderRadius: 99, display: 'inline-block', marginBottom: 8,
            }}>BAKOS</span>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 3 }}>Kos Akehuda</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>Mulai Rp 450rb/bulan</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1B6B4A' }}>Cari Kos →</div>
          </Link>

          {/* ── Card Sekunder 2 — BASUMBANG (kanan bawah, lebih kecil) ── */}
          <Link href="/fundraising" className="float-card" style={{
            position: 'absolute', bottom: '8%', right: '5%',
            textDecoration: 'none',
            background: 'rgba(255,255,255,0.90)',
            backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            borderRadius: 16, padding: '12px 16px',
            boxShadow: '0 10px 32px rgba(0,0,0,0.12)',
            border: '1px solid rgba(255,255,255,0.88)',
            minWidth: 168, zIndex: 10,
            animationDelay: '-3s',
            transition: 'transform 0.2s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
          >
            <span style={{
              fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em',
              color: '#E8963A', background: 'rgba(232,150,58,0.1)',
              padding: '2px 7px', borderRadius: 99, display: 'inline-block', marginBottom: 7,
            }}>BASUMBANG</span>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Donasi Aktif</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4 }}>
              Bantu warga yang membutuhkan
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#E8963A' }}>Lihat Donasi →</div>
          </Link>
        </div>
      </div>
    </section>
  )
}
