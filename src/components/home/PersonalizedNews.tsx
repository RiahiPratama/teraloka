import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1'

async function getRecentArticles() {
  try {
    const res = await fetch(`${API}/content/articles?limit=4`, {
      next: { revalidate: 300 },
    })
    const data = await res.json()
    if (data.success) return data.data ?? []
    return []
  } catch {
    return []
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
  const articles = await getRecentArticles()
  if (articles.length === 0) return null

  const featured = articles[0]
  const side = articles.slice(1, 4)

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
          fontSize: 13, fontWeight: 700, color: 'var(--primary)',
          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          Lihat Semua →
        </Link>
      </div>

      {/* Grid: featured kiri (60%) + 3 artikel kanan (40%) */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>

        {/* Featured */}
        <Link href={`/news/${featured.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{
            borderRadius: 20, overflow: 'hidden', position: 'relative',
            height: 380, cursor: 'pointer',
          }}>
            {/* Image */}
            {featured.cover_image_url ? (
              <img
                src={featured.cover_image_url}
                alt={featured.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: 'linear-gradient(135deg, #003526, #0891B2)',
              }} />
            )}
            {/* Overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)',
            }} />
            {/* Content */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 24px 20px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(0,53,38,0.9)', borderRadius: 99,
                padding: '3px 10px', marginBottom: 10,
              }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#95d3ba', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  BERITA UTAMA
                </span>
              </div>
              <h3 className="font-sora" style={{
                fontSize: 20, fontWeight: 800, color: '#fff',
                lineHeight: 1.3, marginBottom: 8,
              }}>
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

        {/* Side articles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {side.map((article: any) => (
            <Link key={article.id} href={`/news/${article.slug}`}
              style={{ textDecoration: 'none', display: 'block', flex: 1 }}>
              <div style={{
                display: 'flex', gap: 14, alignItems: 'flex-start',
                background: '#fff', borderRadius: 16, padding: '14px',
                border: '1px solid var(--border-light)',
                transition: 'box-shadow 0.2s',
                height: '100%',
              }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,53,38,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                {/* Thumbnail */}
                <div style={{
                  width: 72, height: 72, borderRadius: 12,
                  overflow: 'hidden', flexShrink: 0,
                  background: 'var(--surface-low)',
                }}>
                  {article.cover_image_url ? (
                    <img src={article.cover_image_url} alt={article.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      background: 'linear-gradient(135deg, rgba(0,53,38,0.1), rgba(8,145,178,0.1))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24,
                    }}>📰</div>
                  )}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {article.category && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.5px', color: 'var(--primary)',
                    }}>
                      {article.category}
                    </span>
                  )}
                  <h4 style={{
                    fontSize: 14, fontWeight: 700, color: 'var(--text)',
                    lineHeight: 1.4, marginTop: 3, marginBottom: 6,
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {article.title}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-light)' }}>
                    <span>BAKABAR</span>
                    <span>·</span>
                    <span>{timeAgo(article.published_at)}</span>
                  </div>
                </div>

                {/* Arrow */}
                <span style={{ color: 'var(--text-light)', fontSize: 14, flexShrink: 0, alignSelf: 'center' }}>→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
