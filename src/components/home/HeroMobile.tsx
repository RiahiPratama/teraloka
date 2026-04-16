'use client'

const HERO_PHOTO_URL = process.env.NEXT_PUBLIC_HERO_BG_URL || ''

export default function HeroMobile() {
  return (
    <section
      className="md:hidden"
      style={{
        position: 'relative',
        paddingTop: 72,
        paddingBottom: 20,
        background: 'var(--surface)',
        overflow: 'hidden',
        minHeight: 180,
      }}
    >
      {/* Background foto/gradient */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 0,
      }}>
        {HERO_PHOTO_URL ? (
          <img
            src={HERO_PHOTO_URL}
            alt="Ternate, Maluku Utara"
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center 30%',
            }}
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
          background: 'linear-gradient(to bottom, rgba(0,53,38,0.15) 0%, var(--surface) 92%)',
        }} />
      </div>

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1,
        padding: '16px 16px 0',
        textAlign: 'center',
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(0,53,38,0.1)',
          borderRadius: 99, padding: '5px 14px', marginBottom: 10,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#E8963A', display: 'inline-block',
          }} />
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
            color: 'var(--primary)', textTransform: 'uppercase',
          }}>
            Super App Maluku Utara
          </span>
        </div>

        <h1 className="font-sora" style={{
          fontSize: 24, fontWeight: 800, lineHeight: 1.2,
          letterSpacing: '-0.02em', color: 'var(--text)', margin: 0,
        }}>
          Semua Ada di{' '}
          <span style={{ color: 'var(--cyan)' }}>TeraLoka</span>
        </h1>
      </div>
    </section>
  )
}
