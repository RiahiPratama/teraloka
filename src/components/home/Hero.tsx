import Link from 'next/link'

const POPULAR_TAGS = [
  { label: 'Speedboat Ternate–Sidangoli', href: '/speed' },
  { label: 'Kos di Akehuda', href: '/kos?area=akehuda' },
  { label: 'Berita Hari Ini', href: '/news' },
  { label: 'Donasi Kemanusiaan', href: '/fundraising' },
]

// Admin bisa ganti via Vercel Dashboard → Environment Variables
// NEXT_PUBLIC_HERO_BG_URL = URL foto atau video .mp4
// NEXT_PUBLIC_HERO_BG_TYPE = 'image' | 'video' (default: 'image')
const HERO_BG_URL = process.env.NEXT_PUBLIC_HERO_BG_URL || ''
const HERO_BG_TYPE = process.env.NEXT_PUBLIC_HERO_BG_TYPE || 'image'

export default function Hero() {
  const hasCustomBg = !!HERO_BG_URL

  return (
    <section
      className="relative flex flex-col items-center justify-center overflow-hidden"
      style={{ padding: '110px 24px 52px' }}
    >
      {/* ── Background ── */}
      <div className="absolute inset-0 z-0">

        {/* Custom photo dari Vercel env var */}
        {hasCustomBg && HERO_BG_TYPE === 'image' && (
          <>
            <img
              src={HERO_BG_URL}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: 'center 60%' }}
            />
            {/* Overlay gelap supaya teks tetap terbaca */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.55) 100%)' }} />
            {/* Overlay warna brand di atas foto */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(8,145,178,0.25) 0%, rgba(27,107,74,0.2) 100%)' }} />
          </>
        )}

        {/* Video loop seperti JAKI — aktif kalau HERO_BG_TYPE=video */}
        {hasCustomBg && HERO_BG_TYPE === 'video' && (
          <>
            <video
              autoPlay muted loop playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: 'center 60%' }}
            >
              <source src={HERO_BG_URL} type="video/mp4" />
            </video>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.6) 100%)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(8,145,178,0.2) 0%, rgba(27,107,74,0.15) 100%)' }} />
          </>
        )}

        {/* Default gradient — aktif kalau tidak ada env var */}
        {!hasCustomBg && (
          <>
            <svg
              viewBox="0 0 1440 580"
              preserveAspectRatio="xMidYMid slice"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute inset-0 w-full h-full"
              style={{ opacity: 0.12 }}
              aria-hidden
            >
              <defs>
                <radialGradient id="rg1" cx="30%" cy="40%">
                  <stop offset="0%" stopColor="#0891B2" stopOpacity=".5" />
                  <stop offset="100%" stopColor="#0891B2" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="rg2" cx="80%" cy="60%">
                  <stop offset="0%" stopColor="#1B6B4A" stopOpacity=".4" />
                  <stop offset="100%" stopColor="#1B6B4A" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width="1440" height="580" fill="#dff0f5" />
              <ellipse cx="200" cy="240" rx="320" ry="190" fill="url(#rg1)" />
              <ellipse cx="1100" cy="340" rx="280" ry="170" fill="url(#rg2)" />
              <path d="M0 420 Q250 350 500 375 Q750 400 1000 330 Q1200 275 1440 310 L1440 580 L0 580Z" fill="#0891B2" opacity=".08" />
            </svg>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, var(--surface) 0%, transparent 25%, transparent 75%, var(--surface) 100%)' }} />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(8,145,178,0.06) 0%, transparent 70%)' }} />
          </>
        )}

        {/* Fade bottom ke content di bawah — selalu ada */}
        <div className="absolute bottom-0 left-0 right-0 h-20"
          style={{ background: 'linear-gradient(to top, var(--surface) 0%, transparent 100%)' }} />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 max-w-[820px] w-full text-center">

        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-[0.1em] uppercase mb-4"
          style={{
            background: hasCustomBg ? 'rgba(255,255,255,0.15)' : 'rgba(53,37,205,0.08)',
            border: hasCustomBg ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(53,37,205,0.15)',
            color: hasCustomBg ? '#fff' : 'var(--primary)',
            backdropFilter: hasCustomBg ? 'blur(8px)' : 'none',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: hasCustomBg ? '#fff' : 'var(--orange)' }} />
          Digital Curator of the Archipelago
        </div>

        {/* Title */}
        <h1
          className="font-sora font-extrabold leading-[1.08] tracking-tight mb-3.5"
          style={{
            fontSize: 'clamp(32px, 5.5vw, 62px)',
            color: hasCustomBg ? '#fff' : 'var(--text)',
            textShadow: hasCustomBg ? '0 2px 20px rgba(0,0,0,0.3)' : 'none',
          }}
        >
          Gerbang Digital
          <br />
          <span className={hasCustomBg ? 'text-[#7DD3FA]' : 'gradient-text'}>
            Maluku Utara
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="max-w-[460px] mx-auto mb-7 leading-relaxed"
          style={{
            fontSize: 15,
            color: hasCustomBg ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)',
            textShadow: hasCustomBg ? '0 1px 8px rgba(0,0,0,0.4)' : 'none',
          }}
        >
          Satu platform untuk berita lokal, transportasi laut, kos & properti,
          hingga donasi kemanusiaan.
        </p>

        {/* Search */}
        <div
          className="flex items-center gap-3 max-w-[560px] mx-auto mb-4 rounded-full pl-6 pr-1.5 py-1.5"
          style={{
            background: hasCustomBg ? 'rgba(255,255,255,0.92)' : '#fff',
            border: '1.5px solid var(--border-light)',
            boxShadow: hasCustomBg
              ? '0 20px 60px rgba(0,0,0,0.25)'
              : '0 16px 48px rgba(53,37,205,0.10)',
            backdropFilter: hasCustomBg ? 'blur(12px)' : 'none',
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
            stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className="flex-shrink-0" aria-hidden>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Cari speedboat, kos, berita, atau layanan lain..."
            className="flex-1 border-none outline-none bg-transparent text-[14px]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--text)' }}
          />
          <button type="submit"
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ background: 'var(--primary)' }} aria-label="Cari">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none"
              stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
        </div>

        {/* Popular tags */}
        <div className="flex flex-wrap justify-center gap-2 text-[12px]">
          <span className="self-center font-semibold text-[11px]"
            style={{ color: hasCustomBg ? 'rgba(255,255,255,0.6)' : 'var(--text-light)' }}>
            Populer:
          </span>
          {POPULAR_TAGS.map((tag) => (
            <Link key={tag.href} href={tag.href}
              className="px-3 py-1 rounded-full font-medium transition-all duration-200"
              style={{
                background: hasCustomBg ? 'rgba(255,255,255,0.15)' : '#fff',
                border: hasCustomBg ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border-light)',
                color: hasCustomBg ? '#fff' : 'var(--text-muted)',
                backdropFilter: hasCustomBg ? 'blur(8px)' : 'none',
              }}>
              {tag.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
