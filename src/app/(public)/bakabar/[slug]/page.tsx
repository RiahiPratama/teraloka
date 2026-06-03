import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Siren, Users, ArrowRight, Check } from 'lucide-react';
import WANewsletterWidget from '@/components/WANewsletterWidget';
import AdInArticle from '@/components/public/ads/AdInArticle';
import AdSidebarSlug from '@/components/public/ads/AdSidebarSlug';
import AdNativeSlug from '@/components/public/ads/AdNativeSlug';
import BodyWithAds from '@/components/public/ads/BodyWithAds';
import ShareInline from '@/components/shared/ShareInline';
import { resolveAdSettings } from '@/lib/ad-settings';
import sanitizeHtml from 'sanitize-html';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';
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
  if (!category) return [];
  try {
    const res = await fetch(`${API}/content/articles?category=${encodeURIComponent(category)}&limit=4`, { next: { revalidate: 120 } });
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

// Total dana terkumpul dari kampanye BADONASI yang sedang berjalan.
// (Y) frontend agregat — null = gagal/kosong → UI fallback 'Segera'.
async function getDonationSummary(): Promise<{ total: number | null }> {
  try {
    const res = await fetch(`${API}/funding/campaigns?limit=100`, { next: { revalidate: 120 } });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) return { total: null };
    const total = data.data
      .filter((c: any) => c.status === 'active')
      .reduce((sum: number, c: any) => sum + (Number(c.collected_amount) || 0), 0);
    return { total };
  } catch { return { total: null }; }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: 'Artikel tidak ditemukan' };
  return {
    title: `${article.title} | BAKABAR TeraLoka`,
    description: article.excerpt || article.title,
    alternates: { canonical: `${APP_URL}/bakabar/${slug}` },
    openGraph: {
      title: article.title,
      description: article.excerpt || article.title,
      url: `${APP_URL}/bakabar/${slug}`,
      images: article.cover_image_url ? [article.cover_image_url] : [],
      type: 'article',
      publishedTime: article.published_at || article.created_at || undefined,
      authors: article.author?.name ? [article.author.name] : undefined,
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
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'Baru saja';
  if (m < 60) return `${m} mnt lalu`;
  if (h < 24) return `${h} jam lalu`;
  return `${d} hari lalu`;
}

function readingTime(body: string): number {
  if (!body) return 1;
  const plainText = body.replace(/<[^>]*>/g, ' ')
  const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;
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

  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm,  '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm,   '<h1>$1</h1>');
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]+?<\/li>)(\n(?!<li>)|$)/g, '<ul>$1</ul>$2');

  html = html.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>');

  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, src) => {
    const safeAlt = alt || '';
    if (safeAlt.trim()) {
      return `<figure class="bk-fig"><img src="${src}" alt="${safeAlt}" /><figcaption>${safeAlt}</figcaption></figure>`;
    }
    return `<img class="bk-inline" src="${src}" alt="" />`;
  });

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  const blocks = html.split(/\n\n+/).map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (/^<(h[1-3]|ul|blockquote|figure|img)/.test(trimmed)) return trimmed;
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).filter(Boolean);

  return blocks.join('\n');
}

// Allowlist tag/atribut sesuai .article-body CSS. Cegah XSS dari body
// HTML mentah (mis. artikel impor / kontributor non-trusted ke depan).
const SANITIZE_OPTS = {
  allowedTags: ['p','br','h1','h2','h3','strong','em','a','ul','ol','li','blockquote','figure','figcaption','img'],
  allowedAttributes: {
    a: ['href','target','rel'],
    img: ['src','alt','class'],
    figure: ['class'],
  },
  allowedSchemes: ['http','https','mailto'],
};

function renderBody(raw: string): string {
  const body = parseBody(raw);
  if (!body) return '';
  const html =
    body.includes('<p>') || body.includes('<br') || body.includes('<h')
      ? body
      : renderMarkdown(body);
  return sanitizeHtml(html, SANITIZE_OPTS);
}

const CATEGORY_ICON: Record<string, string> = {
  infrastruktur: '🏗️', keamanan: '🚨', lingkungan: '🌿',
  sosial: '👥', kesehatan: '🏥', pendidikan: '📚',
  transportasi: '🚗', ekonomi: '💰',
};

