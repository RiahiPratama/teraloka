import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import WANewsletterWidget from '@/components/WANewsletterWidget';
import AdInArticle from '@/components/ads/AdInArticle';
import AdSidebarSlug from '@/components/ads/AdSidebarSlug';
import AdNativeSlug from '@/components/ads/AdNativeSlug';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://teraloka.com';

type Props = { params: Promise<{ slug: string }> };

async function getArticle(slug: string) {
  try {
    const res = await fetch(`${API}/content/articles/${slug}`, { next: { revalidate: 60 } });
    const data = await res.json();
    if (!data.success) return null;
    return data.data;
  } catch { return null; }
}

async function getRelatedArticles(category: string, currentSlug: string) {
  try {
    const res = await fetch(`${API}/content/articles?category=${category}&limit=4`, { next: { revalidate: 120 } });
    const data = await res.json();
    if (!data.success) return [];
    return (data.data ?? []).filter((a: any) => a.slug !== currentSlug).slice(0, 3);
  } catch { return []; }
}

async function getStats() {
  try {
    const res = await fetch(`${API}/public/stats`, { next: { revalidate: 60 } });
    const data = await res.json();
    return data.data ?? null;
  } catch { return null; }
}

async function getRecentReports() {
  try {
    const res = await fetch(`${API}/public/reports/recent`, { next: { revalidate: 120 } });
    const data = await res.json();
    return data.data ?? [];
  } catch { return []; }
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
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function timeAgo(dateStr: string) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (h < 1) return 'Baru saja';
  if (h < 24) return `${h} jam lalu`;
  return `${d} hari lalu`;
}

// ── Reading time estimator ────────────────────────────────────────
function readingTime(body: string): number {
  if (!body) return 1;
  // Strip HTML tags kalau ada
  const plainText = body.replace(/<[^>]*>/g, ' ')
  const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;
  // Rata-rata 200 kata/menit untuk pembaca Indonesia
  return Math.max(1, Math.ceil(wordCount / 200));
}

function parseBody(raw: string): string {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const content = parsed.content || parsed.body || parsed.text || '';
      if (content) return content;
    }
  } catch {}
  if (raw.trim().startsWith('{')) {
    const m = raw.match(/"content"\s*:\s*"([\s\S]*?)"\s*[,}]/);
    if (m?.[1]) return m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
  }
  return raw;
}

// ─────────────────────────────────────────────────────────────────
// Markdown parser — port dari office/newsroom/bakabar/hub/new/page.tsx
// XSS-safe: escape HTML dulu, baru apply markdown transforms
// ─────────────────────────────────────────────────────────────────
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMarkdown(text: string): string {
  if (!text) return '';
  let html = escapeHtml(text);

  // Block elements
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm,  '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm,   '<h1>$1</h1>');
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]+?<\/li>)(\n(?!<li>)|$)/g, '<ul>$1</ul>$2');

  // Inline formatting
  html = html.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>');

  // Image syntax HARUS sebelum link karena ![]() contains []()
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, src) => {
    const safeAlt = alt || '';
    if (safeAlt.trim()) {
      return `<figure class="bk-fig"><img src="${src}" alt="${safeAlt}" /><figcaption>${safeAlt}</figcaption></figure>`;
    }
    return `<img class="bk-inline" src="${src}" alt="" />`;
  });

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Wrap paragraphs
  const blocks = html.split(/\n\n+/).map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (/^<(h[1-3]|ul|blockquote|figure|img)/.test(trimmed)) return trimmed;
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).filter(Boolean);

  return blocks.join('\n');
}

function renderBody(raw: string): string {
  const body = parseBody(raw);
  if (!body) return '';
  // Kalau body sudah HTML (artikel lama dari BALAPOR AI / RSS), render as-is
  if (body.includes('<p>') || body.includes('<br') || body.includes('<h')) return body;
  // Kalau body markdown (artikel baru dari newsroom), parse via markdown
  return renderMarkdown(body);
}

