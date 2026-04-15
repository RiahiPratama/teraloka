import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://teraloka.com';

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

// Fix: detect dan extract kalau body adalah raw JSON dari Groq lama
function parseBody(raw: string): string {
  if (!raw) return '';

  // Coba parse sebagai JSON (artifact dari Groq lama yang menyimpan raw JSON)
  try {
    const parsed = JSON.parse(raw);
    // Groq lama menyimpan format { "title": "...", "content": "..." }
    if (parsed && typeof parsed === 'object') {
      const content = parsed.content || parsed.body || parsed.text || '';
      if (content) return content;
    }
  } catch {
    // Bukan JSON — lanjut ke formatting normal
  }

  // Coba strip JSON-like prefix kalau ada (misalnya body dimulai dengan '{')
  if (raw.trim().startsWith('{')) {
    // Ambil semua teks setelah baris pertama yang berisi '{' hingga '}'
    // Strategi: ambil semua value string dari JSON
    const contentMatch = raw.match(/"content"\s*:\s*"([\s\S]*?)"\s*[,}]/);
    if (contentMatch?.[1]) {
      return contentMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }
  }

  return raw;
}

function renderBody(raw: string): string {
  const body = parseBody(raw);
  if (!body) return '';

  // Kalau sudah HTML, return langsung
  if (body.includes('<p>') || body.includes('<br') || body.includes('<h')) {
    return body;
  }

  // Convert newlines to paragraphs
  return body
    .split(/\n\n+/)
    .filter(p => p.trim())
    .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const shareUrl = `${APP_URL}/news/${slug}`;
  const shareText = encodeURIComponent(`📰 ${article.title}\n\n${shareUrl}`);
  const bodyHtml = renderBody(article.body || '');

  return (
    <article className="min-h-screen bg-[#f9f9f8]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        .article-body { font-family: 'Outfit', system-ui; font-size: 15px; line-height: 1.9; color: #374151; }
        .article-body p { margin-bottom: 1.2em; }
        .article-body h2, .article-body h3 { font-weight: 700; color: #111827; margin: 1.5em 0 0.5em; }
        .article-body h2 { font-size: 1.2em; }
        .article-body h3 { font-size: 1.05em; }
        .article-body strong { color: #111827; font-weight: 600; }
      `}</style>

      {/* Header sticky */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/news" className="flex items-center gap-1.5 text-[#003526] text-sm font-semibold hover:opacity-80 transition-opacity">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            BAKABAR
          </Link>
          {/* Share WA button */}
          <a href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-green-600 transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Bagikan
          </a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-20">

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {article.is_breaking && (
            <span className="flex items-center gap-1 text-xs font-black text-red-600 bg-red-50 px-3 py-1 rounded-full">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              BREAKING
            </span>
          )}
          {article.category && (
            <span className="text-xs font-bold uppercase tracking-wider text-[#003526] bg-[#003526]/8 px-3 py-1 rounded-full">
              {article.category}
            </span>
          )}
          {article.source === 'balapor' && (
            <span className="text-xs font-semibold text-[#0891B2] bg-[#0891B2]/8 px-3 py-1 rounded-full">
              📢 Laporan Warga
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-extrabold text-gray-900 leading-snug tracking-tight mb-4">
          {article.title}
        </h1>

        {/* Meta */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-5 flex-wrap">
          <span className="font-semibold text-gray-600">
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
          <div className="mb-6 rounded-2xl overflow-hidden">
            <img src={article.cover_image_url} alt={article.title}
              className="w-full object-cover max-h-80" />
          </div>
        )}

        {/* Excerpt / lead */}
        {article.excerpt && (
          <div className="mb-6 border-l-4 border-[#003526] pl-4 bg-[#003526]/3 py-3 pr-4 rounded-r-xl">
            <p className="text-base text-gray-700 leading-relaxed font-medium italic">
              {article.excerpt}
            </p>
          </div>
        )}

        {/* Body — rendered clean */}
        {bodyHtml ? (
          <div className="article-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        ) : (
          <p className="text-gray-400 italic text-sm">Konten artikel belum tersedia.</p>
        )}

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {article.tags.map((tag: string) => (
              <span key={tag} className="bg-gray-100 text-gray-500 text-xs font-semibold px-3 py-1.5 rounded-full">#{tag}</span>
            ))}
          </div>
        )}

        {/* BALAPOR notice */}
        {article.source === 'balapor' && (
          <div className="mt-6 rounded-xl bg-[#0891B2]/6 border border-[#0891B2]/15 px-4 py-3">
            <p className="text-sm text-[#0891B2] flex items-start gap-2">
              <span>📢</span>
              <span>Artikel ini berasal dari laporan warga via <strong>BALAPOR</strong> TeraLoka. Identitas pelapor dilindungi.</span>
            </p>
          </div>
        )}

        {/* Share section */}
        <div className="mt-8 bg-white rounded-2xl border border-gray-100 p-5 text-center">
          <p className="text-sm font-semibold text-gray-700 mb-3">Bagikan artikel ini</p>
          <div className="flex gap-2 justify-center">
            <a href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-green-600 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
            <button onClick={() => navigator.clipboard.writeText(shareUrl).then(() => alert('Link disalin!'))}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-gray-200 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Salin Link
            </button>
          </div>
        </div>

        {/* Back to news */}
        <div className="mt-6 text-center">
          <Link href="/news" className="text-sm text-[#003526] font-semibold hover:underline">
            ← Baca berita lainnya di BAKABAR
          </Link>
        </div>
      </div>
    </article>
  );
}
