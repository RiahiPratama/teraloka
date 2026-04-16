'use client'

import Link from 'next/link'
import SpeedboatCard from './SpeedboatCard'

const HERO_PHOTO_URL = process.env.NEXT_PUBLIC_HERO_BG_URL || ''

export default function HeroMobile() {
  return (
    <section
      className="md:hidden"
      style={{
        position: 'relative',
        paddingTop: 72,
        paddingBottom: 0,
        background: 'var(--surface)',
        overflow: 'hidden',
      }}
    >
      {/* Background foto/gradient */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 220,
        zIndex: 0,
      }}>
        {HERO_PHOTO_URL ? (
          <img
            src={HERO_PHOTO_URL}
            alt="Ternate, Maluku Utara"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(160deg, #002a1e 0%, #1B6B4A 40%, #0891B2 100%)',
          }} />
        )}
        {/* Overlay fade ke bawah */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,53,38,0.2) 0%, var(--surface) 85%)',
        }} />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 16px 20px' }}>

        {/* Tagline singkat */}
        <div style={{ paddingTop: 16, marginBottom: 20, textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(0,53,38,0.1)',
            borderRadius: 99, padding: '5px 14px', marginBottom: 10,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8963A', display: 'inline-block' }} />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--primary)', textTransform: 'uppercase' }}>
              Super App Maluku Utara
            </span>
          </div>
          <h1 className="font-sora" style={{
            fontSize: 22, fontWeight: 800, lineHeight: 1.2,
            letterSpacing: '-0.02em', color: 'var(--text)', margin: 0,
          }}>
            Semua Ada di <span style={{ color: 'var(--cyan)' }}>TeraLoka</span>
          </h1>
        </div>

        {/* Card Speedboat UTAMA */}
        <div style={{ marginBottom: 12 }}>
          <SpeedboatCard />
        </div>

        {/* 2 Card Sekunder */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 4 }}>

          {/* BAKOS */}
          <Link href="/kos" style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#fff',
              border: '1.5px solid rgba(27,107,74,0.15)',
              borderRadius: 16, padding: '14px',
              boxShadow: '0 4px 16px rgba(27,107,74,0.08)',
              transition: 'transform 0.15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none' }}
            >
              <span style={{
                fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.07em', color: '#1B6B4A',
                background: 'rgba(27,107,74,0.08)',
                padding: '2px 8px', borderRadius: 99,
                display: 'inline-block', marginBottom: 8,
              }}>BAKOS</span>
              <div style={{ fontSize: 15, marginBottom: 4 }}>🏠</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>
                Cari Kos
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.4 }}>
                Mulai 450rb/bln
              </div>
              <div style={{
                fontSize: 11, fontWeight: 700, color: '#1B6B4A',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                Lihat Kos <span>→</span>
              </div>
            </div>
          </Link>

          {/* BASUMBANG */}
          <Link href="/fundraising" style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#fff',
              border: '1.5px solid rgba(232,150,58,0.15)',
              borderRadius: 16, padding: '14px',
              boxShadow: '0 4px 16px rgba(232,150,58,0.08)',
              transition: 'transform 0.15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none' }}
            >
              <span style={{
                fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.07em', color: '#E8963A',
                background: 'rgba(232,150,58,0.08)',
                padding: '2px 8px', borderRadius: 99,
                display: 'inline-block', marginBottom: 8,
              }}>BASUMBANG</span>
              <div style={{ fontSize: 15, marginBottom: 4 }}>💚</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>
                Donasi Aktif
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.4 }}>
                Bantu yang butuh
              </div>
              <div style={{
                fontSize: 11, fontWeight: 700, color: '#E8963A',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                Lihat Donasi <span>→</span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  )
}
