'use client'

// Pra-launch: stat speedboat (Ternate→Sidangoli) + dummy 10.000+ DICABUT.
// Diganti modul live (BAKABAR, BALAPOR) + statement jujur "Baru Diluncurkan di Ternate".
const STATS = [
  { d: 'M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2M18 14h-8M15 18h-5M10 6h8v4h-8Z', color: '#8B5CF6', label: 'Berita Terbaru',   value: 'Update Hari Ini',   sub: 'BAKABAR'      },
  { d: 'm3 11 19-9-9 19-2-8-8-2z',                                                                                                                    color: '#DC2626', label: 'Laporan Warga',    value: 'Suarakan Aspirasi', sub: 'BALAPOR'      },
  { d: 'M12 3l1.9 5.8 5.8 1.9-5.8 1.9L12 18.4l-1.9-5.8L4.3 10.7l5.8-1.9z',                                                                            color: '#E8963A', label: 'Baru Diluncurkan', value: 'di Ternate',        sub: 'Maluku Utara' },
]

function Icon({ d, color }: { d: string; color: string }) {
  return (
    <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke={color}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden
      style={{ flexShrink: 0 }}>
      {d.split(' M').map((seg, i) => <path key={i} d={i === 0 ? seg : 'M' + seg} />)}
    </svg>
  )
}

export default function StatsBar() {
  return (
    <div
      style={{
        background: '#fff',
        borderTop: '1px solid var(--border-light)',
        borderBottom: '1px solid var(--border-light)',
        overflowX: 'auto',
      }}
      className="service-scroll"
    >
      <div style={{
        display: 'flex',
        minWidth: '100%',
        width: 'max-content',
      }}>
        {STATS.map((stat, i) => (
          <div
            key={stat.label}
            style={{
              flex: '1 0 auto',
              minWidth: 160,
              padding: '10px 20px',
              borderRight: i < STATS.length - 1 ? '1px solid var(--border-light)' : 'none',
              display: 'flex', flexDirection: 'column', gap: 2,
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 10, fontWeight: 600, color: 'var(--text-light)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              <Icon d={stat.d} color={stat.color} />
              {stat.label}
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-light)' }}>
              {stat.sub}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
