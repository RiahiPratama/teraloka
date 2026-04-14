import Link from 'next/link'

const POPULAR_TAGS = [
  { label: 'Speedboat Ternate–Sidangoli', href: '/bapasiar/speedboat' },
  { label: 'Kos di Akehuda', href: '/bakos?area=akehuda' },
  { label: 'Berita Hari Ini', href: '/bakabar' },
  { label: 'Donasi Kemanusiaan', href: '/basumbang' },
]

export default function Hero() {
  return (
    <section
      className="relative flex flex-col items-center justify-center overflow-hidden"
      style={{ padding: '110px 24px 52px' }}
    >
      {/* Background */}
      <div className="absolute inset-0 z-0">
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
          <path
            d="M0 420 Q250 350 500 375 Q750 400 1000 330 Q1200 275 1440 310 L1440 580 L0 580Z"
            fill="#0891B2"
            opacity=".08"
          />
        </svg>
        {/* Fade overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, var(--surface) 0%, transparent 25%, transparent 75%, var(--surface) 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(8,145,178,0.06) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-[820px] w-full text-center">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-[0.1em] uppercase mb-4"
          style={{
            background: 'rgba(53,37,205,0.08)',
            border: '1px solid rgba(53,37,205,0.15)',
            color: 'var(--primary)',
          }}
        >
          <span
            className="badge-dot w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--orange)' }}
          />
          Digital Curator of the Archipelago
        </div>

        {/* Title */}
        <h1
          className="font-sora font-extrabold leading-[1.08] tracking-tight mb-3.5"
          style={{ fontSize: 'clamp(32px, 5.5vw, 62px)' }}
        >
          Gerbang Digital
          <br />
          <span className="gradient-text">Maluku Utara</span>
        </h1>

        {/* Subtitle */}
        <p
          className="max-w-[460px] mx-auto mb-7 leading-relaxed"
          style={{ fontSize: 15, color: 'var(--text-muted)' }}
        >
          Satu platform untuk berita lokal, transportasi laut, kos & properti,
          hingga donasi kemanusiaan.
        </p>

        {/* Search bar */}
        <div
          className="flex items-center gap-3 max-w-[560px] mx-auto mb-4 rounded-full pl-6 pr-1.5 py-1.5"
          style={{
            background: '#fff',
            border: '1.5px solid var(--border-light)',
            boxShadow: '0 16px 48px rgba(53,37,205,0.10)',
          }}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="flex-shrink-0"
            aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Cari speedboat, kos, berita, atau layanan lain..."
            className="flex-1 border-none outline-none bg-transparent text-[14px]"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: 'var(--text)',
            }}
          />
          <button
            type="submit"
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ background: 'var(--primary)' }}
            aria-label="Cari"
          >
            <svg
              viewBox="0 0 24 24"
              width="17"
              height="17"
              fill="none"
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
        </div>

        {/* Popular tags */}
        <div className="flex flex-wrap justify-center gap-2 text-[12px]">
          <span
            className="self-center font-semibold text-[11px]"
            style={{ color: 'var(--text-light)' }}
          >
            Populer:
          </span>
          {POPULAR_TAGS.map((tag) => (
            <Link
              key={tag.href}
              href={tag.href}
              className="px-3 py-1 rounded-full font-medium transition-all duration-200"
              style={{
                background: '#fff',
                border: '1px solid var(--border-light)',
                color: 'var(--text-muted)',
              }}
            >
              {tag.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
