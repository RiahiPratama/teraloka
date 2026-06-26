'use client'

import Link from 'next/link'

// Pra-launch: speedboat & kapal lokal disembunyikan (route /bapasiar belum ada → 404).
// `hidden: true` gampang dibuang pas launch. Warna = brand kanonik per modul.
const PILLS = [
  { iconPath: 'M2 16c3-3.5 7-5 12-4.5l7 1.5-1 5H2z M2 16h20 M3 19.5c4.5-1 9-1 13 0', label: 'Speedboat',  sub: 'Cek antrian',  href: '/bapasiar/speedboat',  color: '#0891B2', bg: 'rgba(8,145,178,0.08)',  border: 'rgba(8,145,178,0.2)',  hidden: true },
  { iconPath: 'M3 18l2-7h14l2 7H3z M12 11V4 M12 4 L7 9 M12 4 L17 8 M2 21 Q12 19 22 21', label: 'Kapal Lokal', sub: 'Rute malam', href: '/bapasiar/kapal-lokal', color: '#0891B2', bg: 'rgba(8,145,178,0.07)',  border: 'rgba(8,145,178,0.18)', hidden: true },
  { iconPath: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10', label: 'BAKOS', sub: 'Cari kos', href: '/bakos', color: '#D97706', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.2)' },
  { iconPath: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z', label: 'BADONASI', sub: 'Donasi aktif', href: '/fundraising/badonasi', color: '#EC4899', bg: 'rgba(236,72,153,0.07)', border: 'rgba(236,72,153,0.2)' },
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
        {PILLS.filter(pill => !pill.hidden).map(pill => (
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
              }}>
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={pill.color}
                  strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {pill.iconPath.split(' M').map((seg, i) => <path key={i} d={i === 0 ? seg : 'M' + seg} />)}
                </svg>
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
