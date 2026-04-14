import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

type Props = { params: Promise<{ slug: string }> };

async function getArticle(slug: string) {
  try {
    const res = await fetch(`${API}/content/articles/${slug}`, {
      next: { revalidate: 60 },
    });
    const data = await res.json();
    if (!data.success) return null;
    return data.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: 'Artikel tidak ditemukan' };
  return {
    title: `${article.title} | BAKABAR TeraLoka`,
    description: article.excerpt || article.title,
    openGraph: {
      title: article.title,
      description: article.excerpt || article.title,
      images: article.cover_image_url ? [article.cover_image_url] : [],
      type: 'article',
    },
  };
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatBody(body: string) {
  if (!body) return '';
  // Convert newlines to paragraphs
  return body
    .split(/\n\n+/)
    .filter(Boolean)
    .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  return (
    <article style={{ maxWidth: 680, margin: '0 auto', padding: '16px 16px 60px', fontFamily: "'Outfit', system-ui" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Back */}
      <Link href="/news" style={{ fontSize: 13, color: '#1B6B4A', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
        ← BAKABAR
      </Link>

      {/* Breaking badge */}
      {article.is_breaking && (
        <div style={{ marginBottom: 8 }}>
          <span style={{ background: '#FEE2E2', color: '#DC2626', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.5px' }}>
            🔴 BREAKING
          </span>
        </div>
      )}

      {/* Category */}
      {article.category && (
        <div style={{ marginBottom: 8 }}>
          <span style={{ background: 'rgba(27,107,74,0.08)', color: '#1B6B4A', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {article.category}
          </span>
        </div>
      )}

      {/* Title */}
      <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', lineHeight: 1.3, letterSpacing: '-0.5px', marginBottom: 12 }}>
        {article.title}
      </h1>

      {/* Meta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#9CA3AF', marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, color: '#6B7280' }}>
          {article.author?.name || article.author?.full_name || 'Redaksi TeraLoka'}
        </span>
        <span>·</span>
        <span>{formatDate(article.published_at || article.created_at)}</span>
        {article.view_count > 0 && (
          <>
            <span>·</span>
            <span>{article.view_count.toLocaleString('id-ID')} views</span>
          </>
        )}
      </div>

      {/* Cover image */}
      {article.cover_image_url && (
        <div style={{ marginBottom: 24, borderRadius: 14, overflow: 'hidden' }}>
          <img
            src={article.cover_image_url}
            alt={article.title}
            style={{ width: '100%', display: 'block', maxHeight: 400, objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Excerpt */}
      {article.excerpt && (
        <p style={{ fontSize: 16, color: '#374151', lineHeight: 1.7, fontWeight: 500, borderLeft: '3px solid #1B6B4A', paddingLeft: 14, marginBottom: 20, fontStyle: 'italic' }}>
          {article.excerpt}
        </p>
      )}

      {/* Body */}
      <div
        style={{ fontSize: 15, color: '#374151', lineHeight: 1.9 }}
        dangerouslySetInnerHTML={{ __html: formatBody(article.body || '') }}
      />

      {/* BALAPOR source notice */}
      {article.source === 'balapor' && (
        <div style={{
          marginTop: 28, borderRadius: 12, background: 'rgba(8,145,178,0.06)',
          border: '1px solid rgba(8,145,178,0.15)', padding: '12px 16px',
          fontSize: 13, color: '#0891B2',
        }}>
          📢 Artikel ini berasal dari laporan warga via <strong>BALAPOR</strong> TeraLoka.
        </div>
      )}

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {article.tags.map((tag: string) => (
            <span key={tag} style={{ background: '#F3F4F6', color: '#6B7280', fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20 }}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Divider */}
      <div style={{ marginTop: 32, borderTop: '1px solid #E5E7EB', paddingTop: 20 }}>
        <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
          Baca berita lainnya di{' '}
          <Link href="/news" style={{ color: '#1B6B4A', fontWeight: 600, textDecoration: 'none' }}>
            BAKABAR TeraLoka
          </Link>
        </p>
      </div>
    </article>
  );
}
