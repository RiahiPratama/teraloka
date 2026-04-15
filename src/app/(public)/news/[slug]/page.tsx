'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://teraloka.com'

interface Article {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  category: string
  photo_url?: string
  source: string
  published_at: string
  author?: { name: string }
}

function shareToWA(title: string, slug: string) {
  const url = `${APP_URL}/news/${slug}`
  const text = encodeURIComponent(`📰 ${title}\n\nBaca di TeraLoka:\n${url}`)
  window.open(`https://wa.me/?text=${text}`, '_blank')
}

function copyLink(slug: string) {
  const url = `${APP_URL}/news/${slug}`
  navigator.clipboard.writeText(url).then(() => alert('Link disalin!'))
}

function ArticleDetailContent() {
  const params = useParams()
  const slug = params.slug as string
  const [article, setArticle] = useState<Article | null>(null)
  const [related, setRelated] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (slug) fetchArticle()
  }, [slug])

  async function fetchArticle() {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/content/articles/${slug}`)
      if (!res.ok) { setNotFound(true); return }
      const data = await res.json()
      setArticle(data.article)

      // Fetch related articles dari kategori yang sama
      if (data.article?.category) {
        fetchRelated(data.article.category, data.article.id)
      }
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  async function fetchRelated(category: string, excludeId: string) {
    try {
      const res = await fetch(`${API_URL}/content/articles?category=${category}&limit=4`)
      const data = await res.json()
      const filtered = (data.articles || []).filter((a: Article) => a.id !== excludeId).slice(0, 3)
      setRelated(filtered)
    } catch {}
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-48 bg-gray-200 rounded-2xl" />
          <div className="h-6 bg-gray-200 rounded w-3/4" />
          <div className="h-6 bg-gray-200 rounded w-1/2" />
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="h-4 bg-gray-200 rounded" />)}
          </div>
        </div>
      </div>
    </div>
  )

  if (notFound || !article) return (
    <div className="min-h-screen flex items-center justify-center text-center p-4">
      <div>
        <div className="text-5xl mb-4">📰</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Artikel tidak ditemukan</h2>
        <Link href="/news" className="text-green-600 hover:underline text-sm">← Kembali ke BAKABAR</Link>
      </div>
    </div>
  )

  const articleUrl = `${APP_URL}/news/${article.slug}`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/news" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <p className="text-sm font-medium text-gray-700 line-clamp-1 flex-1">{article.title}</p>
          {/* Share di header */}
          <button
            onClick={() => shareToWA(article.title, article.slug)}
            className="shrink-0 text-green-600"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Artikel utama */}
        <article className="bg-white rounded-2xl overflow-hidden border border-gray-100">
          {/* Foto hero */}
          {article.photo_url && (
            <img src={article.photo_url} alt={article.title}
              className="w-full h-52 object-cover" />
          )}

          <div className="p-5">
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full capitalize">
                {article.category}
              </span>
              {article.source === 'balapor' && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                  ⚡ Laporan Warga
                </span>
              )}
              <span className="text-xs text-gray-400 ml-auto">
                {new Date(article.published_at).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
              </span>
            </div>

            {/* Judul */}
            <h1 className="text-xl font-bold text-gray-900 leading-snug mb-3">
              {article.title}
            </h1>

            {/* Excerpt / lead */}
            {article.excerpt && (
              <p className="text-sm text-gray-600 leading-relaxed font-medium border-l-4 border-green-400 pl-3 mb-4 bg-green-50 py-2 pr-3 rounded-r-lg">
                {article.excerpt}
              </p>
            )}

            {/* Konten artikel */}
            <div
              className="prose prose-sm max-w-none text-gray-800 leading-relaxed
                [&_p]:mb-3 [&_strong]:font-semibold [&_br]:block"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            {/* Author */}
            {article.author?.name && (
              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">
                  {article.author.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-gray-500">Ditulis oleh <strong>{article.author.name}</strong></span>
              </div>
            )}
          </div>
        </article>

        {/* Share section */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3 text-center">
            Bagikan artikel ini
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => shareToWA(article.title, article.slug)}
              className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-green-600 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </button>
            <button
              onClick={() => copyLink(article.slug)}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Salin Link
            </button>
          </div>
        </div>

        {/* CTA BALAPOR — jika artikel dari laporan warga */}
        {article.source === 'balapor' && (
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
            <p className="text-sm font-semibold text-orange-800 mb-1">
              📢 Ada masalah serupa di sekitar kamu?
            </p>
            <p className="text-xs text-orange-700 mb-3">
              Laporkan via BALAPOR. Identitasmu terlindungi dan laporanmu bisa jadi artikel berita.
            </p>
            <Link href="/reports"
              className="inline-block bg-orange-500 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-orange-600 transition-colors">
              Buat Laporan →
            </Link>
          </div>
        )}

        {/* Related articles */}
        {related.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-gray-800 mb-3">
              Artikel Terkait
            </h2>
            <div className="space-y-3">
              {related.map(rel => (
                <Link key={rel.id} href={`/news/${rel.slug}`}>
                  <div className="bg-white rounded-2xl border border-gray-100 p-3 flex gap-3 hover:border-green-200 transition-colors">
                    {rel.photo_url ? (
                      <img src={rel.photo_url} alt={rel.title}
                        className="w-16 h-16 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                        <span className="text-xl">📰</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 line-clamp-2 leading-snug">
                        {rel.title}
                      </p>
                      <span className="text-xs text-gray-400 mt-1 block">
                        {new Date(rel.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-4">
              <Link href={`/news?category=${article.category}`}
                className="text-sm text-green-600 font-medium hover:underline">
                Lihat semua artikel {article.category} →
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default function ArticleDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
    </div>}>
      <ArticleDetailContent />
    </Suspense>
  )
}
