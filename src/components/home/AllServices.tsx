"use client"

import Link from 'next/link'
import { SERVICES } from '@/lib/data/services'

export default function AllServices() {
  return (
    <section
      style={{
        background: '#fff',
        borderTop: '1px solid var(--border-light)',
        borderBottom: '1px solid var(--border-light)',
        padding: '52px 24px',
      }}
    >
      <div className="max-w-[1100px] mx-auto">
        {/* Header */}
        <div className="flex justify-between items-end mb-9">
          <div>
            <h2
              className="font-sora font-extrabold tracking-tight"
              style={{ fontSize: 'clamp(22px, 3vw, 30px)', color: 'var(--text)' }}
            >
              Semua Layanan
            </h2>
            <p className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>
              13 layanan digital untuk kebutuhan harian warga Maluku Utara.
            </p>
          </div>
        </div>

        {/* Flex wrap grid — auto center baris terakhir */}
        <div className="flex flex-wrap justify-center gap-1">
          {SERVICES.map((svc) => (
            <Link
              key={svc.name}
              href={svc.href}
              className="group flex flex-col items-center text-center rounded-2xl transition-all duration-250"
              style={{
                width: 140,
                padding: '20px 12px 18px',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--surface-low)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              {/* Icon box */}
              <div
                className="flex items-center justify-center mb-3 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:scale-110"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  background: svc.gridBg,
                  border: `1.5px solid ${svc.gridBorder}`,
                  flexShrink: 0,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width={28}
                  height={28}
                  fill="none"
                  stroke={svc.gridStroke}
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {svc.iconPath.split(' M').map((seg, i) => (
                    <path key={i} d={i === 0 ? seg : 'M' + seg} />
                  ))}
                </svg>
              </div>

              {/* Name */}
              <span
                className="text-[13px] font-bold leading-tight mb-0.5 whitespace-nowrap"
                style={{ color: 'var(--text)' }}
              >
                {svc.name}
              </span>

              {/* Sub */}
              <span
                className="text-[11px] leading-snug whitespace-nowrap"
                style={{ color: 'var(--text-light)' }}
              >
                {svc.sub}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