function InArticleAd() {
  // Deprecated — diganti dengan AdInArticle client component (di-import dari components/ads)
  return <AdInArticle />;
}

const CONTEXT_CTA: Record<string, {
  badge: string; headline: string; sub: string;
  cta: string; href: string; bg: string; accent: string; emoji: string;
}> = {
  transportasi: {
    badge: '🚢 Rekomendasi untukmu', headline: 'Pesan speedboat Ternate – Tidore sekarang!',
    sub: 'Jadwal lengkap, harga terbaik, pesan mudah di BAPASIAR.',
    cta: 'Lihat Jadwal →', href: '/transport', bg: '#0C4A6E', accent: '#38BDF8', emoji: '🚢',
  },
  pelayaran: {
    badge: '🚢 Rekomendasi untukmu', headline: 'Pesan speedboat Ternate – Tidore sekarang!',
    sub: 'Jadwal lengkap, harga terbaik, pesan mudah di BAPASIAR.',
    cta: 'Lihat Jadwal →', href: '/transport', bg: '#0C4A6E', accent: '#38BDF8', emoji: '🚢',
  },
  sosial: {
    badge: '🤲 Bantuan lagi dibutuhkan', headline: 'Mari bantu, sekecil apapun berarti',
    sub: 'Banyak warga Maluku Utara yang butuh uluran tangan torang.',
    cta: 'Donasi Sekarang →', href: '/fundraising', bg: '#064E3B', accent: '#34D399', emoji: '❤️',
  },
  kemanusiaan: {
    badge: '🤲 Bantuan lagi dibutuhkan', headline: 'Mari bantu, sekecil apapun berarti',
    sub: 'Banyak warga Maluku Utara yang butuh uluran tangan torang.',
    cta: 'Donasi Sekarang →', href: '/fundraising', bg: '#064E3B', accent: '#34D399', emoji: '❤️',
  },
  kesehatan: {
    badge: '🤲 Bantuan lagi dibutuhkan', headline: 'Mari bantu, sekecil apapun berarti',
    sub: 'Bantu warga Maluku Utara yang membutuhkan biaya kesehatan.',
    cta: 'Donasi Sekarang →', href: '/fundraising', bg: '#064E3B', accent: '#34D399', emoji: '❤️',
  },
  ekonomi: {
    badge: '💼 Promosikan usahamu', headline: 'Jangkau ribuan warga Maluku Utara!',
    sub: 'Daftarkan bisnis kamu di BAKOS dan pasang iklan di BAKABAR.',
    cta: 'Daftar Sekarang →', href: '/listings', bg: '#78350F', accent: '#FCD34D', emoji: '📢',
  },
  umkm: {
    badge: '💼 Promosikan usahamu', headline: 'Jangkau ribuan warga Maluku Utara!',
    sub: 'Daftarkan bisnis kamu di BAKOS dan pasang iklan di BAKABAR.',
    cta: 'Daftar Sekarang →', href: '/listings', bg: '#78350F', accent: '#FCD34D', emoji: '📢',
  },
};

const DEFAULT_CTA = {
  badge: '📢 Ada kejadian di sekitarmu?', headline: 'Laporkan via BALAPOR sekarang!',
  sub: 'Identitasmu terlindungi. Laporanmu bisa jadi artikel di BAKABAR.',
  cta: 'Lapor Sekarang →', href: '/reports', bg: '#1F2937', accent: '#F87171', emoji: '🚨',
};

function ContextCTABanner({ category }: { category: string }) {
  const cat = (category || '').toLowerCase();
  const cta = Object.entries(CONTEXT_CTA).find(([key]) => cat.includes(key))?.[1] ?? DEFAULT_CTA;
  return (
    <div className="mt-10 rounded-2xl p-6 relative overflow-hidden" style={{ background: cta.bg }}>
      <div className="absolute top-0 right-4 text-8xl opacity-10 leading-none select-none">{cta.emoji}</div>
      <span className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-3"
        style={{ background: `${cta.accent}22`, color: cta.accent, border: `1px solid ${cta.accent}44` }}>
        {cta.badge}
      </span>
      <h3 className="text-white font-black text-lg leading-snug mb-2">{cta.headline}</h3>
      <p className="text-sm mb-5 leading-relaxed" style={{ color: `${cta.accent}cc` }}>{cta.sub}</p>
      <Link href={cta.href}
        className="inline-block text-sm font-black px-6 py-3 rounded-xl transition-opacity hover:opacity-90"
        style={{ background: cta.accent, color: cta.bg }}>
        {cta.cta}
      </Link>
    </div>
  );
}

