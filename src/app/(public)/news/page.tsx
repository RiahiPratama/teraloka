'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://teraloka.com';

const CATEGORIES = [
  { key: 'all', label: 'Terbaru' },
  { key: 'berita', label: 'Berita' },
  { key: 'politik', label: 'Politik' },
  { key: 'ekonomi', label: 'Ekonomi' },
  { key: 'sosial', label: 'Sosial' },
  { key: 'transportasi', label: 'Transportasi' },
  { key: 'kesehatan', label: 'Kesehatan' },
  { key: 'pendidikan', label: 'Pendidikan' },
  { key: 'olahraga', label: 'Olahraga' },
  { key: 'budaya', label: 'Budaya' },
  { key: 'teknologi', label: 'Teknologi' },
];

// ── Ad Slot Component ─────────────────────────────────────────
// Slot ini bisa diisi iklan mitra / Google AdSense
function AdSlot({ type = 'banner' }: { type?: 'banner' | 'native' }) {
  if (type === 'native') return (
    <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 flex items-center gap-3">
      <div className="w-16 h-16 rounded-lg bg-gray-200 shrink-0 flex items-center justify-center text-gray-400 text-xs font-bold">
        📢
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-0.5">IKLAN MITRA</p>
        <p className="text-sm font-semibold text-gray-700">Pasang iklan di TeraLoka</p>
        <p className="text-xs text-gray-400 mt-0.5">Jangkau warga Maluku Utara. Hubungi tim kami.</p>
      </div>
      <a href="mailto:ads@teraloka.com" className="text-xs bg-[#003526] text-white px-3 py-1.5 rounded-lg font-bold shrink-0">
        Pasang
      </a>
    </div>
  );

  return (
    <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl h-20 flex items-center justify-center">
      <div className="text-center">
        <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">IKLAN MITRA TERALOKA</p>
        <p className="text-xs text-gray-300 mt-0.5">728 × 90 — Hubungi ads@teraloka.com</p>
      </div>
    </div>
  );
}

