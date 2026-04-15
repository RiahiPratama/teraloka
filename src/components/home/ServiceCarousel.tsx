'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'

// Urutan sesuai permintaan + href yang benar
const ACTIVE_SERVICES = [
  { name: 'BAKABAR',   sub: 'Berita Lokal',       href: '/news',        bg: 'rgba(53,37,205,0.08)',   stroke: '#3525cd',  active: true },
  { name: 'BALAPOR',   sub: 'Laporan Publik',      href: '/reports',     bg: 'rgba(220,38,38,0.08)',  stroke: '#dc2626',  active: true },
  { name: 'BASUMBANG', sub: 'Donasi Kemanusiaan',  href: '/fundraising', bg: 'rgba(16,185,129,0.1)',  stroke: '#10b981',  active: true },
  { name: 'BAKOS',     sub: 'Kos-Kosan',           href: '/kos',         bg: 'rgba(5,150,105,0.1)',   stroke: '#059669',  active: true },
]

const COMING_SOON_SERVICES = [
  { name: 'Properti',         sub: 'Jual Beli Sewa',      href: '#', bg: 'rgba(245,158,11,0.1)',  stroke: '#d97706' },
  { name: 'Speedboat',        sub: 'BAPASIAR Speed',      href: '#', bg: 'rgba(8,145,178,0.1)',   stroke: '#0891B2' },
  { name: 'Kendaraan',        sub: 'Sewa & Jual',         href: '#', bg: 'rgba(139,92,246,0.1)',  stroke: '#7c3aed' },
  { name: 'Kapal Lokal',      sub: 'Overnight Multi-stop',href: '#', bg: 'rgba(14,116,144,0.1)',  stroke: '#0e7490' },
  { name: 'Feri',             sub: 'BAPASIAR Feri',       href: '#', bg: 'rgba(8,145,178,0.08)', stroke: '#0e7490' },
  { name: 'Pelni',            sub: 'Info & Jadwal',       href: '#', bg: 'rgba(27,107,74,0.1)',   stroke: '#1B6B4A' },
  { name: 'Jasa',             sub: 'Tukang & Teknisi',    href: '#', bg: 'rgba(236,72,153,0.1)',  stroke: '#db2777' },
  { name: 'PPOB',             sub: 'Bayar Tagihan',       href: '#', bg: 'rgba(99,102,241,0.1)',  stroke: '#6366f1' },
  { name: 'Event Lokal',      sub: 'Tiket & Kegiatan',   href: '#', bg: 'rgba(232,150,58,0.1)',  stroke: '#E8963A' },
]

// Icon paths per layanan
const ICONS: Record<string, string> = {
  'BAKABAR':    'M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2M18 14h-8M15 18h-5M10 6h8v4h-8Z',
  'BALAPOR':    'm3 11 19-9-9 19-2-8-8-2z',
  'BASUMBANG':  'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  'BAKOS':      'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  'Properti':   'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2 M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2',
  'Speedboat':  'M2 16c3-3.5 7-5 12-4.5l7 1.5-1 5H2z M2 16h20 M3 19.5c4.5-1 9-1 13 0',
  'Kendaraan':  'M1 3h15a1 1 0 0 1 1 1v9H1V4a1 1 0 0 1 0 0z M16 8h4l3 3v5h-7V8Z M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  'Kapal Lokal':'M3 18l2-7h14l2 7H3z M12 11V4 M12 4 L7 9 M12 4 L17 8 M2 21 Q12 19 22 21',
  'Feri':       'M1 13h22v6a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-6z M4 13V9h16v4 M9 9V6h6v3 M1 19h22',
  'Pelni':      'M2 17l2-6h16l2 6H2z M5 11V7h14v4 M10 7V4 M14 7V4 M1 20 Q12 18 23 20',
  'Jasa':       'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  'PPOB':       'M2 3h20a0 0 0 0 1 0 0v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V3z M8 21h8 M12 17v4',
  'Event Lokal':'M3 4h18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M16 2v4 M8 2v4 M3 10h18',
}

