// SocialProof.tsx — Section 05: Dipercaya oleh Warga Maluku Utara
// Simpan ke: src/components/home/SocialProof.tsx

const STATS = [
  {
    icon: '👥',
    num: '10.000+',
    label: 'Pengguna Terdaftar',
    color: '#0891B2',
    bg: 'rgba(8,145,178,0.1)',
  },
  {
    icon: '📢',
    num: '500+',
    label: 'Laporan Warga',
    color: '#003526',
    bg: 'rgba(0,53,38,0.08)',
  },
  {
    icon: '🏪',
    num: '200+',
    label: 'UMKM Terhubung',
    color: '#E8963A',
    bg: 'rgba(232,150,58,0.1)',
  },
  {
    icon: '💚',
    num: '50+',
    label: 'Kampanye Donasi',
    color: '#16a34a',
    bg: 'rgba(22,163,74,0.1)',
  },
]

export default function SocialProof() {
  return (
    <section
      className="stats-dark-bg"
      style={{ padding: '72px 24px', position: 'relative', overflow: 'hidden' }}
    >
      {/* Glow orbs */}
      <div style={{
        position: 'absolute', top: -60, right: -60,
        width: 320, height: 320, borderRadius: '50%',
        background: 'rgba(8,145,178,0.15)', filter: 'blur(80px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -60, left: -60,
        width: 320, height: 320, borderRadius: '50%',
        background: 'rgba(0,53,38,0.3)', filter: 'blur(80px)', pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 className="font-sora" style={{
            fontSize: 'clamp(22px, 3.5vw, 36px)',
            fontWeight: 800, color: '#fff', marginBottom: 8,
          }}>
            Dipercaya oleh Warga Maluku Utara
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(149,211,186,0.7)' }}>
            TeraLoka hadir untuk menghubungkan, memudahkan, dan membantu.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {STATS.map(stat => (
            <div key={stat.label} style={{
              textAlign: 'center',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20, padding: '28px 16px',
              backdropFilter: 'blur(10px)',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: stat.bg, margin: '0 auto 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
              }}>
                {stat.icon}
              </div>
              <div className="font-sora" style={{
                fontSize: 36, fontWeight: 800, color: '#fff',
                letterSpacing: '-0.03em', marginBottom: 4,
              }}>
                {stat.num}
              </div>
              <div style={{
                fontSize: 12, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: 'rgba(149,211,186,0.7)',
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
