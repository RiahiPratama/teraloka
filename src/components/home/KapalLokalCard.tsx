'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1'

interface ShipRoute {
  id: string
  name: string
  stops: { order: number; port_name: string }[]
  base_price_bed: number
  base_price_cabin: number | null
  frequency: string
  is_active: boolean
}

export default function KapalLokalCard() {
  const [routes, setRoutes] = useState<ShipRoute[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/transport/ship/routes`)
      .then(r => r.json())
      .then(d => { if (d.success) setRoutes(d.data || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const route = routes[0]
  const stopNames = route?.stops?.map(s => s.port_name).join(' · ') ?? ''
  const originDest = route ? `${route.name.split('→')[0].trim()} → ${route.stops[route.stops.length - 1]?.port_name ?? ''}` : '—'

  return (
    <Link href="/ship" style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, #003526 0%, #1B6B4A 100%)',
          borderRadius: 20,
          padding: '20px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,53,38,0.25)',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(0,53,38,0.35)'
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLElement).style.transform = 'none'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,53,38,0.25)'
        }}
      >
        {/* Dekorasi background */}
        <div style={{
          position: 'absolute', right: -20, top: -10,
          fontSize: 120, opacity: 0.06, lineHeight: 1,
          userSelect: 'none', pointerEvents: 'none',
        }}>🚢</div>

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 99, padding: '3px 10px', marginBottom: 14,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#4ade80', display: 'inline-block', flexShrink: 0,
          }} />
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
            color: '#fff', textTransform: 'uppercase',
          }}>
            KAPAL LOKAL · BAPASIAR
          </span>
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', marginBottom: 10,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 2 }}>
              {loading ? 'Memuat rute...' : 'Kapal Malam Lokal'}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
              {loading ? '—' : originDest}
            </div>
          </div>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>🚢</div>
        </div>

        {/* Stops */}
        {!loading && stopNames && (
          <div style={{
            fontSize: 11, color: 'rgba(255,255,255,0.65)',
            marginBottom: 8,
          }}>
            🛑 Singgah: {stopNames}
          </div>
        )}

        {/* Frekuensi */}
        {!loading && route?.frequency && (
          <div style={{
            fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 10,
          }}>
            🗓️ {route.frequency}
          </div>
        )}

        {/* Harga */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>
            Mulai dari
          </div>
          <div style={{
            fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em',
          }}>
            {loading
              ? '—'
              : `Rp ${(route?.base_price_bed ?? 0).toLocaleString('id-ID')}`}
          </div>
          {route?.base_price_cabin && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
              Kabin: Rp {route.base_price_cabin.toLocaleString('id-ID')}
            </div>
          )}
        </div>

        {/* CTA */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Lihat Semua Rute</span>
          <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)' }}>→</span>
        </div>
      </div>
    </Link>
  )
}
