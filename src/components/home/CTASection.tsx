import Link from 'next/link'

export default function CTASection() {
  return (
    <section style={{ padding: '0 24px 72px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div
          className="cta-bg"
          style={{
            borderRadius: 24, padding: '52px 48px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 32, position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Decorative orb */}
          <div style={{
            position: 'absolute', top: -60, right: 80,
            width: 280, height: 280, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)', filter: 'blur(40px)',
            pointerEvents: 'none',
          }} />

          {/* Text */}
          <div style={{ position: 'relative', zIndex: 1, maxWidth: 520 }}>
            <h2 className="font-sora" style={{
              fontSize: 'clamp(20px, 3vw, 28px)',
              fontWeight: 800, color: '#fff', marginBottom: 8, lineHeight: 1.2,
            }}>
              Jadi Bagian dari Gerakan Digital Maluku Utara
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(149,211,186,0.85)', lineHeight: 1.6 }}>
              Laporkan, bagikan, bantu, dan kembangkan bersama TeraLoka.
            </p>
          </div>

          {/* Buttons */}
          <div style={{
            display: 'flex', gap: 12, flexShrink: 0,
            position: 'relative', zIndex: 1,
          }}>
            <Link href="/login" style={{
              textDecoration: 'none',
              background: '#fff', color: 'var(--primary)',
              fontSize: 14, fontWeight: 800,
              padding: '12px 24px', borderRadius: 99,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              transition: 'transform 0.2s',
            }}>
              Daftar Gratis →
            </Link>
            <Link href="/news" style={{
              textDecoration: 'none',
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#fff',
              fontSize: 14, fontWeight: 700,
              padding: '12px 24px', borderRadius: 99,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              backdropFilter: 'blur(8px)',
              transition: 'background 0.2s',
            }}>
              Pelajari Lebih Lanjut →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
