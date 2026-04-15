'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://teraloka.com'

interface Article {
  id: string; title: string; slug: string; excerpt: string
  category: string; photo_url?: string; source: string; published_at: string
}
interface Campaign {
  id: string; title: string; slug: string; description: string
  target_amount: number; current_amount: number; category: string
  photo_url?: string; deadline?: string; organizer?: { name: string }
}
interface Stats {
  articles: number; reports: number; campaigns: number; users: number
}

function shareToWA(title: string, slug: string) {
  const url = `${APP_URL}/news/${slug}`
  const text = encodeURIComponent(`📰 ${title}\n\nBaca di TeraLoka:\n${url}`)
  window.open(`https://wa.me/?text=${text}`, '_blank')
}

export default function HomePage() {
  const { user } = useAuth()
  const [articles, setArticles] = useState<Article[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/content/articles?limit=5`).then(r => r.json()),
      fetch(`${API_URL}/funding/campaigns?status=active&limit=3`).then(r => r.json())
    ]).then(([articlesData, campaignsData]) => {
      setArticles(articlesData.articles || [])
      setCampaigns(campaignsData.campaigns || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function formatRp(n: number) { return `Rp ${n.toLocaleString('id-ID')}` }
  function progress(current: number, target: number) {
    return target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/">
            <span className="text-xl font-black">
              <span className="text-green-700">Tera</span>
              <span className="text-teal-500">Loka</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                {(user.role === 'super_admin' || user.role?.startsWith('admin_')) && (
                  <Link href="/admin" className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1.5 rounded-lg font-medium">
                    Admin
                  </Link>
                )}
                <Link href="/profile" className="text-xs bg-green-600 text-white px-2.5 py-1.5 rounded-lg font-medium">
                  {user.name?.split(' ')[0] || 'Profil'}
                </Link>
              </div>
            ) : (
              <Link href="/login" className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium">
                Masuk
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-br from-green-700 via-green-600 to-teal-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-black mb-2">
              Super App<br />Maluku Utara
            </h1>
            <p className="text-green-100 text-sm max-w-xs mx-auto leading-relaxed">
              Berita lokal, laporan warga, donasi, kos, properti, kendaraan — semua dalam satu platform
            </p>
          </div>

          {/* Quick access */}
          <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
            {[
              { href: '/news', icon: '📰', label: 'BAKABAR', color: 'from-green-800/60' },
              { href: '/reports', icon: '📢', label: 'BALAPOR', color: 'from-orange-700/60' },
              { href: '/fundraising', icon: '💚', label: 'BASUMBANG', color: 'from-teal-800/60' },
              { href: '/kos', icon: '🏠', label: 'BAKOS', color: 'from-blue-800/60' },
              { href: '/my-reports', icon: '📋', label: 'Laporan Saya', color: 'from-purple-800/60' },
              { href: '/speed', icon: '⛵', label: 'BAPASIAR', color: 'from-cyan-800/60' }
            ].map(item => (
              <Link key={item.href} href={item.href}>
                <div className={`bg-gradient-to-b ${item.color} to-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-3 text-center hover:border-white/40 transition-all`}>
                  <div className="text-2xl mb-1">{item.icon}</div>
                  <p className="text-xs font-semibold text-white">{item.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">

        {/* BAKABAR — Berita Terbaru */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">📰 BAKABAR</h2>
              <p className="text-xs text-gray-400">Berita & laporan warga terbaru</p>
            </div>
            <Link href="/news" className="text-sm text-green-600 font-medium hover:underline">
              Lihat semua →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-20" />
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-gray-400 text-sm">
              Belum ada artikel
            </div>
          ) : (
            <div className="space-y-3">
              {/* Featured */}
              {articles[0] && (
                <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                  {articles[0].photo_url && (
                    <img src={articles[0].photo_url} alt={articles[0].title}
                      className="w-full h-40 object-cover" />
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full capitalize">
                        {articles[0].category}
                      </span>
                      {articles[0].source === 'balapor' && (
                        <span className="text-xs text-orange-500">⚡ Laporan Warga</span>
                      )}
                    </div>
                    <Link href={`/news/${articles[0].slug}`}>
                      <h3 className="font-bold text-gray-900 leading-snug hover:text-green-700 transition-colors">
                        {articles[0].title}
                      </h3>
                    </Link>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{articles[0].excerpt}</p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs text-gray-400">
                        {new Date(articles[0].published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                      <button
                        onClick={() => shareToWA(articles[0].title, articles[0].slug)}
                        className="text-xs text-green-600 font-medium flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        Bagikan
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* List artikel lainnya */}
              {articles.slice(1).map(article => (
                <div key={article.id} className="bg-white rounded-2xl border border-gray-100 p-3 flex gap-3 items-start">
                  {article.photo_url ? (
                    <img src={article.photo_url} alt={article.title}
                      className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                      <span className="text-xl">📰</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <Link href={`/news/${article.slug}`}>
                      <p className="font-semibold text-sm text-gray-900 line-clamp-2 hover:text-green-700">
                        {article.title}
                      </p>
                    </Link>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-400 capitalize">{article.category}</span>
                      <button onClick={() => shareToWA(article.title, article.slug)}
                        className="text-xs text-green-600">Bagikan</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* BASUMBANG — Kampanye Aktif */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">💚 BASUMBANG</h2>
              <p className="text-xs text-gray-400">Kampanye donasi yang sedang berjalan</p>
            </div>
            <Link href="/fundraising" className="text-sm text-green-600 font-medium hover:underline">
              Lihat semua →
            </Link>
          </div>

          {loading ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-2xl animate-pulse h-44 w-64 shrink-0" />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-gray-400 text-sm">
              Belum ada kampanye aktif
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {campaigns.map(campaign => {
                const prog = progress(campaign.current_amount, campaign.target_amount)
                return (
                  <Link key={campaign.id} href={`/fundraising/${campaign.slug}`}>
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 w-64 shrink-0">
                      {campaign.photo_url ? (
                        <img src={campaign.photo_url} alt={campaign.title}
                          className="w-full h-28 rounded-xl object-cover mb-3" />
                      ) : (
                        <div className="w-full h-28 rounded-xl bg-green-50 flex items-center justify-center mb-3">
                          <span className="text-3xl">💚</span>
                        </div>
                      )}
                      <p className="font-semibold text-sm text-gray-900 line-clamp-2 mb-2">{campaign.title}</p>
                      <div className="h-1.5 bg-gray-100 rounded-full mb-1">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${prog}%` }} />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-green-700 font-medium">{formatRp(campaign.current_amount)}</span>
                        <span className="text-gray-400">{prog}%</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* CTA BALAPOR */}
        <section>
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-5 text-white">
            <h2 className="font-bold text-lg mb-1">📢 Ada masalah di sekitar kamu?</h2>
            <p className="text-sm text-orange-100 mb-4">
              Laporkan via BALAPOR. Identitas kamu terlindungi. Laporan akan diverifikasi dan bisa jadi artikel berita.
            </p>
            <Link href="/reports">
              <button className="bg-white text-orange-600 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-orange-50 transition-colors">
                Buat Laporan →
              </button>
            </Link>
          </div>
        </section>

        {/* Quick links */}
        <section className="grid grid-cols-2 gap-3 pb-6">
          {[
            { href: '/kos', icon: '🏠', title: 'BAKOS', desc: 'Cari kos-kosan' },
            { href: '/speed', icon: '⛵', title: 'BAPASIAR', desc: 'Jadwal kapal & speedboat' },
            { href: '/my-reports', icon: '📋', title: 'Laporan Saya', desc: 'Status laporan kamu' },
            { href: '/owner/listing/new', icon: '➕', title: 'Pasang Iklan', desc: 'Daftarkan bisnis kamu' }
          ].map(item => (
            <Link key={item.href} href={item.href}>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-green-200 transition-colors">
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="font-semibold text-sm text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </div>
  )
}