function ServicePill({ name, sub, href, bg, stroke, active, comingSoon }: {
  name: string; sub: string; href: string; bg: string; stroke: string; active?: boolean; comingSoon?: boolean
}) {
  const iconPath = ICONS[name] || 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'

  const pill = (
    <div
      className="flex items-center gap-2.5 rounded-full flex-shrink-0 transition-all duration-200 relative select-none"
      style={{
        padding: '10px 18px 10px 12px',
        background: 'var(--surface-low)',
        border: '1.5px solid transparent',
        whiteSpace: 'nowrap',
        opacity: comingSoon ? 0.5 : 1,
        cursor: active ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => {
        if (!active) return
        const el = e.currentTarget
        el.style.background = '#fff'
        el.style.borderColor = `${stroke}30`
        el.style.boxShadow = `0 4px 16px ${stroke}18`
        el.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        if (!active) return
        const el = e.currentTarget
        el.style.background = 'var(--surface-low)'
        el.style.borderColor = 'transparent'
        el.style.boxShadow = 'none'
        el.style.transform = 'none'
      }}
    >
      {/* Icon */}
      <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {iconPath.split(' M').map((seg, i) => (
            <path key={i} d={i === 0 ? seg : 'M' + seg} />
          ))}
        </svg>
      </div>

      {/* Label */}
      <div>
        <div className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>{name}</div>
        <div className="text-[11px] mt-px" style={{ color: 'var(--text-light)' }}>{sub}</div>
      </div>

      {/* Coming Soon badge */}
      {comingSoon && (
        <span style={{
          position: 'absolute', top: -7, right: 6,
          fontSize: 8, fontWeight: 800, letterSpacing: '0.4px',
          textTransform: 'uppercase',
          background: '#F3F4F6', color: '#9CA3AF',
          padding: '2px 6px', borderRadius: 99,
          border: '1px solid #E5E7EB',
          whiteSpace: 'nowrap',
        }}>
          Coming Soon
        </span>
      )}
    </div>
  )

  if (active) {
    return (
      <Link href={href} style={{ textDecoration: 'none', flexShrink: 0 }}>
        {pill}
      </Link>
    )
  }

  return <div style={{ flexShrink: 0 }}>{pill}</div>
}

export default function ServiceCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)
  const hasMoved = useRef(false)
  const [expanded, setExpanded] = useState(false)

  const onMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current
    if (!el) return
    isDragging.current = true
    hasMoved.current = false
    startX.current = e.pageX - el.offsetLeft
    scrollLeft.current = el.scrollLeft
    el.style.cursor = 'grabbing'
  }

  const onMouseLeave = () => {
    isDragging.current = false
    if (scrollRef.current) scrollRef.current.style.cursor = 'grab'
  }

  const onMouseUp = () => {
    isDragging.current = false
    if (scrollRef.current) scrollRef.current.style.cursor = 'grab'
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return
    e.preventDefault()
    hasMoved.current = true
    const x = e.pageX - scrollRef.current.offsetLeft
    scrollRef.current.scrollLeft = scrollLeft.current - (x - startX.current) * 1.2
  }

  return (
    <div
      className="relative"
      style={{ background: '#fff', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)', padding: '20px 0' }}
    >
      {/* Fade left */}
      <div className="absolute top-0 bottom-0 left-0 w-16 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #fff 40%, transparent)' }} />
      {/* Fade right — lebih pendek kalau expanded */}
      <div className="absolute top-0 bottom-0 right-0 z-10 pointer-events-none"
        style={{ width: expanded ? 40 : 80, background: 'linear-gradient(to left, #fff 40%, transparent)' }} />

      {/* Scrollable track */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto overflow-y-hidden"
        style={{ padding: '4px 24px', cursor: 'grab', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onMouseDown={onMouseDown}
        onMouseLeave={onMouseLeave}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
      >
        {/* 4 layanan aktif — selalu tampil */}
        {ACTIVE_SERVICES.map(svc => (
          <ServicePill key={svc.name} {...svc} active />
        ))}

        {/* Tombol expand */}
        {!expanded && (
          <button
            onClick={() => {
              setExpanded(true)
              // Scroll ke kanan setelah expand
              setTimeout(() => {
                if (scrollRef.current) {
                  scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' })
                }
              }, 50)
            }}
            className="flex items-center gap-2 rounded-full flex-shrink-0 transition-all duration-200"
            style={{
              padding: '10px 18px',
              background: 'var(--surface-low)',
              border: '1.5px dashed var(--border-light)',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--primary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fff'
              e.currentTarget.style.borderColor = 'var(--primary)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(53,37,205,0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface-low)'
              e.currentTarget.style.borderColor = 'var(--border-light)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <span style={{ fontSize: 16 }}>+</span>
            {COMING_SOON_SERVICES.length} layanan lainnya
          </button>
        )}

        {/* Coming soon — tampil setelah expand, bisa di-scroll */}
        {expanded && COMING_SOON_SERVICES.map(svc => (
          <ServicePill key={svc.name} {...svc} comingSoon />
        ))}

        {/* Tombol collapse */}
        {expanded && (
          <button
            onClick={() => {
              setExpanded(false)
              scrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' })
            }}
            className="flex items-center gap-1.5 rounded-full flex-shrink-0"
            style={{
              padding: '10px 14px',
              background: 'var(--surface-low)',
              border: '1.5px solid var(--border-light)',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-muted)',
            }}
          >
            ← Tutup
          </button>
        )}
      </div>
    </div>
  )
}
