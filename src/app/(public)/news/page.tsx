'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

const CATEGORIES = [
  { key: 'all', label: 'Semua' },
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

function timeAgo(dateStr: string) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function NewsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const category = searchParams.get('category') || 'all';

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '30' });
      if (category !== 'all') params.set('category', category);
      if (search) params.set('q', search);

      const res = await fetch(`${API}/content/articles?${params}`);
      const data = await res.json();
      if (data.success) setArticles(data.data ?? []);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const setCategory = (key: string) => {
    const params = new URLSearchParams();
    if (key !== 'all') params.set('category', key);
    if (search) params.set('q', search);
    router.push(`/news?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (searchInput) params.set('q', searchInput);
    router.push(`/news?${params.toString()}`);
  };

  // Breaking news — artikel terbaru dengan is_breaking
  const breaking = articles.filter(a => a.is_breaking);
  const regular = articles.filter(a => !a.is_breaking);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px 60px', fontFamily: "'Outfit', system-ui" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap'); @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>

      {/* Header */}
      <div style={{ padding: '20px 0 16px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1B6B4A', letterSpacing: '-0.5px' }}>
          BAKABAR
        </h1>
        <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>
          Berita & informasi terkini Maluku Utara
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Cari berita..."
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 20,
            border: '1px solid #E5E7EB', fontSize: 13, outline: 'none',
            background: '#F9FAFB',
          }}
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => { setSearchInput(''); setSearch(''); router.push('/news'); }}
            style={{ padding: '10px 14px', borderRadius: 20, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#6B7280' }}
          >✕</button>
        )}
      </form>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 16 }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            style={{
              padding: '6px 16px', borderRadius: 20, border: 'none',
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
              whiteSpace: 'nowrap', flexShrink: 0,
              background: category === cat.key ? '#1B6B4A' : '#F3F4F6',
              color: category === cat.key ? '#fff' : '#374151',
              transition: 'all 0.15s',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Breaking news */}
      {breaking.length > 0 && (
        <div style={{
          background: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 12, padding: '12px 14px', marginBottom: 20,
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#DC2626', marginBottom: 8, letterSpacing: '0.5px' }}>
            🔴 BREAKING
          </div>
          {breaking.map((item) => (
            <Link key={item.id} href={`/news/${item.slug}`} style={{ display: 'block', textDecoration: 'none' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', lineHeight: 1.4 }}>
                {item.title}
              </p>
            </Link>
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '12px', borderRadius: 12, border: '1px solid #F3F4F6' }}>
              <div style={{ width: 80, height: 80, borderRadius: 10, background: '#F3F4F6', flexShrink: 0, animation: 'pulse 1.5s infinite' }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 14, background: '#F3F4F6', borderRadius: 6, marginBottom: 8, animation: 'pulse 1.5s infinite' }} />
                <div style={{ height: 12, width: '70%', background: '#F3F4F6', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && regular.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: '#F9FAFB', borderRadius: 16 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📰</div>
          <p style={{ fontWeight: 700, color: '#374151', fontSize: 16 }}>Belum ada berita</p>
          <p style={{ color: '#9CA3AF', fontSize: 13, marginTop: 4 }}>
            {search ? `Tidak ada hasil untuk "${search}"` : 'Belum ada artikel yang dipublish'}
          </p>
          <Link href="/reports" style={{
            display: 'inline-block', marginTop: 16,
            padding: '10px 20px', borderRadius: 20,
            background: '#1B6B4A', color: '#fff',
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}>
            Jadi yang pertama melapor →
          </Link>
        </div>
      )}

      {/* Article list */}
      {!loading && regular.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {regular.map((article, idx) => (
            <Link
              key={article.id}
              href={`/news/${article.slug}`}
              style={{
                display: 'flex', gap: 12, textDecoration: 'none',
                padding: '12px', borderRadius: 14,
                border: '1px solid #F3F4F6',
                background: '#fff',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#F3F4F6';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Cover image */}
              {article.cover_image_url ? (
                <div style={{ width: 90, height: 90, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#F3F4F6' }}>
                  <img src={article.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <div style={{
                  width: 90, height: 90, borderRadius: 10, flexShrink: 0,
                  background: 'linear-gradient(135deg, rgba(27,107,74,0.1), rgba(8,145,178,0.1))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28,
                }}>📰</div>
              )}

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Category badge */}
                {article.category && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#1B6B4A',
                    background: 'rgba(27,107,74,0.08)',
                    padding: '2px 8px', borderRadius: 10,
                    display: 'inline-block', marginBottom: 5,
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>
                    {article.category}
                  </span>
                )}

                <p style={{
                  fontSize: 14, fontWeight: 700, color: '#111827',
                  lineHeight: 1.4, marginBottom: 4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {article.title}
                </p>

                {article.excerpt && (
                  <p style={{
                    fontSize: 12, color: '#6B7280', lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    marginBottom: 6,
                  }}>
                    {article.excerpt}
                  </p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9CA3AF' }}>
                  <span>{article.author?.name || 'Redaksi'}</span>
                  <span>·</span>
                  <span>{timeAgo(article.published_at)}</span>
                  {article.source === 'balapor' && (
                    <>
                      <span>·</span>
                      <span style={{ color: '#0891B2', fontWeight: 600 }}>📢 Laporan Warga</span>
                    </>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NewsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #1B6B4A', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <NewsPageContent />
    </Suspense>
  );
}
