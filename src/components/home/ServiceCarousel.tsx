'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { SERVICES } from '@/lib/data/services'

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
      <div
        className="absolute top-0 bottom-0 left-0 w-16 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #fff 40%, transparent)' }}
      />
      {/* Fade right */}
      <div
        className="absolute top-0 bottom-0 right-0 w-16 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, #fff 40%, transparent)' }}
      />

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
        {SERVICES.map((svc) => (
          <Link
            key={svc.name}
            href={svc.href}
            onClick={(e) => { if (hasMoved.current) e.preventDefault() }}
            className="flex items-center gap-2.5 rounded-full flex-shrink-0 transition-all duration-200 hover:-translate-y-0.5"
            style={{
              padding: '10px 18px 10px 12px',
              background: 'var(--surface-low)',
              border: '1.5px solid transparent',
              scrollSnapAlign: 'start',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget
              el.style.background = '#fff'
              el.style.borderColor = 'rgba(53,37,205,0.18)'
              el.style.boxShadow = '0 4px 16px rgba(53,37,205,0.10)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget
              el.style.background = 'var(--surface-low)'
              el.style.borderColor = 'transparent'
              el.style.boxShadow = 'none'
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: svc.carouselBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width={18}
                height={18}
                fill="none"
                stroke={svc.carouselStroke}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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
          </Link>
        ))}
      </div>
    </div>
  )
}
