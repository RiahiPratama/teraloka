'use client'

const STATS = [
  { icon: '⛵', label: 'Jadwal Terdekat',  value: 'Cek Antrian',   sub: 'Ternate → Sidangoli' },
  { icon: '📰', label: 'Berita Terbaru',   value: 'Update Hari Ini', sub: 'BAKABAR'            },
  { icon: '👥', label: 'Pengguna Aktif',   value: '10.000+',        sub: 'Orang'               },
]

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
              fontSize: 10, fontWeight: 600, color: 'var(--text-light)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {stat.icon} {stat.label}
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
