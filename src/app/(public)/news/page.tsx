'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const API     = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL  || 'https://teraloka.com';

// ── Utils ─────────────────────────────────────────────────────────

function parseExcerpt(excerpt?: string | null, body?: string | null): string {
  const candidates = [excerpt, body].filter((s): s is string => !!(s?.trim()));
  for (const raw of candidates) {
    if (raw.trim().startsWith('{')) {
      try {
        const p = JSON.parse(raw);
        const text = p.content || p.excerpt || p.body || p.text || '';
        if (text) return String(text).replace(/\n/g, ' ').trim().slice(0, 180);
      } catch {
        const m = raw.match(/"content"\s*:\s*"([\s\S]{10,}?)(?:","|\"})/);
        if (m?.[1]) return m[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').trim().slice(0, 180);
      }
      continue;
    }
    return raw.trim().slice(0, 180);
  }
  return '';
}

function timeAgo(dateStr: string) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d} hari lalu`
    : new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function shareWA(title: string, slug: string) {
  const url = `${APP_URL}/news/${slug}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(`📰 ${title}\n\n${url}`)}`, '_blank');
}

function shareFB(slug: string) {
  const url = `${APP_URL}/news/${slug}`;
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
}

// Track share ke backend
async function trackShare(articleId: string) {
  try {
    await fetch(`${API}/content/articles/${articleId}/share`, { method: 'POST' });
  } catch {}
}

// ── Ad Slots ──────────────────────────────────────────────────────

function AdBanner() {
  return (
    <div className="w-full flex items-center justify-center rounded-xl my-3"
      style={{ height: 80, background: 'linear-gradient(to right, #F0FDF4, #F9FAFB)', border: '1.5px dashed #BBF7D0' }}>
      <div className="text-center">
        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Iklan Mitra TeraLoka</p>
        <p className="text-xs text-gray-400 mt-0.5">
          728 × 90 — <a href="mailto:ads@teraloka.com" className="text-[#003526] font-semibold">ads@teraloka.com</a>
        </p>
      </div>
    </div>
  );
}

function AdNative() {
  return (
    <div className="flex items-center gap-3 rounded-xl p-4 my-3"
      style={{ background: 'linear-gradient(to right, #F0FDF4, #F9FAFB)', border: '1.5px dashed #BBF7D0' }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
        style={{ background: '#D1FAE5' }}>📢</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Iklan Mitra</p>
        <p className="text-sm font-semibold text-gray-700 mt-0.5">Pasang iklan di BAKABAR TeraLoka</p>
        <p className="text-xs text-gray-400">Jangkau warga Maluku Utara setiap hari</p>
      </div>
      <a href="mailto:ads@teraloka.com"
        className="shrink-0 text-xs font-bold text-white px-4 py-2 rounded-full"
        style={{ background: '#003526' }}>Pasang</a>
    </div>
  );
}

function AdSidebar({ height = 260, label = '300 × 250' }: { height?: number; label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl"
      style={{ height, background: 'linear-gradient(to bottom, #F0FDF4, #F9FAFB)', border: '1.5px dashed #BBF7D0' }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: '#D1FAE5' }}>📢</div>
      <div className="text-center px-4">
        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Iklan Mitra</p>
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      </div>
      <a href="mailto:ads@teraloka.com"
        className="text-xs font-bold text-white px-4 py-1.5 rounded-full"
        style={{ background: '#003526' }}>Pasang Iklan →</a>
    </div>
  );
}

// ── Share buttons ─────────────────────────────────────────────────
function ShareButtons({ id, title, slug, className = '' }: { id?: string; title: string; slug: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <button onClick={e => { e.preventDefault(); shareWA(title, slug); if (id) trackShare(id); }}
        className="flex items-center gap-1 text-xs font-bold text-green-600 hover:opacity-75 transition-opacity">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        WA
      </button>
      <span className="text-gray-200 text-xs">|</span>
      <button onClick={e => { e.preventDefault(); shareFB(slug); if (id) trackShare(id); }}
        className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:opacity-75 transition-opacity">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
        FB
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────

function NewsPageContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [articles,    setArticles]    = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(false);
  const [page,        setPage]        = useState(1);

  // ── Params dari URL (set oleh CategoryTabs 2-layer) ──────
  const type     = searchParams.get('type')     || 'terbaru';
  const location = searchParams.get('location') || 'all';
  const q        = searchParams.get('q')        || '';

  const fetchArticles = useCallback(async (reset = true) => {
    reset ? setLoading(true) : setLoadingMore(true);
    try {
      const p = new URLSearchParams({ limit: '12', page: String(reset ? 1 : page) });
      if (type !== 'terbaru')  p.set('type', type);
      if (location !== 'all')  p.set('location', location);
      if (q)                   p.set('q', q);

      const res  = await fetch(`${API}/content/articles?${p}`);
      const data = await res.json();

      if (data.success) {
        const items = data.data ?? [];
        reset ? setArticles(items) : setArticles(prev => [...prev, ...items]);
        setHasMore(data.meta?.has_more || false);
        if (!reset) setPage(prev => prev + 1);
      }
    } catch {
      if (reset) setArticles([]);
    } finally {
      reset ? setLoading(false) : setLoadingMore(false);
    }
  }, [type, location, q, page]);

  useEffect(() => { setPage(1); fetchArticles(true); }, [type, location, q]);

  const featured        = articles[0];
  const rest            = articles.slice(1);
  const featuredExcerpt = featured ? parseExcerpt(featured.excerpt, featured.body) : '';
  const breaking        = articles.filter(a => a.is_breaking);

  // ── Page title berdasarkan filter aktif ──────────────────
  const pageTitle = (() => {
    if (type === 'viral')    return '🔥 Viral di Maluku Utara';
    if (type === 'nasional') return '🗞️ Berita Nasional';
    if (location !== 'all') {
      // Cari nama lokasi dari artikel yang ada
      const loc = articles.find(a => a.location?.slug === location)?.location;
      return loc ? `📍 ${loc.name}` : `📍 ${location}`;
    }
    return null;
  })();

  return (
    <div className="min-h-screen bg-white">

      {/* Breaking ticker */}
      {breaking.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pt-3">
          <div className="flex items-center gap-3 bg-[#003526] text-white rounded-xl px-4 py-2.5">
            <span className="text-xs font-black uppercase shrink-0 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />BREAKING
            </span>
            <Link href={`/news/${breaking[0]?.slug}`} className="text-xs font-semibold flex-1 truncate hover:underline">
              {breaking[0]?.title}
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4">

        <AdBanner />

        {/* Page title kalau ada filter aktif */}
        {pageTitle && (
          <div className="mb-4">
            <h2 className="text-lg font-black text-gray-900">{pageTitle}</h2>
            {location !== 'all' && (
              <p className="text-xs text-gray-400 mt-0.5">
                Menampilkan berita {type === 'viral' ? 'viral ' : ''}dari wilayah ini
              </p>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-4 py-4">
            <div className="animate-pulse h-56 bg-gray-100 rounded-2xl" />
            {[1,2,3].map(i => (
              <div key={i} className="flex gap-3 animate-pulse py-3 border-b border-gray-50">
                <div className="w-20 h-20 bg-gray-100 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-16" />
                  <div className="h-4 bg-gray-100 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && articles.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-5xl mb-3">{type === 'viral' ? '🔥' : type === 'nasional' ? '🗞️' : '📰'}</p>
            <p className="font-bold text-gray-700 text-lg">
              {type === 'viral' ? 'Belum ada berita viral' :
               type === 'nasional' ? 'Belum ada berita nasional' :
               location !== 'all' ? `Belum ada berita dari wilayah ini` :
               q ? `Tidak ada hasil untuk "${q}"` : 'Belum ada artikel'}
            </p>
            {type === 'viral' && (
              <p className="text-sm text-gray-400 mt-2">Artikel dengan banyak dibaca & dibagikan akan muncul di sini</p>
            )}
          </div>
        )}

        {/* Content */}
        {!loading && articles.length > 0 && (
          <div className="lg:grid lg:grid-cols-12 lg:gap-6">

            {/* Main column */}
            <div className="lg:col-span-8">

              {/* Featured */}
              {featured && (
                <Link href={featured.source === 'rss' ? featured.external_url || `/news/${featured.slug}` : `/news/${featured.slug}`}
                  target={featured.source === 'rss' ? '_blank' : undefined}
                  className="group block mb-6">
                  <div className="relative overflow-hidden rounded-2xl mb-3">
                    {featured.cover_image_url ? (
                      <img src={featured.cover_image_url} alt={featured.title}
                        className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-64 bg-gradient-to-br from-[#003526] to-[#0891B2] flex items-center justify-center">
                        <span className="text-6xl">📰</span>
                      </div>
                    )}
                    {featured.is_breaking && (
                      <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />BREAKING
                      </div>
                    )}
                    {featured.is_viral && (
                      <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-black px-2.5 py-1 rounded-full">
                        🔥 Viral
                      </div>
                    )}
                    {featured.source === 'rss' && (
                      <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                        🗞️ Nasional
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    {featured.category && (
                      <span className="text-xs font-bold uppercase tracking-wide text-[#003526] bg-[#003526]/8 px-2 py-0.5 rounded-full">
                        {featured.category}
                      </span>
                    )}
                    {featured.location && (
                      <span className="text-xs font-semibold text-gray-400 flex items-center gap-0.5">
                        📍 {featured.location.name}
                      </span>
                    )}
                    {featured.source === 'balapor' && <span className="text-xs text-[#0891B2] font-semibold">📢 Laporan Warga</span>}
                  </div>

                  <h2 className="text-xl font-black text-gray-900 leading-snug group-hover:text-[#003526] transition-colors mb-2">
                    {featured.title}
                  </h2>

                  {featuredExcerpt && (
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-2">{featuredExcerpt}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {featured.source === 'rss'
                        ? featured.source_name || 'Media Nasional'
                        : featured.author?.name || 'Redaksi'
                      } · {timeAgo(featured.published_at)}
                    </span>
                    {featured.source !== 'rss' && (
                      <ShareButtons id={featured.id} title={featured.title} slug={featured.slug} />
                    )}
                    {featured.source === 'rss' && (
                      <span className="text-xs text-gray-400 italic">Baca di sumber asli →</span>
                    )}
                  </div>
                </Link>
              )}

              <div className="h-px bg-gray-100 mb-4" />

              {/* Article list */}
              <div className="space-y-0">
                {rest.map((article, idx) => {
                  const excerpt  = parseExcerpt(article.excerpt, article.body);
                  const isRSS    = article.source === 'rss';
                  const href     = isRSS ? (article.external_url || `/news/${article.slug}`) : `/news/${article.slug}`;

                  return (
                    <div key={article.id}>
                      {idx > 0 && idx % 4 === 0 && <AdNative />}

                      <Link href={href} target={isRSS ? '_blank' : undefined}
                        className="group flex gap-3 py-4 border-b border-gray-50 hover:bg-gray-50/60 -mx-2 px-2 rounded-xl transition-colors">
                        {article.cover_image_url ? (
                          <div className="w-24 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                            <img src={article.cover_image_url} alt={article.title}
                              className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300" />
                          </div>
                        ) : (
                          <div className="w-24 h-20 rounded-xl shrink-0 flex items-center justify-center text-2xl"
                            style={{ background: 'linear-gradient(135deg, rgba(0,53,38,0.08), rgba(8,145,178,0.08))' }}>
                            📰
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            {article.is_breaking && <span className="text-xs font-bold text-red-500">🔴</span>}
                            {article.is_viral    && <span className="text-xs font-bold text-orange-500">🔥</span>}
                            {article.category    && <span className="text-xs font-bold text-[#003526] uppercase tracking-wide">{article.category}</span>}
                            {article.location    && <span className="text-xs text-gray-400">📍 {article.location.name}</span>}
                            {isRSS               && <span className="text-xs text-gray-400">🗞️ Nasional</span>}
                            {article.source === 'balapor' && <span className="text-xs text-[#0891B2]">📢</span>}
                          </div>

                          <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-3 group-hover:text-[#003526] transition-colors mb-1.5">
                            {article.title}
                          </h3>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                              {isRSS ? (article.source_name || 'Media Nasional') : timeAgo(article.published_at)}
                            </span>
                            {!isRSS && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <ShareButtons id={article.id} title={article.title} slug={article.slug} />
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>

              {hasMore && (
                <button onClick={() => fetchArticles(false)} disabled={loadingMore}
                  className="w-full mt-6 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                  {loadingMore ? 'Memuat...' : 'Muat lebih banyak'}
                </button>
              )}
            </div>

            {/* Sidebar */}
            <div className="hidden lg:block lg:col-span-4">
              <div className="sticky top-44 space-y-5">
                <AdSidebar height={260} label="300 × 250" />
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-xs font-black text-gray-800 uppercase tracking-widest mb-3">🔥 Terpopuler</p>
                  {articles.slice(0, 5).map((a, i) => (
                    <Link key={a.id} href={`/news/${a.slug}`}
                      className="flex items-start gap-2.5 py-2.5 border-b border-gray-100 last:border-0 group">
                      <span className="text-2xl font-black text-gray-200 leading-none w-6 shrink-0">{i + 1}</span>
                      <p className="text-xs font-semibold text-gray-700 leading-snug group-hover:text-[#003526] line-clamp-3">{a.title}</p>
                    </Link>
                  ))}
                </div>
                <AdSidebar height={210} label="300 × 200" />
                <div className="bg-[#003526] rounded-2xl p-5 text-center">
                  <p className="text-white font-bold text-sm mb-1">Ada berita di sekitarmu?</p>
                  <p className="text-xs mb-3" style={{ color: '#95d3ba' }}>Laporkan via BALAPOR.</p>
                  <Link href="/reports" className="block text-center bg-white text-xs font-black px-4 py-2 rounded-xl" style={{ color: '#003526' }}>
                    Lapor Sekarang →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && articles.length > 0 && <AdBanner />}
      </div>
    </div>
  );
}

export default function NewsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[#003526] border-t-transparent animate-spin" />
      </div>
    }>
      <NewsPageContent />
    </Suspense>
  );
}
