'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1'
const HERO_PHOTO_URL = process.env.NEXT_PUBLIC_HERO_BG_URL || ''

// Pra-launch (Jun 2026): slot UTAMA Hero (dulu Speedboat) sekarang dipakai BALAJU —
// modul live, strategic (narik opang/Pemda). Transport disembunyikan dari landing.
// Kalau transport mau dimunculin lagi pas launch, ambil JSX speedboat dari git history.

const POPULAR_TAGS = [
  // Pra-launch: tag Speedboat disembunyikan (fokus 5 modul live)
  // { label: 'Speedboat Ternate–Sidangoli', href: '/speed' },
  { label: 'Kos di Kalumpang', href: '/bakos?area=kalumpang' },
  { label: 'Berita Hari Ini', href: '/bakabar' },
  { label: 'Donasi Kemanusiaan', href: '/fundraising' },
]

const SERVICE_PILLS = [
  {
    iconPath: 'M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2M18 14h-8M15 18h-5M10 6h8v4h-8Z', label: 'BAKABAR', sub: 'Berita Lokal',
    href: '/bakabar', color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.15)',
  },
  // Pra-launch: slot SPEEDBOAT diganti BALAPOR (modul live) — 4 pill live, no gap.
  {
    iconPath: 'm3 11 19-9-9 19-2-8-8-2z', label: 'BALAPOR', sub: 'Laporan Publik',
    href: '/reports', color: '#DC2626', bg: 'rgba(220,38,38,0.07)', border: 'rgba(220,38,38,0.15)',
  },
  {
    iconPath: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10', label: 'KOS', sub: 'Cari & Sewa Kos',
    href: '/bakos', color: '#D97706', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.15)',
  },
  {
    iconPath: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z', label: 'DONASI', sub: 'Bantu Sesama',
    href: '/fundraising', color: '#EC4899', bg: 'rgba(236,72,153,0.07)', border: 'rgba(236,72,153,0.15)',
  },
]

