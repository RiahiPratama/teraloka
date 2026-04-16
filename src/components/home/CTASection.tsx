'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function CTASection() {
  const [primaryHover, setPrimaryHover] = useState(false)
  const [secondaryHover, setSecondaryHover] = useState(false)

  return (
    <section style={{ padding: '0 24px 96px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div
          className="cta-bg"
          style={{
            borderRadius: 28,
            padding: 'clamp(40px, 5vw, 64px) clamp(28px, 5vw, 64px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 40,
            position: 'relative',
            overflow: 'hidden',
            flexWrap: 'wrap',
          }}
        >
          {/* Decorative orbs */}
          <div style={{
            position: 'absolute', top: -80, right: 60,
            width: 320, height: 320, borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)', filter: 'blur(60px)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: -60, left: '30%',
            width: 240, height: 240, borderRadius: '50%',
            background: 'rgba(8,145,178,0.15)', filter: 'blur(50px)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: '50%', left: -40,
            width: 160, height: 160, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)', filter: 'blur(30px)',
            pointerEvents: 'none', transform: 'translateY(-50%)',
          }} />

          {/* ── Text ── */}
          <div style={{ position: 'relative', zIndex: 1, maxWidth: 540, flex: '1 1 300px' }}>
            {/* Eyebrow */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 99, padding: '5px 14px', marginBottom: 18,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8963A', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>
                Gerakan Digital Maluku Utara
              </span>
            </div>

            <h2
              className="font-sora"
              style={{
                fontSize: 'clamp(22px, 3.5vw, 34px)',
                fontWeight: 800,
                color: '#fff',
                marginBottom: 12,
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
              }}
            >
              Jadi Bagian dari<br />
              <span style={{ color: 'rgba(149,211,186,0.95)' }}>Gerakan Digital</span>{' '}
              Maluku Utara
            </h2>
            <p style={{
              fontSize: 15,
              color: 'rgba(149,211,186,0.75)',
              lineHeight: 1.65,
              maxWidth: 420,
            }}>
              Laporkan, bagikan, bantu, dan kembangkan bersama TeraLoka. Platform untuk semua warga kepulauan.
            </p>
          </div>

          {/* ── Buttons ── */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
            flex: '0 0 auto',
            minWidth: 200,
          }}>
            <Link
              href="/login"
              style={{
                textDecoration: 'none',
                background: primaryHover ? '#f0fdf4' : '#fff',
                color: 'var(--primary)',
                fontSize: 14,
                fontWeight: 800,
                padding: '14px 32px',
                borderRadius: 99,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: primaryHover
                  ? '0 8px 32px rgba(0,0,0,0.25)'
                  : '0 4px 20px rgba(0,0,0,0.18)',
                transform: primaryHover ? 'translateY(-2px)' : 'none',
                transition: 'all 0.2s ease',
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={() => setPrimaryHover(true)}
              onMouseLeave={() => setPrimaryHover(false)}
            >
              Daftar Gratis →
            </Link>
            <Link
              href="/news"
              style={{
                textDecoration: 'none',
                background: secondaryHover ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.12)',
                border: '1.5px solid rgba(255,255,255,0.3)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                padding: '13px 32px',
                borderRadius: 99,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backdropFilter: 'blur(8px)',
                transform: secondaryHover ? 'translateY(-2px)' : 'none',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={() => setSecondaryHover(true)}
              onMouseLeave={() => setSecondaryHover(false)}
            >
              Pelajari Lebih Lanjut →
            </Link>

            {/* Trust indicators */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              justifyContent: 'center',
              marginTop: 4,
            }}>
              <div style={{ display: 'flex' }}>
                {['#1B6B4A','#0891B2','#E8963A','#6366F1'].map((c, i) => (
                  <div key={i} style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: c, border: '2px solid rgba(255,255,255,0.4)',
                    marginLeft: i === 0 ? 0 : -7,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: '#fff', fontWeight: 700,
                  }}>
                    {['R','A','S','T'][i]}
                  </div>
                ))}
              </div>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                10.000+ warga bergabung
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
