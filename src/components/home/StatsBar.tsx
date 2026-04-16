'use client'

import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1'

export default function StatsBar() {
  const [weather, setWeather] = useState<{
    suhu?: number
    cuaca?: { label?: string; icon?: string }
  } | null>(null)

  useEffect(() => {
    fetch(`${API}/public/weather`)
      .then(r => r.json())
      .then(d => { if (d.success) setWeather(d.data) })
      .catch(() => {})
  }, [])

  const STATS = [
    {
      icon: weather?.cuaca?.icon ?? '☁️',
      label: 'Cuaca Ternate',
      value: weather
        ? `${weather.suhu ?? 27}°C · ${weather.cuaca?.label ?? 'Berawan'}`
        : '—',
    },
    { icon: '⛵', label: 'Jadwal Terdekat',  value: 'Cek Antrian'   },
    { icon: '📰', label: 'Berita Hari Ini',  value: 'Update Terbaru' },
    { icon: '👥', label: 'Pengguna Aktif',   value: '10.000+'       },
  ]

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
      <div style={{ display: 'flex', minWidth: '100%', width: 'max-content' }}>
        {STATS.map((stat, i) => (
          <div
            key={stat.label}
            style={{
              flex: '1 0 auto',
              minWidth: 150,
              padding: '10px 18px',
              borderRight: i < STATS.length - 1 ? '1px solid var(--border-light)' : 'none',
              display: 'flex', flexDirection: 'column', gap: 3,
            }}
          >
            <div style={{
              fontSize: 10, fontWeight: 600, color: 'var(--text-light)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {stat.icon} {stat.label}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