export default function Hero() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [weather, setWeather] = useState<any>(null)
  // ⭐ FIX: mounted flag — render SERVICE_PILLS client-only
  // Browser extensions (Dark Reader dll) memodifikasi DOM sebelum React hydrate
  // menyebabkan SSR vs client mismatch. Client-only render = no mismatch.
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetch(`${API}/public/weather`)
      .then(r => r.json())
      .then(d => { if (d.success) setWeather(d.data) })
      .catch(() => { })
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) router.push(`/bakabar?q=${encodeURIComponent(search.trim())}`)
  }

  const weatherText = weather
    ? `${weather.cuaca?.icon || '☁️'} ${weather.suhu ?? 27}°C · ${weather.cuaca?.label ?? 'Berawan'} · Hari ini`
    : '☁️ Hari ini'

  return (
    <section className="hero-section" style={{
      position: 'relative',
      overflow: 'hidden',
      paddingTop: 100,
      paddingBottom: 48,
      background: 'var(--surface)',
    }}>

      {/* ── Photo/Fallback background ── */}
      <div className="hero-photo-bg" style={{
        position: 'absolute',
        top: 0, right: 0, bottom: 0,
        width: '58%',
        zIndex: 0,
      }}>
        {HERO_PHOTO_URL ? (
          <img
            src={HERO_PHOTO_URL}
            alt="Ternate, Maluku Utara"
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center 30%',
              display: 'block',
            }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(160deg, #002a1e 0%, #1B6B4A 35%, #0a7a9c 65%, #0891B2 100%)',
            position: 'relative', overflow: 'hidden',
          }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{
                position: 'absolute', width: '140%', height: 1,
                background: 'rgba(255,255,255,0.05)',
                top: `${15 + i * 14}%`, left: '-20%',
                transform: `rotate(${-3 + i * 1.5}deg)`,
              }} />
            ))}
          </div>
        )}

        {/* Overlay desktop */}
        <div className="hero-overlay-desktop" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to right, var(--surface) 0%, rgba(247,249,251,0.75) 18%, rgba(247,249,251,0.2) 40%, transparent 65%)',
        }} />

        {/* Overlay mobile */}
        <div className="hero-overlay-mobile" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to bottom, rgba(247,249,251,0.1) 0%, rgba(247,249,251,0.65) 55%, var(--surface) 80%)',
        }} />
      </div>

      {/* ── Content ── */}
      <div className="hero-grid" style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1200, margin: '0 auto',
        padding: '0 24px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 48, alignItems: 'center',
      }}>

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

          <h1 className="font-sora" style={{
            fontSize: 'clamp(30px, 4.5vw, 56px)', fontWeight: 800,
            lineHeight: 1.06, letterSpacing: '-0.02em',
            color: 'var(--text)', marginBottom: 12,
          }}>
            Gerbang Digital <span style={{ color: 'var(--cyan)' }}>Maluku Utara</span>
          </h1>

          <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--text-muted)', marginBottom: 20, maxWidth: 380 }}>
            Cari berita lokal, lapor masalah publik, cari kos-kosan, pesan ojek, hingga berdonasi — tanpa pindah aplikasi.
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
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
              type="search" placeholder="Cari kos, berita, donasi, atau layanan..."
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13.5, color: 'var(--text)', fontFamily: 'inherit' }} />
            <button type="submit" style={{
              width: 40, height: 40, borderRadius: 99, flexShrink: 0,
              background: 'var(--primary)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
            </button>
          </form>

          {/* Sense of place */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
              Ternate, Maluku Utara
            </span>
            <span style={{ color: 'var(--border-light)', fontSize: 14 }}>|</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{weatherText}</span>
          </div>

          {/* Popular tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 24 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-light)' }}>🔥 Populer:</span>
            {POPULAR_TAGS.map(tag => (
              <Link key={tag.href} href={tag.href} style={{
                fontSize: 12, fontWeight: 500, color: 'var(--text-muted)',
                background: '#fff', border: '1px solid var(--border-light)',
                borderRadius: 99, padding: '4px 11px', textDecoration: 'none',
                transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,53,38,0.3)'; e.currentTarget.style.color = 'var(--primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                {tag.label}
              </Link>
            ))}
          </div>

          {/* ── Service Pills — DESKTOP ONLY ── */}
          {/* ⭐ FIX: selalu render (SSR + client), visibility dikontrol bukan conditional */}
          <div className="hidden md:grid" style={{
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
            maxWidth: 480,
            visibility: mounted ? 'visible' : 'hidden',
          }}>
            {SERVICE_PILLS.map(pill => (
              <Link key={pill.href} href={pill.href} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    background: '#fff',
                    border: `1.5px solid ${pill.border}`,
                    borderRadius: 14,
                    padding: '12px 10px',
                    display: 'flex', flexDirection: 'column', gap: 6,
                    boxShadow: '0 2px 8px rgba(0,53,38,0.05)',
                    transition: 'all 0.15s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    ; (e.currentTarget as HTMLElement).style.background = pill.bg
                      ; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                      ; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(0,53,38,0.1)'
                  }}
                  onMouseLeave={e => {
                    ; (e.currentTarget as HTMLElement).style.background = '#fff'
                      ; (e.currentTarget as HTMLElement).style.transform = 'none'
                      ; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,53,38,0.05)'
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: pill.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke={pill.color}
                      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      {pill.iconPath.split(' M').map((seg, i) => <path key={i} d={i === 0 ? seg : 'M' + seg} />)}
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: pill.color, lineHeight: 1.2 }}>
                      {pill.label}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 1 }}>
                      {pill.sub}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: pill.color }}>→</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* RIGHT — floating cards (desktop only) */}
        <div className="hero-photo" style={{ position: 'relative', height: 500 }}>

          {/* Card UTAMA — BALAJU (Ojek Lokal) — modul live, strategic narik opang */}
          <Link href="/balaju" className="float-card" style={{
            position: 'absolute', bottom: '2%', left: '-8%',
            textDecoration: 'none',
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            borderRadius: 22, padding: '18px 22px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
            border: '1px solid rgba(255,255,255,0.95)',
            minWidth: 230, zIndex: 10, animationDelay: '0s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{ marginBottom: 12 }}>
              <span style={{
                fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
                background: '#0F766E', color: '#fff', padding: '3px 10px', borderRadius: 99,
              }}>BALAJU</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: 'rgba(15,118,110,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="#0F766E"
                  strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Ojek Lokal</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Antar penumpang &amp; barang</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
              Driver lokal siap melayani warga Ternate
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(15,118,110,0.1)', borderRadius: 10, padding: '8px 12px',
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0F766E' }}>Selengkapnya</span>
              <span style={{ fontSize: 14, color: '#0F766E' }}>→</span>
            </div>
          </Link>

          {/* Card Sekunder — BAKOS */}
          <Link href="/bakos" className="float-card" style={{
            position: 'absolute', top: '60%', right: '-8%',
            textDecoration: 'none',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
            borderRadius: 18, padding: '14px 18px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
            border: '1px solid rgba(255,255,255,0.92)',
            minWidth: 190, zIndex: 10, animationDelay: '-1.5s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
          >
            <span style={{
              fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em',
              color: '#D97706', background: 'rgba(217,119,6,0.1)',
              padding: '2px 8px', borderRadius: 99, display: 'inline-block', marginBottom: 8,
            }}>BAKOS</span>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 3 }}>Kos Akehuda</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>Mulai Rp 750rb/bulan</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#D97706' }}>Cari Kos →</div>
          </Link>

          {/* Card Kecil — BADONASI */}
          <Link href="/fundraising" className="float-card" style={{
            position: 'absolute', bottom: '-4%', right: '-2%',
            textDecoration: 'none',
            background: 'rgba(255,255,255,0.90)',
            backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            borderRadius: 16, padding: '12px 16px',
            boxShadow: '0 10px 32px rgba(0,0,0,0.12)',
            border: '1px solid rgba(255,255,255,0.88)',
            minWidth: 168, zIndex: 10, animationDelay: '-3s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
          >
            <span style={{
              fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em',
              color: '#EC4899', background: 'rgba(236,72,153,0.1)',
              padding: '2px 7px', borderRadius: 99, display: 'inline-block', marginBottom: 7,
            }}>BADONASI</span>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Donasi Aktif</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4 }}>
              Bantu warga yang membutuhkan
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#EC4899' }}>Lihat Donasi →</div>
          </Link>
        </div>
      </div>
    </section>
  )
}
