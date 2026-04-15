'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://teraloka.com';

const CATEGORIES = [
  { key: 'all',          label: 'Semua' },
  { key: 'berita',       label: 'Berita' },
  { key: 'politik',      label: 'Politik' },
  { key: 'ekonomi',      label: 'Ekonomi' },
  { key: 'sosial',       label: 'Sosial' },
  { key: 'transportasi', label: 'Transportasi' },
  { key: 'kesehatan',    label: 'Kesehatan' },
  { key: 'pendidikan',   label: 'Pendidikan' },
  { key: 'olahraga',     label: 'Olahraga' },
  { key: 'budaya',       label: 'Budaya' },
  { key: 'teknologi',    label: 'Teknologi' },
];

function timeAgo(dateStr: string) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function shareToWA(title: string, slug: string) {
  const url = `${APP_URL}/news/${slug}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(`📰 ${title}\n\n${url}`)}`, '_blank');
}

function ArticleCard({ article, featured = false }: { article: any; featured?: boolean }) {
  if (featured) return (
    <Link href={`/news/${article.slug}`}
      className="group block relative overflow-hidden rounded-2xl bg-white border border-gray-100 hover:shadow-lg transition-all duration-300">
      {article.cover_image_url ? (
        <div className="h-56 overflow-hidden">
          <img src={article.cover_image_url} alt={article.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
      ) : (
        <div className="h-56 bg-gradient-to-br from-[#003526] to-[#0891B2] flex items-center justify-center">
          <span className="text-5xl">📰</span>
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          {article.is_breaking && (
            <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              BREAKING
            </span>
          )}
          <span className="text-xs font-bold uppercase tracking-wide text-[#003526] bg-[#003526]/8 px-2 py-0.5 rounded-full">
            {article.category}
          </span>
          {article.source === 'balapor' && (
            <span className="text-xs font-semibold text-[#0891B2]">📢 Laporan Warga</span>
          )}
        </div>
        <h2 className="text-lg font-black text-gray-900 leading-snug tracking-tight group-hover:text-[#003526] transition-colors">
          {article.title}
        </h2>
        {article.excerpt && (
          <p className="mt-2 text-sm text-gray-500 leading-relaxed line-clamp-2">{article.excerpt}</p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="font-medium text-gray-600">{article.author?.name || 'Redaksi'}</span>
            <span>·</span>
            <span>{timeAgo(article.published_at)}</span>
          </div>
          <button onClick={(e) => { e.preventDefault(); shareToWA(article.title, article.slug); }}
            className="flex items-center gap-1 text-xs text-[#003526] font-semibold hover:bg-[#003526]/5 px-2 py-1 rounded-lg transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Bagikan
          </button>
        </div>
      </div>
    </Link>
  );

  return (
    <Link href={`/news/${article.slug}`}
      className="group flex gap-3 bg-white rounded-xl border border-gray-100 p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      {article.cover_image_url ? (
        <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-100">
          <img src={article.cover_image_url} alt={article.title} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300" />
        </div>
      ) : (
        <div className="w-20 h-20 rounded-xl shrink-0 flex items-center justify-center text-2xl bg-gradient-to-br from-[#003526]/10 to-[#0891B2]/10">📰</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {article.is_breaking && (
            <span className="text-xs font-bold text-red-500">🔴</span>
          )}
          <span className="text-xs font-bold text-[#003526] uppercase tracking-wide">{article.category}</span>
          {article.source === 'balapor' && <span className="text-xs text-[#0891B2]">📢</span>}
        </div>
        <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-[#003526] transition-colors">{article.title}</h3>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs text-gray-400">{timeAgo(article.published_at)}</span>
          <button onClick={(e) => { e.preventDefault(); shareToWA(article.title, article.slug); }}
            className="text-xs text-[#003526] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
            Bagikan →
          </button>
        </div>
      </div>
    </Link>
  );
}

function NewsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
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
        const newArticles = data.data ?? [];
        reset ? setArticles(newArticles) : setArticles(prev => [...prev, ...newArticles]);
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
    <div className="min-h-screen bg-[#f9f9f8] pb-24">

      {/* Masthead */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-black text-[#003526] tracking-tight">BAKABAR</h1>
              <p className="text-xs text-gray-400">Berita & informasi terkini Maluku Utara</p>
            </div>
            <form onSubmit={handleSearch} className="flex gap-1.5">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Cari berita..."
                  className="pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl w-36 outline-none focus:border-[#003526] bg-gray-50" />
              </div>
              {searchInput && (
                <button type="button" onClick={() => { setSearchInput(''); setSearch(''); router.push('/news'); }}
                  className="text-gray-400 hover:text-gray-600 px-2">✕</button>
              )}
            </form>
          </div>
          {/* Category pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {CATEGORIES.map(cat => (
              <button key={cat.key} onClick={() => setCategory(cat.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  category === cat.key ? 'bg-[#003526] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* Breaking news ticker */}
        {breaking.length > 0 && (
          <div className="flex items-center gap-3 bg-red-600 text-white rounded-xl px-4 py-2.5 overflow-hidden">
            <span className="text-xs font-black uppercase tracking-wider shrink-0 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              BREAKING
            </span>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold whitespace-nowrap">{breaking[0]?.title}</p>
            </div>
            <Link href={`/news/${breaking[0]?.slug}`} className="text-xs font-bold shrink-0 underline">Baca</Link>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl overflow-hidden animate-pulse">
              <div className="h-56 bg-gray-200" />
              <div className="p-5 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-20" />
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-full" />
              </div>
            </div>
            {[1,2,3].map(i => (
              <div key={i} className="flex gap-3 bg-white rounded-xl p-3.5 animate-pulse">
                <div className="w-20 h-20 rounded-xl bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-gray-200 rounded w-16" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && articles.length === 0 && (
          <div className="rounded-2xl bg-white border border-gray-100 p-12 text-center">
            <div className="text-5xl mb-3">📰</div>
            <p className="font-bold text-gray-700">Belum ada berita</p>
            <p className="text-sm text-gray-400 mt-1">
              {search ? `Tidak ada hasil untuk "${search}"` : 'Belum ada artikel yang dipublish'}
            </p>
            <Link href="/reports" className="mt-4 inline-block bg-[#003526] text-white text-sm font-bold px-5 py-2.5 rounded-xl">
              Jadi yang pertama melapor →
            </Link>
          </div>
        )}

        {/* Articles */}
        {!loading && articles.length > 0 && (
          <>
            {/* Featured article */}
            {featured && <ArticleCard article={featured} featured />}

            {/* Divider with label */}
            {rest.length > 0 && (
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Terbaru</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            )}

            {/* Rest of articles */}
            <div className="space-y-2">
              {rest.map(article => <ArticleCard key={article.id} article={article} />)}
            </div>

            {/* Load more */}
            {hasMore && (
              <button onClick={() => fetchArticles(false)} disabled={loadingMore}
                className="w-full py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                {loadingMore ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-gray-300 border-t-[#003526] rounded-full animate-spin" />
                    Memuat...
                  </span>
                ) : 'Muat lebih banyak'}
              </button>
            )}

            {!hasMore && articles.length > 0 && (
              <p className="text-center text-xs text-gray-400 py-2">
                Menampilkan {articles.length} artikel
              </p>
            )}
          </>
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
