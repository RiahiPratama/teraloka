'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { SERVICES } from '@/lib/data/services'

// ── 4 layanan yang sudah aktif ────────────────────────────────
const ACTIVE = new Set(['BAKABAR', 'BALAPOR', 'BASUMBANG', 'BAKOS'])

// Href yang benar untuk layanan aktif
const ACTIVE_HREF: Record<string, string> = {
  'BAKABAR':    '/news',
  'BALAPOR':    '/reports',
  'BASUMBANG':  '/fundraising',
  'BAKOS':      '/kos',
}

export default function ServiceCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)
  const hasMoved = useRef(false)

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
      style={{
        background: '#fff',
        borderTop: '1px solid var(--border-light)',
        borderBottom: '1px solid var(--border-light)',
        padding: '20px 0',
      }}
    >
      {/* Fade left */}
      <div className="absolute top-0 bottom-0 left-0 w-16 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #fff 40%, transparent)' }} />
      {/* Fade right */}
      <div className="absolute top-0 bottom-0 right-0 w-16 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, #fff 40%, transparent)' }} />

      {/* Scrollable track */}
      <div
        ref={scrollRef}
        className="service-scroll flex gap-2 overflow-x-auto overflow-y-hidden select-none"
        style={{ padding: '4px 24px', cursor: 'grab' }}
        onMouseDown={onMouseDown}
        onMouseLeave={onMouseLeave}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
      >
        {SERVICES.map((svc) => {
          const isActive = ACTIVE.has(svc.name)
          const href = ACTIVE_HREF[svc.name] || svc.href

          const pill = (
            <div
              className="flex items-center gap-2.5 rounded-full flex-shrink-0 transition-all duration-200 relative"
              style={{
                padding: '10px 18px 10px 12px',
                background: isActive ? 'var(--surface-low)' : 'var(--surface-low)',
                border: `1.5px solid ${isActive ? 'transparent' : 'rgba(0,0,0,0.04)'}`,
                scrollSnapAlign: 'start',
                whiteSpace: 'nowrap',
                opacity: isActive ? 1 : 0.55,
                cursor: isActive ? 'pointer' : 'default',
              }}
              onMouseEnter={(e) => {
                if (!isActive) return
                const el = e.currentTarget
                el.style.background = '#fff'
                el.style.borderColor = 'rgba(53,37,205,0.18)'
                el.style.boxShadow = '0 4px 16px rgba(53,37,205,0.10)'
                el.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                if (!isActive) return
                const el = e.currentTarget
                el.style.background = 'var(--surface-low)'
                el.style.borderColor = 'transparent'
                el.style.boxShadow = 'none'
                el.style.transform = 'none'
              }}
            >
              {/* Icon */}
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: svc.carouselBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none"
                  stroke={svc.carouselStroke} strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round">
                  {svc.iconPath.split(' M').map((seg, i) => (
                    <path key={i} d={i === 0 ? seg : 'M' + seg} />
                  ))}
                </svg>
              </div>

              {/* Label */}
              <div>
                <div className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>
                  {svc.name}
                </div>
                <div className="text-[11px] mt-px" style={{ color: 'var(--text-light)' }}>
                  {svc.sub}
                </div>
              </div>

              {/* Coming Soon badge */}
              {!isActive && (
                <span style={{
                  position: 'absolute',
                  top: -6,
                  right: 4,
                  fontSize: 8,
                  fontWeight: 800,
                  letterSpacing: '0.4px',
                  textTransform: 'uppercase',
                  background: '#F3F4F6',
                  color: '#9CA3AF',
                  padding: '2px 6px',
                  borderRadius: 99,
                  border: '1px solid #E5E7EB',
                  whiteSpace: 'nowrap',
                }}>
                  Coming Soon
                </span>
              )}
            </div>
          )

          // Layanan aktif → bisa diklik
          if (isActive) {
            return (
              <Link
                key={svc.name}
                href={href}
                onClick={(e) => { if (hasMoved.current) e.preventDefault() }}
                style={{ textDecoration: 'none' }}
              >
                {pill}
              </Link>
            )
          }

          // Coming soon → tidak bisa diklik
          return (
            <div key={svc.name}>
              {pill}
            </div>
          )
        })}
      </div>
    </div>
  )
}
