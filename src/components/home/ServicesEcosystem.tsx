'use client'

import Link from 'next/link'
import { SERVICES, type Service } from '@/lib/data/services'

const ACTIVE = new Set(['BAKABAR', 'BALAPOR', 'BADONASI', 'BAKOS', 'BALAJU'])

// Sub-label ringkas KHUSUS grid ini. Kartu 2-kolom di mobile sempit, sub 2-kata
// ("Berita Lokal", "Donasi Kemanusiaan") wrap jadi 2 baris & "Kos-Kosan" patah di
// tanda hubung. Pakai versi 1-kata biar 1 baris rapi. services.ts dibiarkan UTUH
// supaya komponen lain yang pakai svc.sub gak ikut berubah.
const SHORT_SUB: Record<string, string> = {
  BAKABAR:  'Berita',
  BALAPOR:  'Laporan',
  BADONASI: 'Donasi',
  BAKOS:    'Kos-kosan',
  BALAJU:   'Ojek',
}

// Pra-launch (Jun 2026): landing cuma nampilin layanan live. Layanan "Segera"
// + tombol "Lihat Semua" (→ /layanan, route belum ada) disembunyikan via flag —
// gampang diaktifin lagi pas launch tanpa hapus kode/route.
const SHOW_COMING_SOON = false

const ACTIVE_HREF: Record<string, string> = {
  'BAKABAR':   '/bakabar',
  'BALAPOR':   '/reports',
  'BADONASI': '/fundraising/badonasi',
  'BAKOS':     '/bakos',
  'BALAJU':    '/balaju',
}

// BALAJU belum ada di SERVICES (lib/data/services.ts) — didefinisikan lokal biar
// muncul sebagai modul live ke-5 di grid (apa adanya, tanpa badge "Segera").
const BALAJU_SVC: Service = {
  name: 'BALAJU',
  sub: 'Ojek Lokal',
  href: '/balaju',
  iconPath: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  carouselBg: 'rgba(15,118,110,0.08)',
  carouselStroke: '#0F766E',
  gridBg: 'rgba(15,118,110,0.08)',
  gridBorder: 'rgba(15,118,110,0.15)',
  gridStroke: '#0F766E',
}

export default function ServicesEcosystem() {
  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px' }}>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <h2 className="font-sora" style={{
          fontSize: 'clamp(22px, 3vw, 30px)',
          fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)',
        }}>
          Layanan TeraLoka
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Semua layanan dalam satu ekosistem.
        </p>
      </div>

      {/* 2 kolom mobile → 5 kolom desktop (pra-launch: 5 modul live = 4 + BALAJU) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[...SERVICES.filter(svc => SHOW_COMING_SOON || ACTIVE.has(svc.name)), BALAJU_SVC].map(svc => {
          const isActive = ACTIVE.has(svc.name)
          const href = ACTIVE_HREF[svc.name] || svc.href

          const inner = (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px',
              background: '#fff',
              borderRadius: 16,
              border: `1.5px solid ${isActive ? 'transparent' : 'var(--border-light)'}`,
              boxShadow: isActive ? '0 2px 12px rgba(0,53,38,0.06)' : 'none',
              opacity: isActive ? 1 : 0.55,
              cursor: isActive ? 'pointer' : 'default',
              position: 'relative' as const,
              transition: 'all 0.2s',
              height: '100%',
            }}>
              {/* Icon */}
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: svc.gridBg,
                border: `1px solid ${svc.gridBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg viewBox="0 0 24 24" width={22} height={22} fill="none"
                  stroke={svc.gridStroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  {svc.iconPath.split(' M').map((seg, i) => (
                    <path key={i} d={i === 0 ? seg : 'M' + seg} />
                  ))}
                </svg>
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
                  {svc.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>
                  {SHORT_SUB[svc.name] ?? svc.sub}
                </div>
              </div>

              {/* Badge "Segera" buat card inactive (absolute, gak ganggu layout).
                  Card aktif sengaja TANPA panah → teks sub lega, mayoritas muat 1 baris. */}
              {!isActive && (
                <span style={{
                  position: 'absolute', top: -7, right: 8,
                  fontSize: 8, fontWeight: 800, letterSpacing: '0.3px',
                  textTransform: 'uppercase',
                  background: '#F3F4F6', color: '#9CA3AF',
                  padding: '2px 6px', borderRadius: 99,
                  border: '1px solid #E5E7EB',
                }}>
                  Segera
                </span>
              )}
            </div>
          )

          return isActive ? (
            <Link key={svc.name} href={href} style={{ textDecoration: 'none' }}
              onMouseEnter={e => {
                const el = e.currentTarget.querySelector('div') as HTMLElement
                if (el) {
                  el.style.boxShadow = '0 4px 20px rgba(0,53,38,0.12)'
                  el.style.borderColor = `${svc.gridBorder}`
                  el.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget.querySelector('div') as HTMLElement
                if (el) {
                  el.style.boxShadow = '0 2px 12px rgba(0,53,38,0.06)'
                  el.style.borderColor = 'transparent'
                  el.style.transform = 'none'
                }
              }}
            >
              {inner}
            </Link>
          ) : (
            <div key={svc.name}>{inner}</div>
          )
        })}

        {/* Lihat Semua Layanan — disembunyikan pra-launch (route /layanan belum ada) */}
        {SHOW_COMING_SOON && (
        <Link href="/layanan" style={{ textDecoration: 'none' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px',
            background: 'linear-gradient(135deg, rgba(0,53,38,0.04), rgba(8,145,178,0.04))',
            borderRadius: 16,
            border: '1.5px dashed var(--border-light)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            height: '100%',
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(0,53,38,0.06)'
              ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(0,53,38,0.04), rgba(8,145,178,0.04))'
              ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: 'rgba(0,53,38,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>+</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', lineHeight: 1.2 }}>
                Lihat Semua
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>
                Ekosistem lengkap
              </div>
            </div>
            <span style={{ fontSize: 14, color: 'var(--primary)', flexShrink: 0 }}>→</span>
          </div>
        </Link>
        )}
      </div>
    </section>
  )
}
