// Pra-launch (Jun 2026): metrik angka (10.000+ user dll) DICABUT — platform baru
// diluncurkan, klaim angka = palsu. Diganti 4 NILAI/KOMITMEN kualitatif yang jujur
// + jadi diferensiator civic (independen, lokal, transparan, responsif).
const VALUES = [
  { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', title: 'Independen', desc: 'Editorial bebas, tanpa pesanan sponsor', bg: 'rgba(8,145,178,0.12)' },
  { d: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z M15 10a3 3 0 1 1-6 0 3 3 0 1 1 6 0Z', title: 'Lokal', desc: 'Dari & untuk warga Maluku Utara', bg: 'rgba(27,107,74,0.14)' },
  { d: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', title: 'Transparan', desc: 'Donasi non-custodial, dana langsung ke tujuan', bg: 'rgba(232,150,58,0.14)' },
  { d: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', title: 'Responsif', desc: 'Laporan warga kami terima, yang penting diangkat jadi berita', bg: 'rgba(22,163,74,0.14)' },
]

function Icon({ d, size = 24, color = '#fff' }: { d: string; size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color}
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {d.split(' M').map((seg, i) => <path key={i} d={i === 0 ? seg : 'M' + seg} />)}
    </svg>
  )
}

export default function SocialProof() {
  return (
    <section
      className="stats-dark-bg"
      style={{ padding: '72px 24px', position: 'relative', overflow: 'hidden' }}
    >
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
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 className="font-sora" style={{
            fontSize: 'clamp(22px, 3.5vw, 36px)',
            fontWeight: 800, color: '#fff', marginBottom: 8,
          }}>
            Dibangun untuk Warga Maluku Utara
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(149,211,186,0.7)' }}>
            TeraLoka hadir untuk menghubungkan, memudahkan, dan membantu.
          </p>
        </div>

        {/* grid-cols-2 mobile, grid-cols-4 desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {VALUES.map(item => (
            <div key={item.title} style={{
              textAlign: 'center',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20, padding: '28px 16px',
              backdropFilter: 'blur(10px)',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: item.bg, margin: '0 auto 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon d={item.d} size={24} color="#fff" />
              </div>
              <div className="font-sora" style={{
                fontSize: 'clamp(18px, 3vw, 22px)',
                fontWeight: 800, color: '#fff',
                letterSpacing: '-0.02em', marginBottom: 6,
              }}>
                {item.title}
              </div>
              <div style={{
                fontSize: 12, fontWeight: 500,
                lineHeight: 1.5, color: 'rgba(149,211,186,0.75)',
              }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
