import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1'

async function getData() {
  try {
    const [articlesRes, statsRes] = await Promise.all([
      fetch(`${API}/content/articles?limit=2`, { next: { revalidate: 300 } }),
      fetch(`${API}/public/stats`, { next: { revalidate: 300 } }),
    ])
    const articlesData = await articlesRes.json()
    const statsData    = await statsRes.json()
    return {
      articles:     articlesData.success ? (articlesData.data ?? []) : [],
      latestReport: statsData.success ? statsData.data?.reports?.latest : null,
      totalReports: statsData.success ? (statsData.data?.reports?.total ?? 0) : 0,
    }
  } catch {
    return { articles: [], latestReport: null, totalReports: 0 }
  }
}

function timeAgo(dateStr: string) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m} mnt lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  return `${Math.floor(h / 24)} hari lalu`
}

function parseExcerpt(excerpt?: string | null, body?: string | null): string {
  const raw = excerpt || body || ''
  if (!raw) return ''
  if (raw.trim().startsWith('{')) {
    try {
      const p = JSON.parse(raw)
      const text = p.content || p.excerpt || ''
      if (text) return String(text).slice(0, 120)
    } catch {
      const m = raw.match(/"content"\s*:\s*"([\s\S]{10,}?)(?:","|\"})/);
      if (m?.[1]) return m[1].replace(/\\n/g, ' ').slice(0, 120)
    }
    return ''
  }
  return raw.slice(0, 120)
}

export default async function PersonalizedNews() {
  const { articles, latestReport, totalReports } = await getData()
  if (articles.length === 0) return null

  const featured = articles[0]
  const article2 = articles[1] ?? null  // artikel 2 — full width

  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <h2 className="font-sora" style={{
            fontSize: 'clamp(22px, 3vw, 30px)',
            fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)',
          }}>
            Untukmu Hari Ini
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Berita terkini dari Maluku Utara
          </p>
        </div>
        <Link href="/news" style={{
          fontSize: 13, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none',
        }}>
          Lihat Semua →
        </Link>
      </div>

      {/* Grid: featured kiri (60%) + kolom kanan (40%) */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>

        {/* ── Featured article ── */}
        <Link href={`/news/${featured.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{ borderRadius: 20, overflow: 'hidden', position: 'relative', height: 380 }}>
            {featured.cover_image_url ? (
              <img src={featured.cover_image_url} alt={featured.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #003526, #0891B2)' }} />
            )}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)',
            }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 24px 20px' }}>
              <div style={{ display: 'inline-flex', background: 'rgba(0,53,38,0.9)', borderRadius: 99, padding: '3px 10px', marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#95d3ba', textTransform: 'uppercase', letterSpacing: '0.5px' }}>BERITA UTAMA</span>
              </div>
              <h3 className="font-sora" style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.3, marginBottom: 8 }}>
                {featured.title}
              </h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {parseExcerpt(featured.excerpt, featured.body)}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                <span style={{ fontWeight: 600, color: '#95d3ba' }}>BAKABAR</span>
                <span>·</span>
                <span>{timeAgo(featured.published_at)}</span>
              </div>
            </div>
          </div>
        </Link>

        {/* ── Kolom kanan ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Artikel 1 — full width */}
          {article2 && (
            <Link href={`/news/${article2.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
              <div style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                background: '#fff', borderRadius: 16, padding: '14px',
                border: '1px solid var(--border-light)',
              }}>
                <div style={{ width: 68, height: 68, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'var(--surface-low)' }}>
                  {article2.cover_image_url ? (
                    <img src={article2.cover_image_url} alt={article2.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, background: 'linear-gradient(135deg, rgba(0,53,38,0.08), rgba(8,145,178,0.08))' }}>📰</div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {article2.category && (
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--primary)' }}>
                      {article2.category}
                    </span>
                  )}
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.4, marginTop: 3, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {article2.title}
                  </h4>
                  <span style={{ fontSize: 11, color: 'var(--text-light)' }}>
                    BAKABAR · {timeAgo(article2.published_at)}
                  </span>
                </div>
                <span style={{ color: 'var(--text-light)', fontSize: 14, flexShrink: 0, alignSelf: 'center' }}>→</span>
              </div>
            </Link>
          )}

          {/* Artikel 2 — full width */}
          {/* (slot ketiga jika ada artikel ke-2 lagi — diisi dari index 1) */}

          {/* BALAPOR card — full width di slot ke-3 */}
          <Link href="/reports" style={{ textDecoration: 'none', display: 'block' }}>
              <div style={{
                background: 'rgba(220,38,38,0.03)',
                border: '1.5px solid rgba(220,38,38,0.12)',
                borderRadius: 16, height: '100%',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
              }}>
                {/* Header */}
                <div style={{ padding: '12px 14px 10px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 9,
                      background: 'rgba(220,38,38,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m3 11 19-9-9 19-2-8-8-2z"/>
                      </svg>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#dc2626' }}>BALAPOR</span>
                  </div>

                  {latestReport ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#dc2626', flexShrink: 0 }} />
                        <span style={{ fontSize: 9, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Terbaru</span>
                      </div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {latestReport.title}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Laporan diproses</p>
                      <p style={{ fontSize: 22, fontWeight: 800, color: '#dc2626' }}>
                        {totalReports > 0 ? `${totalReports}+` : '—'}
                      </p>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
                        Suarakan aspirasi. Identitasmu terlindungi.
                      </p>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div style={{
                  background: 'rgba(220,38,38,0.07)',
                  borderTop: '1px solid rgba(220,38,38,0.1)',
                  padding: '8px 14px',
                  fontSize: 11, fontWeight: 800, color: '#dc2626',
                  textAlign: 'center',
                }}>
                  Lapor Sekarang →
                </div>
              </div>
            </Link>
        </div>
      </div>
    </section>
  )
}
