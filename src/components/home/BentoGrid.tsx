import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1'

async function getPublicStats() {
  try {
    const res = await fetch(`${API}/public/stats`, {
      next: { revalidate: 300 },
    })
    const data = await res.json()
    if (data.success) return data.data
    return null
  } catch {
    return null
  }
}

function timeAgo(dateStr: string) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m} menit lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  return `${Math.floor(h / 24)} hari lalu`
}

export default async function BentoGrid() {
  const stats = await getPublicStats()

  const latestArticle = stats?.articles?.latest ?? null
  const latestReport  = stats?.reports?.latest ?? null
  const totalReports  = stats?.reports?.total ?? 0

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
        <Link href="/layanan" style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Lihat Semua →
        </Link>
      </div>

      {/* ROW 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 14, marginBottom: 14 }}>

        {/* ── BAKABAR ─────────────────────────────────────────── */}
        <Link href="/news" style={{
          position: 'relative', borderRadius: 18, overflow: 'hidden',
          background: '#fff', border: '1px solid var(--border-light)',
          minHeight: 220, padding: 24, textDecoration: 'none',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(53,37,205,.03) 0%,transparent 60%)', pointerEvents: 'none' }} />

          {/* Icon + Label sejajar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(53,37,205,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2M18 14h-8M15 18h-5M10 6h8v4h-8Z"/>
              </svg>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', background: 'rgba(53,37,205,.07)', padding: '4px 10px', borderRadius: 99 }}>
              📰 BAKABAR · Berita
            </span>
          </div>

          {/* Headline terbaru */}
          <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
            {latestArticle ? (
              <div style={{ background: 'var(--surface-low)', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ width: 6, height: 6, background: '#10B981', borderRadius: '50%', flexShrink: 0, animation: 'pulse 2s infinite' }} />
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {timeAgo(latestArticle.published_at)}
                  </span>
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {latestArticle.title}
                </p>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Informasi terkini dari seluruh penjuru Maluku Utara — dari Ternate, Tobelo, hingga Sofifi.
              </p>
            )}
          </div>

          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', position: 'relative', zIndex: 1 }}>
            Baca Berita Utama →
          </span>
        </Link>

        {/* ── BALAPOR ─────────────────────────────────────────── */}
        <Link href="/reports" style={{
          borderRadius: 18, background: '#fff', border: '1px solid var(--border-light)',
          minHeight: 220, padding: 24, textDecoration: 'none',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          {/* Icon + Label sejajar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(220,38,38,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="var(--error)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 11 19-9-9 19-2-8-8-2z"/>
              </svg>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--error)', background: 'rgba(220,38,38,.07)', padding: '4px 10px', borderRadius: 99 }}>
              📣 BALAPOR · Laporan
            </span>
          </div>

          {/* Laporan terbaru */}
          <div style={{ flex: 1 }}>
            {latestReport ? (
              <div style={{ background: 'rgba(220,38,38,.04)', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(220,38,38,.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ width: 6, height: 6, background: 'var(--error)', borderRadius: '50%', flexShrink: 0, animation: 'pulse 2s infinite' }} />
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--error)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Laporan Terbaru · {timeAgo(latestReport.created_at)}
                  </span>
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {latestReport.title}
                </p>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Layanan pengaduan publik responsif. Suarakan aspirasi, temukan solusi bersama.
              </p>
            )}
          </div>

          {/* Stats + CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {totalReports > 0 && (
              <div style={{ padding: '8px 12px', background: 'var(--surface-low)', borderRadius: 9, display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                <span style={{ width: 6, height: 6, background: 'var(--success)', borderRadius: '50%' }}/>
                {totalReports.toLocaleString('id-ID')} laporan diproses
              </div>
            )}
            <div style={{ padding: '8px 12px', background: 'rgba(220,38,38,.05)', borderRadius: 9, display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: 'var(--error)' }}>
              <span>📢</span> Lapor sekarang →
            </div>
          </div>
        </Link>
      </div>

      {/* ROW 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 14 }}>

        {/* BAPASIAR */}
        <Link href="/speed" style={{ borderRadius: 18, background: '#fff', border: '1px solid var(--border-light)', minHeight: 216, padding: 24, textDecoration: 'none', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(8,145,178,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#0891B2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 16c3-3.5 7-5 12-4.5l7 1.5-1 5H2z"/><path d="M2 16h20"/><path d="M3 19.5c4.5-1 9-1 13 0"/>
              </svg>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0891B2', background: 'rgba(8,145,178,.07)', padding: '4px 10px', borderRadius: 99 }}>
              ⛵ BAPASIAR · Transportasi
            </span>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)', marginBottom: 14 }}>
            Antrian & jadwal real-time speedboat, kapal lokal, feri, dan Pelni.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 'auto' }}>
            {['⚡ Speedboat','🚢 Kapal Lokal','⛴️ Feri','🛳️ Pelni'].map(c => (
              <span key={c} style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', borderRadius: 9, padding: '8px 10px', background: 'var(--surface-low)', color: 'var(--text-muted)' }}>{c}</span>
            ))}
          </div>
        </Link>

        {/* MARKETPLACE */}
        <Link href="/kos" style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: 'var(--primary)', minHeight: 216, padding: 26, textDecoration: 'none', display: 'flex', flexDirection: 'column' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'rgba(195,192,255,.18)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }}/>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.8)', background: 'rgba(255,255,255,.12)', padding: '4px 10px', borderRadius: 99 }}>
                🏠 BAKOS · Marketplace
              </span>
            </div>
            <h3 className="font-sora" style={{ fontSize: 19, fontWeight: 800, marginBottom: 6, color: '#fff' }}>Marketplace Lokal</h3>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(195,192,255,.85)', marginBottom: 20 }}>
              Kos strategis, properti, kendaraan, jasa tukang — semua mitra terverifikasi.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { label: 'Cari Kos', primary: true },
                { label: 'Sewa Motor', primary: false },
                { label: 'Jual Properti', primary: false },
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
