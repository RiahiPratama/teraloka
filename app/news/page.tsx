'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://teraloka.com'

interface Article {
  id: string
  title: string
  slug: string
  excerpt: string
  category: string
  photo_url?: string
  source: string
  published_at: string
  author?: { name: string }
}

const CATEGORIES = [
  { key: 'all', label: 'Semua' },
  { key: 'infrastruktur', label: '🏗️ Infrastruktur' },
  { key: 'lingkungan', label: '🌿 Lingkungan' },
  { key: 'keamanan', label: '🚨 Keamanan' },
  { key: 'sosial', label: '👥 Sosial' },
  { key: 'ekonomi', label: '💰 Ekonomi' },
  { key: 'umum', label: '📋 Umum' }
]

function shareToWA(title: string, slug: string) {
  const url = `${APP_URL}/news/${slug}`
  const text = encodeURIComponent(`📰 ${title}\n\nBaca di TeraLoka:\n${url}`)
  window.open(`https://wa.me/?text=${text}`, '_blank')
}

function NewsContent() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [category, setCategory] = useState('all')
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [totalArticles, setTotalArticles] = useState(0)

  useEffect(() => {
    setArticles([])
    setPage(1)
    fetchArticles(1, category, true)
  }, [category])

  async function fetchArticles(p: number, cat: string, reset = false) {
    if (p === 1) setLoading(true)
    else setLoadingMore(true)

    try {
      const res = await fetch(`${API_URL}/content/articles?category=${cat}&page=${p}&limit=10`)
      const data = await res.json()
      const newArticles = data.articles || []

      if (reset) {
        setArticles(newArticles)
      } else {
        setArticles(prev => [...prev, ...newArticles])
      }

      setHasNext(data.pagination?.has_next || false)
      setTotalArticles(data.pagination?.total || 0)
      setPage(p)
    } catch {
      if (reset) setArticles([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  function loadMore() {
    fetchArticles(page + 1, category)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-lg font-bold text-gray-900">BAKABAR</h1>
              <p className="text-xs text-gray-400">
                {totalArticles > 0 ? `${totalArticles} artikel` : 'Berita lokal Maluku Utara'}
              </p>
            </div>
            <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">← Beranda</Link>
          </div>
          {/* Category filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  category === cat.key
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="h-40 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">📰</div>
            <p>Belum ada artikel di kategori ini</p>
          </div>
        ) : (
          <>
            {/* Artikel pertama — featured */}
            {articles[0] && (
              <div className="bg-white rounded-2xl overflow-hidden mb-4 border border-gray-100">
                {articles[0].photo_url ? (
                  <img src={articles[0].photo_url} alt={articles[0].title}
                    className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-32 bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                    <span className="text-4xl">📰</span>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full capitalize">
                      {articles[0].category}
                    </span>
                    {articles[0].source === 'balapor' && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Laporan Warga</span>
                    )}
                  </div>
                  <Link href={`/news/${articles[0].slug}`}>
                    <h2 className="font-bold text-gray-900 text-lg leading-snug mb-2 hover:text-green-700 transition-colors">
                      {articles[0].title}
                    </h2>
                  </Link>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">{articles[0].excerpt}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {new Date(articles[0].published_at).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </span>
                    <button
                      onClick={() => shareToWA(articles[0].title, articles[0].slug)}
                      className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 font-medium"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Bagikan
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Artikel lainnya */}
            <div className="space-y-3">
              {articles.slice(1).map(article => (
                <div key={article.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3">
                  {article.photo_url ? (
                    <img src={article.photo_url} alt={article.title}
                      className="w-20 h-20 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-green-100 to-teal-100 flex items-center justify-center shrink-0">
                      <span className="text-2xl">📰</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full capitalize">
                        {article.category}
                      </span>
                      {article.source === 'balapor' && (
                        <span className="text-xs text-orange-500">⚡ Laporan</span>
                      )}
                    </div>
                    <Link href={`/news/${article.slug}`}>
                      <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 hover:text-green-700 transition-colors">
                        {article.title}
                      </p>
                    </Link>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-gray-400">
                        {new Date(article.published_at).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short'
                        })}
                      </span>
                      <button
                        onClick={() => shareToWA(article.title, article.slug)}
                        className="text-xs text-green-600 hover:text-green-700 font-medium"
                      >
                        Bagikan →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load more */}
            {hasNext && (
              <div className="text-center mt-6">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-3 w-3 border-b border-gray-500" />
                      Memuat...
                    </span>
                  ) : 'Muat lebih banyak'}
                </button>
              </div>
            )}

            {!hasNext && articles.length > 0 && (
              <p className="text-center text-xs text-gray-400 mt-6">
                Sudah menampilkan semua {totalArticles} artikel
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function NewsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
    </div>}>
      <NewsContent />
    </Suspense>
  )
}
