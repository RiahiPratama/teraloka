'use client'

import Link from 'next/link'

const PILLS = [
  { icon: '⛵', label: 'Speedboat',  sub: 'Cek antrian',    href: '/bapasiar/speedboat',  color: '#0891B2', bg: 'rgba(8,145,178,0.08)',   border: 'rgba(8,145,178,0.2)'   },
  { icon: '🚢', label: 'Kapal Lokal', sub: 'Rute malam',   href: '/bapasiar/kapal-lokal', color: '#1B6B4A', bg: 'rgba(27,107,74,0.07)',   border: 'rgba(27,107,74,0.18)'  },
  { icon: '🏠', label: 'BAKOS',      sub: 'Kos & properti', href: '/bakos',               color: '#1B6B4A', bg: 'rgba(27,107,74,0.07)',   border: 'rgba(27,107,74,0.18)'  },
  { icon: '💖', label: 'BADONASI',  sub: 'Donasi aktif',   href: '/fundraising',          color: '#EC4899', bg: 'rgba(236,72,153,0.07)',  border: 'rgba(236,72,153,0.2)'  },
]

export default function ServicePills() {
  return (
    <div style={{
      padding: '0 16px 16px',
      overflowX: 'auto',
    }}
      className="service-scroll"
    >
      <div style={{
        display: 'flex',
        gap: 10,
        width: 'max-content',
        paddingBottom: 2,
      }}>
        {PILLS.map(pill => (
          <Link key={pill.href} href={pill.href} style={{ textDecoration: 'none', flexShrink: 0 }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#fff',
                border: `1.5px solid ${pill.border}`,
                borderRadius: 14,
                padding: '10px 14px',
                minWidth: 140,
                boxShadow: '0 2px 8px rgba(0,53,38,0.05)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLElement).style.background = pill.bg
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(0,53,38,0.1)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.background = '#fff'
                ;(e.currentTarget as HTMLElement).style.transform = 'none'
                ;(e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,53,38,0.05)'
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: pill.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>
                {pill.icon}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: pill.color, lineHeight: 1.2 }}>
                  {pill.label}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 1 }}>
                  {pill.sub}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