const CATEGORY_ICON: Record<string, string> = {
  infrastruktur: '🏗️', keamanan: '🚨', lingkungan: '🌿',
  sosial: '👥', kesehatan: '🏥', pendidikan: '📚',
  transportasi: '🚗', ekonomi: '💰',
};

function MiniBALAPORFeed({ reports }: { reports: any[] }) {
  if (!reports.length) return null;
  return (
    <div className="mt-5 bg-gray-50 rounded-2xl p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-gray-800">🚨 Warga lagi melapor</p>
        <Link href="/reports" className="text-xs font-semibold text-[#003526] hover:underline">Lihat semua →</Link>
      </div>
      <div className="space-y-2.5">
        {reports.slice(0, 3).map((r: any) => (
          <div key={r.id} className="flex items-start gap-2">
            <span className="text-sm shrink-0 mt-0.5">{CATEGORY_ICON[r.category] || '📋'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-700 leading-snug line-clamp-2">{r.title}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {(() => {
                  const diff = Date.now() - new Date(r.created_at).getTime();
                  const h = Math.floor(diff / 3600000);
                  const d = Math.floor(diff / 86400000);
                  if (h < 1) return 'Baru saja';
                  if (h < 24) return `${h} jam lalu`;
                  return `${d} hari lalu`;
                })()}
              </p>
            </div>
          </div>
        ))}
      </div>
      <Link href="/reports/new"
        className="block mt-3 text-center text-xs font-bold py-2 rounded-xl"
        style={{ background: '#003526', color: '#fff' }}>
        + Laporkan Kejadian
      </Link>
    </div>
  );
}