function TrustItem({ text, accent }: { text: string; accent: string }) {
  return (
    <div className="flex items-center gap-2">
      <Check size={13} strokeWidth={3} style={{ color: accent }} />
      <span className="text-xs text-white/90 font-medium">{text}</span>
    </div>
  );
}

function ServiceCardsCarousel({ recentReports, stats, donationTotal }: { recentReports: any[]; stats: any; donationTotal: number | null }) {
  const totalReports = stats?.reports?.total;
  const totalArticles = stats?.articles?.total;

  return (
    <div className="mt-10 -mx-4">
      <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-4 px-4 snap-x snap-mandatory">

        <Link href="/balapor/buat-laporan"
          className="snap-start shrink-0 w-[300px] min-h-[360px] rounded-2xl overflow-hidden p-6 flex flex-col justify-between relative transition-all duration-300 ease-out hover:scale-[1.03] hover:-translate-y-1.5 hover:shadow-2xl active:scale-[1.01] active:-translate-y-0.5 group"
          style={{ background: 'radial-gradient(circle at 75% 25%, #F87171 0%, #DC2626 35%, #991B1B 70%, #7F1D1D 100%)' }}>
          <div className="absolute top-5 right-5 text-5xl opacity-90 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">🚨</div>

          <div className="relative space-y-4">
            <div>
              <p className="text-xs font-semibold text-white/70 mb-2">📢 Ada kejadian di sekitarmu?</p>
              <h3 className="text-xl font-black text-white leading-tight mb-2">
                Laporkan via BALAPOR sekarang!
              </h3>
              <p className="text-sm text-white/85 leading-relaxed">
                Identitasmu terlindungi. Laporanmu bisa jadi artikel di BAKABAR.
              </p>
            </div>

            <div className="space-y-1.5 pt-1">
              <TrustItem text="Identitas pelapor 100% anonim" accent="#FCA5A5" />
              <TrustItem text="Foto & video bisa dilampirkan" accent="#FCA5A5" />
              <TrustItem text="Status laporan terlacak" accent="#FCA5A5" />
            </div>
          </div>

          <div className="inline-flex self-start items-center gap-1.5 bg-white px-4 py-2.5 rounded-xl text-sm font-black shadow-md" style={{ color: '#DC2626' }}>
            Lapor Sekarang
            <ArrowRight size={14} strokeWidth={2.5} />
          </div>
        </Link>

        <Link href="/balapor"
          className="snap-start shrink-0 w-[300px] min-h-[360px] rounded-2xl overflow-hidden p-6 flex flex-col justify-between relative transition-all duration-300 ease-out hover:scale-[1.03] hover:-translate-y-1.5 hover:shadow-2xl active:scale-[1.01] active:-translate-y-0.5"
          style={{ background: '#003526' }}>
          <div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Siren size={16} strokeWidth={2.2} className="text-white shrink-0" />
              <p className="text-sm font-bold text-white">Warga lagi melapor</p>
              <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#34D399' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
                Live
              </span>
            </div>

            {recentReports.length > 0 ? (
              <div className="space-y-3">
                {recentReports.slice(0, 3).map((r: any) => (
                  <div key={r.id} className="flex items-start gap-2.5">
                    <span className="text-base shrink-0 mt-0.5">{CATEGORY_ICON[r.category] || '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold leading-snug line-clamp-2 text-white">{r.title}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: '#95d3ba' }}>{timeAgo(r.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/70 italic">Belum ada laporan terbaru</p>
            )}

            <div className="mt-4 pt-3 border-t border-white/10">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: '#95d3ba' }}>
                Update real-time setiap laporan masuk
              </p>
            </div>
          </div>

          <div className="inline-flex self-start items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white px-4 py-2.5 rounded-xl text-sm font-bold border border-white/20">
            + Laporkan Kejadian
          </div>
        </Link>

        <Link href="/bakabar"
          className="snap-start shrink-0 w-[300px] min-h-[360px] rounded-2xl overflow-hidden p-6 flex flex-col justify-between relative transition-all duration-300 ease-out hover:scale-[1.03] hover:-translate-y-1.5 hover:shadow-2xl active:scale-[1.01] active:-translate-y-0.5 group"
          style={{ background: 'radial-gradient(circle at 75% 25%, #A78BFA 0%, #8B5CF6 35%, #6D28D9 70%, #4C1D95 100%)' }}>
          <div className="absolute top-5 right-5 text-5xl opacity-90 transition-transform duration-300 group-hover:scale-110">👥</div>

          <div className="relative">
            <p className="text-xs font-semibold text-white/70 mb-2">Komunitas TeraLoka</p>
            <h3 className="text-xl font-black text-white leading-tight mb-5">
              Torang samua lagi bergerak
            </h3>

            <div className="space-y-3.5">
              <div>
                <p className="text-[11px] text-white/65 uppercase tracking-wider mb-0.5">Total Terkumpul</p>
                <p className="text-xl font-black text-white">
                  {typeof donationTotal === 'number' ? `Rp ${donationTotal.toLocaleString('id-ID')}` : 'Segera'}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-white/65 uppercase tracking-wider mb-0.5">Total laporan warga</p>
                <p className="text-xl font-black text-white">
                  {typeof totalReports === 'number' ? totalReports.toLocaleString('id-ID') : '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-white/65 uppercase tracking-wider mb-0.5">Artikel terbit</p>
                <p className="text-xl font-black text-white">
                  {typeof totalArticles === 'number' ? totalArticles.toLocaleString('id-ID') : '—'}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/15">
              <p className="text-[10px] uppercase tracking-wider text-white/65">
                Update otomatis setiap jam
              </p>
            </div>
          </div>

          <p className="text-xs text-white/80 italic mt-4">Bergerak bersama TeraLoka →</p>
        </Link>

        <Link href="/fundraising"
          className="snap-start shrink-0 w-[300px] min-h-[360px] rounded-2xl overflow-hidden p-6 flex flex-col justify-between relative transition-all duration-300 ease-out hover:scale-[1.03] hover:-translate-y-1.5 hover:shadow-2xl active:scale-[1.01] active:-translate-y-0.5 group"
          style={{ background: 'radial-gradient(circle at 75% 25%, #F9A8D4 0%, #EC4899 35%, #BE185D 70%, #831843 100%)' }}>
          <div className="absolute top-5 right-5 text-5xl opacity-90 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12">🤲</div>

          <div className="relative space-y-4">
            <div>
              <p className="text-xs font-semibold text-white/70 mb-2">🤲 Bantuan lagi dibutuhkan</p>
              <h3 className="text-xl font-black text-white leading-tight mb-2">
                Mari bantu, sekecil apapun berarti
              </h3>
              <p className="text-sm text-white/85 leading-relaxed">
                Banyak yang butuh uluran tangan di sekitar torang.
              </p>
            </div>

            <div className="space-y-1.5 pt-1">
              <TrustItem text="Donasi via QRIS atau transfer" accent="#FBCFE8" />
              <TrustItem text="Update progress real-time" accent="#FBCFE8" />
              <TrustItem text="Transparansi 100% ke penerima" accent="#FBCFE8" />
            </div>
          </div>

          <div className="inline-flex self-start items-center gap-1.5 bg-white px-4 py-2.5 rounded-xl text-sm font-black shadow-md" style={{ color: '#BE185D' }}>
            Baku Bantu Sekarang
            <ArrowRight size={14} strokeWidth={2.5} />
          </div>
        </Link>

      </div>
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
        <Link href="/bakabar" className="text-xs text-[#003526] font-semibold hover:underline">
          Lihat semua →
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        {articles.map((a: any) => (
          <Link key={a.id} href={`/bakabar/${a.slug}`}
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

// ────────────────────────────────────────────────────────────────
// Phase 2 v3 Helper — Render N after-article ads
// ────────────────────────────────────────────────────────────────
// after_article_count interpretation:
//   1 → 1 AdInArticle (image banner)
//   2 → 1 AdInArticle + 1 AdNativeSlug (native style variation)
//   (max 2 by COUNT_RANGES.after_article)
//
// Strategy: variety by component type, not duplicate same component.
// AdInArticle = visual image banner punch
// AdNativeSlug = blend dengan related articles section

function AfterArticleAds({ count, formatFilter }: { count: number; formatFilter: any }) {
  if (count <= 0) return null;

  return (
    <>
      <AdInArticle formatFilter={formatFilter} />
      {count >= 2 && <AdNativeSlug formatFilter={formatFilter} />}
    </>
  );
}

// ────────────────────────────────────────────────────────────────
// Phase 2 v3 Helper — Render N sidebar widgets
// ────────────────────────────────────────────────────────────────

function SidebarAds({ count, formatFilter, position }: { count: number; formatFilter: any; position: 'top' | 'bottom' }) {
  if (count <= 0) return null;

  // count=1 → cuma render position='top'
  // count=2 → render keduanya (top + bottom)
  if (count === 1 && position === 'bottom') return null;

  // Unique key per position untuk avoid React reconciliation share
  return <AdSidebarSlug key={`sidebar-${position}`} formatFilter={formatFilter} />;
}

// ────────────────────────────────────────────────────────────────
// MAIN PAGE
// ────────────────────────────────────────────────────────────────

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const [article, stats, recentReports, donation] = await Promise.all([
    getArticle(slug),
    getStats(),
    getRecentReports(),
    getDonationSummary(),
  ]);
  if (!article) notFound();

  const relatedArticles = await getRelatedArticles(article.category, slug);

  const shareUrl = `${APP_URL}/bakabar/${slug}`;
  const bodyHtml = renderBody(article.body || '');

  const parsedBody = parseBody(article.body || '');
  const menit = readingTime(parsedBody);

  // ────────────────────────────────────────────────────────────────
  // Phase 2 v3 (Turn 3a): Resolve ad_settings → preset+count
  // ────────────────────────────────────────────────────────────────
  // resolveAdSettings() handle:
  //   - NULL/undefined → DEFAULT (preset='lots', backward compat 2+2+1)
  //   - Valid JSON v3 → coerce + clamp count ranges
  //   - Malformed → DEFAULT
  //
  // article.ad_settings shape (v3):
  //   {
  //     preset: 'medium',
  //     body_inject_count: 1,
  //     sidebar_count: 1,
  //     after_article_count: 1,
  //     format_filter: 'all'
  //   }
  const adSettings = resolveAdSettings(article.ad_settings);

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        .article-body { font-family: var(--font-lora), Georgia, serif; font-size: 17px; line-height: 1.85; color: #1a1a1a; }
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
        .article-body figure.bk-fig { margin: 1.8em 0; text-align: center; }
        .article-body figure.bk-fig img {
          width: 100%; height: auto; max-height: 500px;
          object-fit: contain; border-radius: 10px;
          background: #f3f4f6; display: block; margin: 0 auto;
        }
        .article-body figure.bk-fig figcaption {
          font-family: var(--font-inter), system-ui, sans-serif;
          font-size: 13px; color: #6b7280; margin-top: 10px;
          font-style: italic; line-height: 1.5;
        }
        .article-body img.bk-inline {
          width: 100%; height: auto; max-height: 500px;
          object-fit: contain; border-radius: 10px;
          margin: 1.8em 0; display: block; background: #f3f4f6;
        }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="max-w-4xl mx-auto px-4">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">

          <article className="lg:col-span-8 pt-6 pb-16">

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

            <h1 style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}
              className="text-3xl font-bold text-gray-900 leading-snug tracking-tight mb-4">
              {article.title}
            </h1>

            <div className="flex items-center gap-2 text-xs text-gray-400 mb-5 pb-5 border-b border-gray-100 flex-wrap">
              <div className="w-6 h-6 rounded-full bg-[#003526] flex items-center justify-center text-white text-xs font-bold shrink-0">
                {(article.author?.name || 'R').charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-gray-700">{article.author?.name || 'Redaksi BAKABAR'}</span>
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

            {article.cover_image_url && (
              <div className="mb-6 rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center"
                style={{ maxHeight: 600 }}>
                <img src={article.cover_image_url} alt={article.title}
                  className="w-full h-auto object-contain"
                  style={{ maxHeight: 600 }} />
              </div>
            )}

            {article.excerpt && (
              <div className="mb-6 border-l-4 border-[#003526] pl-5 bg-[#003526]/3 py-3 pr-4 rounded-r-xl">
                <p style={{ fontFamily: 'var(--font-lora), Georgia, serif' }} className="text-lg text-gray-700 leading-relaxed italic">
                  {article.excerpt}
                </p>
              </div>
            )}

            {/* Phase 2 v3: BodyWithAds respect ad_settings.body_inject_count */}
            {bodyHtml ? (
              <BodyWithAds
                html={bodyHtml}
                adPosition={article.ad_position}
                count={adSettings.body_inject_count}
                formatFilter={adSettings.format_filter}
              />
            ) : (
              <p className="text-gray-400 italic text-sm">Konten artikel belum tersedia.</p>
            )}

            {article.tags?.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {article.tags.map((tag: string) => (
                  <span key={tag} className="bg-gray-100 text-gray-500 text-xs font-semibold px-3 py-1.5 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {article.source === 'balapor' && (
              <div className="mt-6 rounded-xl bg-[#0891B2]/6 border border-[#0891B2]/15 px-4 py-3">
                <p className="text-sm text-[#0891B2] flex items-start gap-2">
                  <span>📢</span>
                  <span>Artikel ini berasal dari laporan warga via <strong>BALAPOR</strong> TeraLoka. Identitas pelapor dilindungi.</span>
                </p>
              </div>
            )}

            <div className="mt-8">
              <ShareInline
                entity_id={article.id}
                entity_type="article"
                service_domain="bakabar"
                title={article.title}
                url={shareUrl}
              />
            </div>

            {/* Phase 2 v3: After-article zone — N count via AfterArticleAds helper */}
            {/* count=1 → AdInArticle only, count=2 → AdInArticle + AdNativeSlug variety */}
            <AfterArticleAds
              count={adSettings.after_article_count}
              formatFilter={adSettings.format_filter}
            />

            <ServiceCardsCarousel recentReports={recentReports} stats={stats} donationTotal={donation.total} />

            <RelatedArticles articles={relatedArticles} />

            <div className="mt-5">
              <WANewsletterWidget />
            </div>

            <div className="mt-8 text-center">
              <Link href="/bakabar" className="text-sm text-[#003526] font-semibold hover:underline">
                ← Baca berita lainnya di BAKABAR
              </Link>
            </div>
          </article>

          {/* Phase 2 v3: Sidebar N widgets — top + optional bottom */}
          <aside className="hidden lg:block lg:col-span-4">
            <div className="sticky top-[108px] py-6 space-y-5">
              {/* Sidebar slot 1 (top) — render if count >= 1 */}
              <SidebarAds
                count={adSettings.sidebar_count}
                formatFilter={adSettings.format_filter}
                position="top"
              />

              <div className="bg-[#003526] rounded-2xl p-5">
                <p className="text-white font-bold mb-1">Ada berita di sekitarmu?</p>
                <p className="text-xs mb-3 leading-relaxed" style={{ color: '#95d3ba' }}>
                  Laporkan via BALAPOR. Identitasmu terlindungi.
                </p>
                <Link href="/balapor/buat-laporan"
                  className="block text-center text-xs font-black px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
                  style={{ background: '#DC2626', color: '#fff' }}>
                  Lapor Sekarang →
                </Link>
              </div>

              {stats && (
                <div className="rounded-2xl p-4" style={{ background: '#FAF5FF', border: '0.5px solid #DDD6FE', borderLeft: '3px solid #8B5CF6' }}>
                  <p className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: '#5B21B6' }}>
                    <Users size={13} strokeWidth={2.2} />
                    Torang samua lagi bergerak
                  </p>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs" style={{ color: '#5B21B6' }}>Total terkumpul</span>
                      <span className="text-xs font-bold" style={{ color: '#1F2937' }}>
                        {typeof donation.total === 'number' ? `Rp ${donation.total.toLocaleString('id-ID')}` : 'Segera'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs" style={{ color: '#5B21B6' }}>Total laporan</span>
                      <span className="text-xs font-bold" style={{ color: '#1F2937' }}>
                        {typeof stats.reports?.total === 'number' ? stats.reports.total.toLocaleString('id-ID') : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs" style={{ color: '#5B21B6' }}>Total artikel</span>
                      <span className="text-xs font-bold" style={{ color: '#1F2937' }}>
                        {typeof stats.articles?.total === 'number' ? stats.articles.total.toLocaleString('id-ID') : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sidebar slot 2 (bottom) — render if count >= 2 */}
              <SidebarAds
                count={adSettings.sidebar_count}
                formatFilter={adSettings.format_filter}
                position="bottom"
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
