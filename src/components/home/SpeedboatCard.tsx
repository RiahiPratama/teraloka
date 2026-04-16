'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1'

interface QueueEntry {
  id: string
  passenger_count: number
  capacity: number
  status: string
  route?: {
    origin: { name: string }
    destination: { name: string }
    base_price: number
  }
}

interface Route {
  id: string
  origin: { name: string; slug: string }
  destination: { name: string; slug: string }
  base_price: number
}

export default function SpeedboatCard() {
  const [queue, setQueue] = useState<QueueEntry[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/transport/queue/bastiong`).then(r => r.json()),
      fetch(`${API}/transport/routes`).then(r => r.json()),
    ])
      .then(([qData, rData]) => {
        if (qData.success) setQueue(qData.data.queue || [])
        if (rData.success) setRoutes(rData.data || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const firstQueue = queue[0]
  const firstRoute = routes[0]

  const hasActive = queue.length > 0
  const seatLeft = firstQueue
    ? (firstQueue.capacity || 12) - (firstQueue.passenger_count || 0)
    : 0
  const price =
    firstQueue?.route?.base_price ??
    firstRoute?.base_price ??
    75000
  const origin = firstQueue?.route?.origin?.name ?? firstRoute?.origin?.name ?? 'Bastiong'
  const dest   = firstQueue?.route?.destination?.name ?? firstRoute?.destination?.name ?? 'Sidangoli'

  return (
    <Link href="/speed" style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          background: hasActive
            ? 'linear-gradient(135deg, #0891B2 0%, #0369a1 100%)'
            : 'linear-gradient(135deg, #1B6B4A 0%, #003526 100%)',
          borderRadius: 20,
          padding: '20px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(8,145,178,0.25)',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(8,145,178,0.35)'
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLElement).style.transform = 'none'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(8,145,178,0.25)'
        }}
      >
        {/* Dekorasi background */}
        <div style={{
          position: 'absolute', right: -16, top: -16,
          fontSize: 110, opacity: 0.07, lineHeight: 1,
          userSelect: 'none', pointerEvents: 'none',
        }}>⛵</div>

        {/* Badge status */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 99, padding: '3px 10px', marginBottom: 14,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: hasActive ? '#4ade80' : '#fbbf24',
            display: 'inline-block', flexShrink: 0,
          }} />
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
            color: '#fff', textTransform: 'uppercase',
          }}>
            {loading ? 'Memuat...' : hasActive ? 'ANTRIAN AKTIF' : 'BAPASIAR'}
          </span>
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', marginBottom: 12,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 2 }}>
              Speedboat Hari Ini
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
              {origin} → {dest}
            </div>
          </div>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>⛵</div>
        </div>

        {/* Info */}
        <div style={{ marginBottom: 14 }}>
          {hasActive ? (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginBottom: 6 }}>
              👥 {seatLeft} kursi tersisa
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 6 }}>
              {loading ? 'Mengecek antrian...' : 'Belum ada antrian aktif saat ini'}
            </div>
          )}
          <div style={{
            fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em',
          }}>
            {loading ? '—' : `Rp ${price.toLocaleString('id-ID')}`}
          </div>
        </div>

        {/* CTA */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
            {hasActive ? 'Pesan Sekarang' : 'Lihat Jadwal'}
          </span>
          <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)' }}>→</span>
        </div>
      </div>
    </Link>
  )
}
