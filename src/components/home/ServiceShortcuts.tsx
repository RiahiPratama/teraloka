'use client'

import Link from 'next/link'

const SHORTCUTS = [
  { icon: '⛵', label: 'Speedboat', href: '/speed',       color: '#0891B2', bg: 'rgba(8,145,178,0.08)'   },
  { icon: '🏠', label: 'Kos',       href: '/kos',         color: '#1B6B4A', bg: 'rgba(27,107,74,0.08)'  },
  { icon: '📰', label: 'Berita',    href: '/news',        color: '#003526', bg: 'rgba(0,53,38,0.06)'    },
  { icon: '💚', label: 'Donasi',    href: '/fundraising', color: '#E8963A', bg: 'rgba(232,150,58,0.08)' },
  { icon: '📢', label: 'Laporan',   href: '/reports',     color: '#7c3aed', bg: 'rgba(124,58,237,0.07)' },
]

export default function ServiceShortcuts() {
  return (
    <div
      style={{ padding: '12px 16px 4px', overflowX: 'auto' }}
      className="service-scroll"
    >
      <div style={{ display: 'flex', gap: 10, paddingBottom: 4, width: 'max-content' }}>
        {SHORTCUTS.map(s => (
          <Link key={s.href} href={s.href} style={{ textDecoration: 'none', flexShrink: 0 }}>
            <div
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '10px 14px',
                background: '#fff',
                borderRadius: 14,
                border: '1px solid var(--border-light)',
                boxShadow: '0 2px 8px rgba(0,53,38,0.05)',
                minWidth: 66,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLElement).style.background = s.bg
                ;(e.currentTarget as HTMLElement).style.borderColor = s.color + '40'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.background = '#fff'
                ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'
                ;(e.currentTarget as HTMLElement).style.transform = 'none'
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{s.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: s.color, whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
            </div>
          </Link>
        ))}

        {/* Lainnya */}
        <Link href="/layanan" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            padding: '10px 14px',
            background: 'rgba(0,53,38,0.03)',
            borderRadius: 14,
            border: '1.5px dashed var(--border-light)',
            minWidth: 66,
          }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>＋</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Lainnya
            </span>
          </div>
        </Link>
      </div>
    </div>
  )
}