function RelatedArticles({ articles }: { articles: any[] }) {
  if (!articles.length) return null;
  return (
    <div className="mt-10 border-t border-gray-100 pt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          📰 Masih ada kabar penting lainnya...
        </h3>
        <Link href="/news" className="text-xs text-[#003526] font-semibold hover:underline">
          Lihat semua →
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        {articles.map((a: any) => (
          <Link key={a.id} href={`/news/${a.slug}`}
            className="flex gap-3 items-start group hover:bg-gray-50 rounded-xl p-2 -mx-2 transition-colors">
            <div className="w-20 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
              {a.cover_image_url
                ? <img src={a.cover_image_url} alt={a.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">📰</div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 group-hover:text-[#003526] transition-colors">
                {a.title}
              </p>
              <p className="text-xs text-gray-400 mt-1">{timeAgo(a.published_at)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SocialProof({ stats }: { stats: any }) {
  const items = [
    { value: stats?.donations_today ? `${stats.donations_today.toLocaleString('id-ID')}+` : '—', label: 'Orang bantu hari ini', icon: '👥' },
    { value: stats?.reports_this_week ? `${stats.reports_this_week}` : '—', label: 'Laporan masuk minggu ini', icon: '📋' },
    { value: stats?.transport_checks_today ? `${stats.transport_checks_today}+` : '500+', label: 'Cek jadwal hari ini', icon: '🚢' },
  ];
  return (
    <div className="mt-5 bg-white border border-gray-100 rounded-2xl p-5">
      <p className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-1">
        👥 Torang samua lagi bergerak <span className="text-[#003526]">💚</span>
      </p>
      <div className="grid grid-cols-3 gap-3 text-center">
        {items.map((item, i) => (
          <div key={i}>
            <p className="text-lg font-black text-[#003526]">{item.value}</p>
            <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BasumbangCTA() {
  return (
    <div className="mt-5 bg-[#003526] rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 text-6xl opacity-10 leading-none">🤲</div>
      <p className="text-white font-bold text-base mb-1">Mari bantu, sekecil apapun berarti</p>
      <p className="text-[#95d3ba] text-xs mb-4 leading-relaxed">
        Banyak yang butuh uluran tangan di sekitar torang.
      </p>
      <Link href="/fundraising"
        className="block text-center bg-white text-[#003526] text-sm font-black px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
        Baku Bantu Sekarang →
      </Link>
    </div>
  );
}

function NativeAd() {
  // Deprecated — diganti dengan AdNativeSlug client component (di-import dari components/ads)
  return <AdNativeSlug />;
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const [article, stats, recentReports] = await Promise.all([
    getArticle(slug),
    getStats(),
    getRecentReports(),
  ]);
  if (!article) notFound();

  const relatedArticles = await getRelatedArticles(article.category, slug);

  const shareUrl = `${APP_URL}/news/${slug}`;
  const shareText = encodeURIComponent(`📰 ${article.title}\n\n${shareUrl}`);
  const bodyHtml = renderBody(article.body || '');

  // Hitung reading time dari body mentah (sebelum di-render ke HTML)
  const parsedBody = parseBody(article.body || '');
  const menit = readingTime(parsedBody);

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600&display=swap');
        .article-body { font-family: 'Lora', Georgia, serif; font-size: 17px; line-height: 1.85; color: #1a1a1a; }
        .article-body p { margin-bottom: 1.3em; }
        .article-body h1 { font-size: 1.5em; font-weight: 700; color: #111; margin: 2em 0 0.7em; }
        .article-body h2 { font-size: 1.3em; font-weight: 700; color: #111; margin: 2em 0 0.6em; }
        .article-body h3 { font-size: 1.1em; font-weight: 600; color: #222; margin: 1.5em 0 0.5em; }
        .article-body strong { color: #111; font-weight: 600; }
        .article-body em { color: #333; font-style: italic; }
        .article-body a { color: #003526; text-decoration: underline; }
        .article-body blockquote {
          border-left: 4px solid #003526;
          padding: 0.4em 1.2em;
          margin: 1.5em 0;
          color: #4a5568;
          background: rgba(0,53,38,0.04);
          font-style: italic;
          border-radius: 0 8px 8px 0;
        }
        .article-body ul { padding-left: 1.8em; margin-bottom: 1.3em; }
        .article-body li { margin-bottom: 0.4em; }
        .article-body figure.bk-fig {
          margin: 1.8em 0;
          text-align: center;
        }
        .article-body figure.bk-fig img {
          width: 100%;
          height: auto;
          max-height: 500px;
          object-fit: contain;
          border-radius: 10px;
          background: #f3f4f6;
          display: block;
          margin: 0 auto;
        }
        .article-body figure.bk-fig figcaption {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 13px;
          color: #6b7280;
          margin-top: 10px;
          font-style: italic;
          line-height: 1.5;
        }
        .article-body img.bk-inline {
          width: 100%;
          height: auto;
          max-height: 500px;
          object-fit: contain;
          border-radius: 10px;
          margin: 1.8em 0;
          display: block;
          background: #f3f4f6;
        }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>

      <div className="max-w-4xl mx-auto px-4">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">

          {/* ── Main content ── */}
          <article className="lg:col-span-8 pt-6 pb-16">

            {/* Category + badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {article.is_breaking && (
                <span className="flex items-center gap-1 text-xs font-black text-red-600 bg-red-50 px-3 py-1 rounded-full">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />BREAKING
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
            <h1 style={{ fontFamily: 'Lora, Georgia, serif' }}
              className="text-3xl font-bold text-gray-900 leading-snug tracking-tight mb-4">
              {article.title}
            </h1>

            {/* Meta — author · tanggal · reading time */}
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-5 pb-5 border-b border-gray-100 flex-wrap">
              <div className="w-6 h-6 rounded-full bg-[#003526] flex items-center justify-center text-white text-xs font-bold shrink-0">
                {(article.author?.name || 'R').charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-gray-700">{article.author?.name || 'Redaksi TeraLoka'}</span>
              <span>·</span>
              <span>{formatDate(article.published_at || article.created_at)}</span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                Waktu baca {menit} menit
              </span>
            </div>

            {/* Cover — full natural aspect, max-height smart, letterbox bg */}
            {article.cover_image_url && (
              <div className="mb-6 rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center"
                style={{ maxHeight: 600 }}>
                <img src={article.cover_image_url} alt={article.title}
                  className="w-full h-auto object-contain"
                  style={{ maxHeight: 600 }} />
              </div>
            )}

            {/* Excerpt */}
            {article.excerpt && (
              <div className="mb-6 border-l-4 border-[#003526] pl-5 bg-[#003526]/3 py-3 pr-4 rounded-r-xl">
                <p style={{ fontFamily: 'Lora, Georgia, serif' }} className="text-lg text-gray-700 leading-relaxed italic">
                  {article.excerpt}
                </p>
              </div>
            )}

            {/* Body */}
            {bodyHtml ? (
              <div className="article-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            ) : (
              <p className="text-gray-400 italic text-sm">Konten artikel belum tersedia.</p>
            )}

            <InArticleAd />

            {/* Tags */}
            {article.tags?.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {article.tags.map((tag: string) => (
                  <span key={tag} className="bg-gray-100 text-gray-500 text-xs font-semibold px-3 py-1.5 rounded-full">
                    #{tag}
                  </span>
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

            {/* Share */}
            <div className="mt-8 bg-gray-50 rounded-2xl p-5 text-center">
              <p className="text-sm font-semibold text-gray-700 mb-3">Bagikan artikel ini</p>
              <div className="flex gap-2 justify-center flex-wrap">
                <a href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-green-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-green-600 transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </a>
                <a href={`https://twitter.com/intent/tweet?text=${shareText}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-black text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:opacity-80 transition-opacity">
                  𝕏 Twitter
                </a>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-[#1877F2] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:opacity-80 transition-opacity">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  Facebook
                </a>
              </div>
            </div>

            <RelatedArticles articles={relatedArticles} />
            <ContextCTABanner category={article.category} />
            <MiniBALAPORFeed reports={recentReports} />
            <SocialProof stats={stats} />
            <BasumbangCTA />
            <div className="mt-5">
              <WANewsletterWidget />
            </div>
            <NativeAd />

            <div className="mt-8 text-center">
              <Link href="/news" className="text-sm text-[#003526] font-semibold hover:underline">
                ← Baca berita lainnya di BAKABAR
              </Link>
            </div>
          </article>

          {/* ── Sidebar ── */}
          <aside className="hidden lg:block lg:col-span-4">
            <div className="sticky top-[108px] py-6 space-y-5">
              <AdSidebarSlug />

              <div className="bg-[#003526] rounded-2xl p-5">
                <p className="text-white font-bold mb-1">Ada berita di sekitarmu?</p>
                <p className="text-[#95d3ba] text-xs mb-3 leading-relaxed">Laporkan via BALAPOR. Identitasmu terlindungi.</p>
                <Link href="/reports" className="block text-center bg-white text-[#003526] text-xs font-black px-4 py-2 rounded-xl">
                  Lapor Sekarang →
                </Link>
              </div>

              {stats && (
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <p className="text-xs font-bold text-gray-700 mb-3">👥 Torang samua lagi bergerak 💚</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Donasi hari ini</span>
                      <span className="text-xs font-bold text-[#003526]">{stats.donations_today ?? '—'}+</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Laporan minggu ini</span>
                      <span className="text-xs font-bold text-[#003526]">{stats.reports_this_week ?? '—'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Total artikel</span>
                      <span className="text-xs font-bold text-[#003526]">{stats.total_articles ?? '—'}</span>
                    </div>
                  </div>
                </div>
              )}

              <AdSidebarSlug />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
