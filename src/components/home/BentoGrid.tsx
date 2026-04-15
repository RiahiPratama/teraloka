import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1'

async function getLatestArticle() {
  try {
    const res = await fetch(`${API}/content/articles?limit=1`, {
      next: { revalidate: 300 }, // refresh tiap 5 menit
    })
    const data = await res.json()
    if (data.success && data.data?.length > 0) return data.data[0]
    return null
  } catch {
    return null
  }
}

async function getReportStats() {
  try {
    const res = await fetch(`${API}/content/reports/public-stats`, {
      next: { revalidate: 600 },
    })
    const data = await res.json()
    return data.data || null
  } catch {
    return null
  }
}

function timeAgo(dateStr: string) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'Baru saja'
  if (h < 24) return `${h} jam lalu`
  return `${Math.floor(h / 24)} hari lalu`
}

export default async function BentoGrid() {
  const [latestArticle] = await Promise.all([
    getLatestArticle(),
  ])

  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <h2 className="font-sora" style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>
            Layanan Unggulan
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Semua yang kamu butuhkan, dalam satu genggaman.
          </p>
        </div>
        <Link href="/layanan" style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
          Lihat Semua →
        </Link>
      </div>

      {/* ROW 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 14, marginBottom: 14 }}>

        {/* BAKABAR — dengan live headline */}
        <Link href="/news" style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: '#fff', border: '1px solid var(--border-light)', minHeight: 252, padding: 26, textDecoration: 'none', display: 'flex', flexDirection: 'column' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(53,37,205,.03) 0%,transparent 60%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: 'rgba(53,37,205,.08)', color: 'var(--primary)', marginBottom: 12 }}>
              📰 BAKABAR · Berita
            </span>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(53,37,205,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2M18 14h-8M15 18h-5M10 6h8v4h-8Z"/>
              </svg>
            </div>
            <h3 className="font-sora" style={{ fontSize: 19, fontWeight: 800, marginBottom: 6, color: 'var(--text)' }}>
              Berita Lokal Terkurasi
            </h3>

            {/* Live headline dari API */}
            {latestArticle ? (
              <div style={{ background: 'var(--surface-low)', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 6, height: 6, background: '#10B981', borderRadius: '50%', flexShrink: 0, animation: 'pulse 2s infinite' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {timeAgo(latestArticle.published_at)}
                  </span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {latestArticle.title}
                </p>
              </div>
            ) : (
              <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)' }}>
                Informasi terkini dari seluruh penjuru Maluku Utara — dari Ternate, Tobelo, hingga Sofifi.
              </p>
            )}

            <span style={{ marginTop: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--primary)', paddingTop: 12 }}>
              Baca Berita Utama →
            </span>
          </div>
        </Link>

        {/* BALAPOR */}
        <Link href="/reports" style={{ borderRadius: 18, background: '#fff', border: '1px solid var(--border-light)', minHeight: 252, padding: 26, textDecoration: 'none', display: 'flex', flexDirection: 'column' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: 'rgba(220,38,38,.08)', color: 'var(--error)', marginBottom: 12 }}>
            📣 BALAPOR · Laporan
          </span>
          <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(220,38,38,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="var(--error)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 11 19-9-9 19-2-8-8-2z"/>
            </svg>
          </div>
          <h3 className="font-sora" style={{ fontSize: 19, fontWeight: 800, marginBottom: 6, color: 'var(--text)' }}>
            BALAPOR
          </h3>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)' }}>
            Layanan pengaduan publik responsif. Suarakan aspirasi, temukan solusi bersama.
          </p>

          {/* Stats bar */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ padding: '10px 14px', background: 'var(--surface-low)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
              <span style={{ width: 7, height: 7, background: 'var(--success)', borderRadius: '50%', flexShrink: 0 }}/>
              Identitas pelapor selalu terlindungi
            </div>
            <div style={{ padding: '10px 14px', background: 'rgba(220,38,38,.04)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--error)' }}>
              <span>📢</span>
              Lapor sekarang →
            </div>
          </div>
        </Link>
      </div>

      {/* ROW 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 14 }}>

        {/* BAPASIAR */}
        <Link href="/speed" style={{ borderRadius: 18, background: '#fff', border: '1px solid var(--border-light)', minHeight: 216, padding: 24, textDecoration: 'none', display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(8,145,178,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="#0891B2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 16c3-3.5 7-5 12-4.5l7 1.5-1 5H2z"/><path d="M2 16h20"/><path d="M3 19.5c4.5-1 9-1 13 0"/>
            </svg>
          </div>
          <h3 className="font-sora" style={{ fontSize: 19, fontWeight: 800, marginBottom: 6, color: 'var(--text)' }}>BAPASIAR</h3>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)', marginBottom: 14 }}>Antrian & jadwal real-time speedboat, kapal lokal, feri, dan Pelni.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 'auto' }}>
            {[
              { label: '⚡ Speedboat', href: '/speed' },
              { label: '🚢 Kapal Lokal', href: '/ship' },
              { label: '⛴️ Feri', href: '/ferry' },
              { label: '🛳️ Pelni', href: '/pelni' },
            ].map(c => (
              <span key={c.label} style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', borderRadius: 9, padding: '8px 10px', background: 'var(--surface-low)', color: 'var(--text-muted)' }}>
                {c.label}
              </span>
            ))}
          </div>
        </Link>

        {/* MARKETPLACE */}
        <Link href="/kos" style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: 'var(--primary)', minHeight: 216, padding: 26, textDecoration: 'none', display: 'flex', flexDirection: 'column' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'rgba(195,192,255,.18)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }}/>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <h3 className="font-sora" style={{ fontSize: 19, fontWeight: 800, marginBottom: 6, color: '#fff' }}>Marketplace Lokal</h3>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(195,192,255,.85)', marginBottom: 20 }}>
              Kos strategis, properti, kendaraan, jasa tukang — semua mitra terverifikasi.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { label: 'Cari Kos', href: '/kos', primary: true },
                { label: 'Sewa Motor', href: '/kos?type=kendaraan', primary: false },
                { label: 'Jual Properti', href: '/kos?type=properti', primary: false },
              ].map(item => (
                <span key={item.label} style={{ padding: '8px 16px', borderRadius: 99, fontSize: 12, fontWeight: 700, background: item.primary ? '#fff' : 'rgba(255,255,255,.15)', color: item.primary ? 'var(--primary)' : '#fff' }}>
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </Link>
      </div>
    </section>
  )
}