function timeAgo(dateStr: string) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d} hari lalu` : new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function shareToFB(slug: string) {
  const url = `${APP_URL}/news/${slug}`;
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank", "width=600,height=400");
}

function shareToWA(title: string, slug: string) {
  const url = `${APP_URL}/news/${slug}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(`📰 ${title}\n\n${url}`)}`, '_blank');
}

function NewsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const category = searchParams.get('category') || 'all';

  const fetchArticles = useCallback(async (reset = true) => {
    reset ? setLoading(true) : setLoadingMore(true);
    try {
      const p = new URLSearchParams({ limit: '12', page: String(reset ? 1 : page) });
      if (category !== 'all') p.set('category', category);
      if (search) p.set('q', search);
      const res = await fetch(`${API}/content/articles?${p}`);
      const data = await res.json();
      if (data.success) {
        const items = data.data ?? [];
        reset ? setArticles(items) : setArticles(prev => [...prev, ...items]);
        setHasMore(data.meta?.has_more || false);
        if (!reset) setPage(prev => prev + 1);
      }
    } catch { if (reset) setArticles([]); }
    finally { reset ? setLoading(false) : setLoadingMore(false); }
  }, [category, search, page]);

  useEffect(() => { setPage(1); fetchArticles(true); }, [category, search]);

  const setCategory = (key: string) => {
    const p = new URLSearchParams();
    if (key !== 'all') p.set('category', key);
    if (search) p.set('q', search);
    router.push(`/news?${p.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    const p = new URLSearchParams();
    if (category !== 'all') p.set('category', category);
    if (searchInput) p.set('q', searchInput);
    router.push(`/news?${p.toString()}`);
  };

  const breaking = articles.filter(a => a.is_breaking);
  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <div className="min-h-screen bg-white">

      {/* ── Top Nav — kumparan style ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto">
          {/* Top row */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
            <Link href="/" className="text-xl font-black text-[#003526] tracking-tight shrink-0">
              Tera<span className="text-[#0891B2]">Loka</span>
            </Link>
            <span className="text-gray-200">|</span>
            <span className="text-sm font-bold text-[#003526]">BAKABAR</span>
            <form onSubmit={handleSearch} className="flex-1 flex gap-1.5 max-w-xs ml-auto">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
                  placeholder="Cari berita..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-gray-50 outline-none focus:border-[#003526]" />
              </div>
              {searchInput && (
                <button type="button" onClick={() => { setSearchInput(''); setSearch(''); router.push('/news'); }}
                  className="text-gray-400 px-1 text-sm">✕</button>
              )}
            </form>
          </div>
          {/* Category tabs */}
          <div className="flex gap-0 overflow-x-auto scrollbar-none">
            {CATEGORIES.map(cat => (
              <button key={cat.key} onClick={() => setCategory(cat.key)}
                className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                  category === cat.key
                    ? 'border-[#003526] text-[#003526]'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4">

        {/* Top banner ad */}
        <div className="py-3">
          <AdSlot type="banner" />
        </div>

        {/* Breaking news ticker */}
        {breaking.length > 0 && (
          <div className="flex items-center gap-3 bg-[#003526] text-white rounded-xl px-4 py-2.5 mb-4 overflow-hidden">
            <span className="text-xs font-black uppercase tracking-wider shrink-0 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              BREAKING
            </span>
            <Link href={`/news/${breaking[0]?.slug}`} className="text-xs font-semibold flex-1 truncate hover:underline">
              {breaking[0]?.title}
            </Link>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-4 py-4">
            <div className="animate-pulse">
              <div className="h-56 bg-gray-100 rounded-2xl mb-3" />
              <div className="h-5 bg-gray-100 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-full" />
            </div>
            {[1,2,3].map(i => (
              <div key={i} className="flex gap-3 animate-pulse py-3 border-b border-gray-50">
                <div className="w-20 h-20 bg-gray-100 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-16" />
                  <div className="h-4 bg-gray-100 rounded w-full" />
                  <div className="h-4 bg-gray-100 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && articles.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-4xl mb-3">📰</p>
            <p className="font-bold text-gray-700">Belum ada berita</p>
            <p className="text-sm text-gray-400 mt-1">{search ? `Tidak ada hasil untuk "${search}"` : 'Belum ada artikel yang dipublish'}</p>
          </div>
        )}

        {/* Content */}
        {!loading && articles.length > 0 && (
          <div className="lg:grid lg:grid-cols-12 lg:gap-6">

            {/* Main column */}
            <div className="lg:col-span-8">

              {/* Featured hero */}
              {featured && (
                <Link href={`/news/${featured.slug}`} className="group block mb-6">
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
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
                        BREAKING
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-[#003526] bg-[#003526]/8 px-2 py-0.5 rounded-full">{featured.category}</span>
                    {featured.source === 'balapor' && <span className="text-xs text-[#0891B2] font-semibold">📢 Laporan Warga</span>}
                  </div>
                  <h2 className="text-xl font-black text-gray-900 leading-snug group-hover:text-[#003526] transition-colors">{featured.title}</h2>
                  {featured.excerpt && <p className="text-sm text-gray-500 mt-1.5 leading-relaxed line-clamp-2">{featured.excerpt}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">{featured.author?.name || 'Redaksi'} · {timeAgo(featured.published_at)}</span>
                    <button onClick={e => { e.preventDefault(); shareToWA(featured.title, featured.slug); }}
                      className="text-xs text-[#003526] font-semibold flex items-center gap-1 hover:opacity-70">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      Bagikan
                    </button>
                  </div>
                </Link>
              )}

              <div className="h-px bg-gray-100 mb-4" />

              {/* Article list with native ad every 4 articles */}
              <div className="space-y-0">
                {rest.map((article, idx) => (
                  <div key={article.id}>
                    {/* Native ad every 4 articles */}
                    {idx > 0 && idx % 4 === 0 && (
                      <div className="py-3">
                        <AdSlot type="native" />
                      </div>
                    )}
                    <Link href={`/news/${article.slug}`}
                      className="group flex gap-3 py-4 border-b border-gray-50 hover:bg-gray-50/50 -mx-2 px-2 rounded-xl transition-colors">
                      {article.cover_image_url ? (
                        <div className="w-24 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                          <img src={article.cover_image_url} alt={article.title} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300" />
                        </div>
                      ) : (
                        <div className="w-24 h-20 rounded-xl shrink-0 flex items-center justify-center text-2xl bg-gradient-to-br from-[#003526]/8 to-[#0891B2]/8">📰</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          {article.is_breaking && <span className="text-xs font-bold text-red-500">🔴</span>}
                          <span className="text-xs font-bold text-[#003526] uppercase tracking-wide">{article.category}</span>
                          {article.source === 'balapor' && <span className="text-xs text-[#0891B2]">📢</span>}
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-3 group-hover:text-[#003526] transition-colors">{article.title}</h3>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-xs text-gray-400">{timeAgo(article.published_at)}</span>
                          <button onClick={e => { e.preventDefault(); shareToWA(article.title, article.slug); }}
                            className="text-xs text-[#003526] opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                            Bagikan →
                          </button>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>

              {/* Load more */}
              {hasMore && (
                <button onClick={() => fetchArticles(false)} disabled={loadingMore}
                  className="w-full mt-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                  {loadingMore ? 'Memuat...' : 'Muat lebih banyak'}
                </button>
              )}
            </div>

            {/* Sidebar — desktop only */}
            <div className="hidden lg:block lg:col-span-4">
              <div className="sticky top-32 space-y-4">

                {/* Sidebar ad */}
                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl h-60 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 font-bold uppercase">IKLAN MITRA</p>
                    <p className="text-xs text-gray-300 mt-1">300 × 250</p>
                    <a href="mailto:ads@teraloka.com" className="mt-2 block text-xs text-[#003526] font-bold">Pasang Iklan →</a>
                  </div>
                </div>

                {/* Trending / terpopuler */}
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-xs font-black text-gray-800 uppercase tracking-widest mb-3">🔥 Terpopuler</p>
                  {articles.slice(0, 5).map((a, i) => (
                    <Link key={a.id} href={`/news/${a.slug}`}
                      className="flex items-start gap-2.5 py-2.5 border-b border-gray-100 last:border-0 group">
                      <span className="text-2xl font-black text-gray-200 leading-none w-6 shrink-0">{i + 1}</span>
                      <p className="text-xs font-semibold text-gray-700 leading-snug group-hover:text-[#003526] transition-colors line-clamp-3">{a.title}</p>
                    </Link>
                  ))}
                </div>

                {/* Second sidebar ad */}
                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl h-52 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 font-bold uppercase">IKLAN MITRA</p>
                    <p className="text-xs text-gray-300 mt-1">300 × 200</p>
                  </div>
                </div>

                {/* CTA Lapor */}
                <div className="bg-[#003526] rounded-2xl p-4 text-center">
                  <p className="text-white font-bold text-sm mb-1">Ada berita di sekitarmu?</p>
                  <p className="text-[#95d3ba] text-xs mb-3">Laporkan via BALAPOR</p>
                  <Link href="/reports" className="inline-block bg-white text-[#003526] text-xs font-black px-4 py-2 rounded-xl">
                    Lapor Sekarang →
                  </Link>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Bottom banner ad */}
        {!loading && articles.length > 0 && (
          <div className="py-4">
            <AdSlot type="banner" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function NewsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-8 h-8 rounded-full border-3 border-[#003526] border-t-transparent animate-spin" />
      </div>
    }>
      <NewsPageContent />
    </Suspense>
  );
}
