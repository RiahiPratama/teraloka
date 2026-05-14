'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TrendingUp, Siren, Clock } from 'lucide-react';
import WANewsletterWidget from '@/components/WANewsletterWidget';
import SharePopover from '@/components/shared/SharePopover';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://teraloka.com';

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

// ─────────────────────────────────────────────────────────────────
// Phase E (14 Mei 2026): Helpers shareWA/shareFB/trackShare + komponen
// ShareButtons DIHAPUS, diganti SharePopover universal (5 platform +
// auto-flip + dedup backend + brand auto-theme).
// ─────────────────────────────────────────────────────────────────

// ── Ads Components ────────────────────────────────────────────────

interface Ad {
  id: string;
  title: string;
  body?: string;
  image_url?: string;
  link_url: string;
}

async function fetchActiveAd(position: string): Promise<Ad | null> {
  try {
    const res = await fetch(`${API}/public/ads?position=${position}`);
    const data = await res.json();
    if (!data.success) return null;
    const ads = data.data ?? [];
    if (!ads.length) return null;
    return ads[Math.floor(Math.random() * ads.length)];
  } catch {
    return null;
  }
}

function trackAdClick(adId: string) {
  fetch(`${API}/public/ads/${adId}/click`, { method: 'POST' }).catch(() => {});
}

function AdBanner() {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchActiveAd('banner').then(a => { setAd(a); setLoaded(true); });
  }, []);

  if (!loaded || !ad) {
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

  return (
    <a href={ad.link_url} target="_blank" rel="noopener noreferrer sponsored"
      onClick={() => trackAdClick(ad.id)}
      className="block w-full rounded-xl my-3 overflow-hidden relative"
      style={{ maxHeight: 100 }}>
      {ad.image_url ? (
        <img src={ad.image_url} alt={ad.title}
          className="w-full h-auto object-cover hover:opacity-95 transition-opacity" />
      ) : (
        <div className="flex items-center p-4" style={{ background: 'linear-gradient(to right, #1B6B4A, #0891B2)' }}>
          <div className="flex-1">
            <p className="text-white font-bold text-sm">{ad.title}</p>
            {ad.body && <p className="text-white/80 text-xs mt-0.5">{ad.body}</p>}
          </div>
        </div>
      )}
      <span className="absolute top-1 right-1 text-[9px] font-bold text-white bg-black/40 px-1.5 py-0.5 rounded uppercase tracking-wider">
        Iklan
      </span>
    </a>
  );
}

function AdNative() {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchActiveAd('native').then(a => { setAd(a); setLoaded(true); });
  }, []);

  if (!loaded || !ad) {
    return (
      <div className="flex items-center gap-3 rounded-xl p-4 my-3"
        style={{ background: 'linear-gradient(to right, #F0FDF4, #F9FAFB)', border: '1.5px dashed #BBF7D0' }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: '#D1FAE5' }}>📢</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Iklan Mitra</p>
          <p className="text-sm font-semibold text-gray-700 mt-0.5">Pasang iklan di BAKABAR TeraLoka</p>
          <p className="text-xs text-gray-400">Jangkau warga Maluku Utara setiap hari</p>
        </div>
        <a href="mailto:ads@teraloka.com" className="shrink-0 text-xs font-bold text-white px-4 py-2 rounded-full" style={{ background: '#003526' }}>Pasang</a>
      </div>
    );
  }

  return (
    <a href={ad.link_url} target="_blank" rel="noopener noreferrer sponsored"
      onClick={() => trackAdClick(ad.id)}
      className="flex items-center gap-3 rounded-xl p-4 my-3 relative hover:opacity-95 transition-opacity"
      style={{ background: 'linear-gradient(to right, #F0FDF4, #F9FAFB)', border: '1px solid #D1FAE5' }}>
      {ad.image_url ? (
        <img src={ad.image_url} alt={ad.title}
          className="w-12 h-12 rounded-xl object-cover shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: '#D1FAE5' }}>📢</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Iklan</p>
        <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{ad.title}</p>
        {ad.body && <p className="text-xs text-gray-500 truncate">{ad.body}</p>}
      </div>
      <span className="shrink-0 text-xs font-bold text-white px-4 py-2 rounded-full" style={{ background: '#003526' }}>Lihat</span>
    </a>
  );
}

function AdSidebar({ height = 260, label = '300 × 250' }: { height?: number; label?: string }) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchActiveAd('sidebar').then(a => { setAd(a); setLoaded(true); });
  }, []);

  if (!loaded || !ad) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl"
        style={{ height, background: 'linear-gradient(to bottom, #F0FDF4, #F9FAFB)', border: '1.5px dashed #BBF7D0' }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: '#D1FAE5' }}>📢</div>
        <div className="text-center px-4">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Iklan Mitra</p>
          <p className="text-xs text-gray-400 mt-0.5">{label}</p>
        </div>
        <a href="mailto:ads@teraloka.com" className="text-xs font-bold text-white px-4 py-1.5 rounded-full" style={{ background: '#003526' }}>Pasang Iklan →</a>
      </div>
    );
  }

  return (
    <a href={ad.link_url} target="_blank" rel="noopener noreferrer sponsored"
      onClick={() => trackAdClick(ad.id)}
      className="block rounded-xl overflow-hidden relative hover:opacity-95 transition-opacity"
      style={{ height }}>
      {ad.image_url ? (
        <img src={ad.image_url} alt={ad.title}
          className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-4"
          style={{ background: 'linear-gradient(to bottom, #1B6B4A, #0891B2)' }}>
          <p className="text-white font-bold text-sm text-center">{ad.title}</p>
          {ad.body && <p className="text-white/80 text-xs mt-1 text-center">{ad.body}</p>}
        </div>
      )}
      <span className="absolute top-1.5 right-1.5 text-[9px] font-bold text-white bg-black/40 px-1.5 py-0.5 rounded uppercase tracking-wider">
        Iklan
      </span>
    </a>
  );
}

// ── BMKG Widget ────────────────────────────────────────────────────

function BMKGWidget({ data }: { data: any }) {
  if (!data) return (
    <div className="rounded-xl px-4 py-3 mb-3 flex items-center justify-between"
      style={{ background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
      <div className="flex items-center gap-2">
        <span className="text-lg">🌤️</span>
        <div>
          <p className="text-xs font-bold text-[#0369A1]">Cuaca Perairan Ternate</p>
          <p className="text-xs text-gray-400">Data tidak tersedia</p>
        </div>
      </div>
      <a href="https://www.bmkg.go.id/cuaca/maritim.bmkg" target="_blank" rel="noopener noreferrer"
        className="text-xs font-bold text-[#0369A1] hover:underline">Lihat BMKG →</a>
    </div>
  );

  const statusColor = { aman: '#059669', waspada: '#D97706', berbahaya: '#DC2626' }[data.status as string] || '#059669';
  const statusBg = { aman: '#F0FDF4', waspada: '#FFFBEB', berbahaya: '#FEF2F2' }[data.status as string] || '#F0FDF4';
  const statusBorder = { aman: '#BBF7D0', waspada: '#FDE68A', berbahaya: '#FECACA' }[data.status as string] || '#BBF7D0';

  return (
    <div className="rounded-xl px-4 py-3 mb-3" style={{ background: statusBg, border: `1px solid ${statusBorder}` }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-2xl shrink-0">{data.cuaca?.icon || '🌤️'}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-bold" style={{ color: statusColor }}>
                Cuaca Perairan Ternate
              </p>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: statusColor, fontSize: 10 }}>
                {data.status_label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-xs text-gray-600">{data.cuaca?.label}</span>
              {data.suhu && <span className="text-xs text-gray-500">🌡️ {data.suhu}°C</span>}
              {data.angin?.kecepatan && (
                <span className="text-xs text-gray-500">💨 {data.angin.kecepatan} km/j {data.angin.arah || ''}</span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-gray-400">Sumber: BMKG</p>
          <a href="https://www.bmkg.go.id/cuaca/maritim.bmkg" target="_blank" rel="noopener noreferrer"
            className="text-[10px] font-bold hover:underline" style={{ color: statusColor }}>
            Detail →
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Live BALAPOR Feed (body widget) ───────────────────────────────
// REFACTOR 14 Mei 2026 sore (CEO directive):
// Card identity = BALAPOR (coral palette tint, kept as legacy info card style).
// TEKS / LABELS pakai BAKABAR purple (host page identity).
//   - Title heading + Siren icon: #5B21B6 (bakabar-strong)
//   - "Lihat semua →" link: #5B21B6 (bakabar-strong)
//   - Time stamps: #5B21B6 (bakabar-strong)
//   - Report titles: dark gray (readability content priority)
// Button "+ Laporkan Kejadian" tetap TeraLoka teal #003526 (Pattern EEE compliant).

const CATEGORY_ICON: Record<string, string> = {
  infrastruktur: '🏗️', keamanan: '🚨', lingkungan: '🌿',
  sosial: '👥', kesehatan: '🏥', pendidikan: '📚',
  transportasi: '🚗', ekonomi: '💰', default: '📋',
};

function LiveBALAPORFeed({ reports }: { reports: any[] }) {
  if (!reports.length) return null;
  return (
    <div className="rounded-2xl p-4 my-4" style={{ background: '#FFF7F5', border: '0.5px solid #F5C4B3', borderLeft: '3px solid #D85A30' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold flex items-center gap-1.5" style={{ color: '#5B21B6' }}>
          <Siren size={14} strokeWidth={2.2} />
          Warga lagi melapor
        </p>
        <Link href="/balapor" className="text-xs font-semibold hover:underline" style={{ color: '#5B21B6' }}>
          Lihat semua →
        </Link>
      </div>
      <div className="space-y-2">
        {reports.map((r: any) => (
          <div key={r.id} className="flex items-start gap-2.5">
            <span className="text-base shrink-0 mt-0.5">
              {CATEGORY_ICON[r.category] || CATEGORY_ICON.default}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-snug line-clamp-2" style={{ color: '#1F2937' }}>{r.title}</p>
              <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: '#5B21B6' }}>
                <Clock size={9} strokeWidth={2.2} />
                {timeAgo(r.created_at)}
              </p>
            </div>
          </div>
        ))}
      </div>
      <Link href="/balapor/buat-laporan"
        className="block mt-3 text-center text-xs font-bold py-2.5 rounded-xl hover:opacity-90 transition-opacity"
        style={{ background: '#003526', color: '#fff' }}>
        + Laporkan Kejadian
      </Link>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────

function NewsPageContent() {
  const searchParams = useSearchParams();

  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [recentReports, setRecentReports] = useState<any[]>([]);

  const _navParam      = searchParams.get('nav');
  const _legacyType    = searchParams.get('type');
  const _legacyLoc     = searchParams.get('location');
  const _currentNav    = _navParam
    || (_legacyType && _legacyType !== 'terbaru' ? _legacyType : null)
    || (_legacyLoc && _legacyLoc !== 'all' ? _legacyLoc : null)
    || 'terbaru';
  const _isTypeKind = _currentNav === 'nasional'
    || _currentNav === 'viral'
    || _currentNav === 'terbaru';
  const type     = _isTypeKind ? _currentNav : 'terbaru';
  const location = _isTypeKind ? 'all' : _currentNav;
  const q = searchParams.get('q') || '';
  const topic = searchParams.get('topic') || '';

  useEffect(() => {
    fetch(`${API}/public/reports/recent`).then(r => r.json()).then(d => { if (d.success) setRecentReports(d.data ?? []); }).catch(() => { });
  }, []);

  const fetchArticles = useCallback(async (reset = true) => {
    reset ? setLoading(true) : setLoadingMore(true);
    try {
      const p = new URLSearchParams({ limit: '12', page: String(reset ? 1 : page) });
      if (type !== 'terbaru') p.set('type', type);
      if (location !== 'all') p.set('location', location);
      if (q) p.set('q', q);
      if (topic) p.set('category', topic);

      const res = await fetch(`${API}/content/articles?${p}`);
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
  }, [type, location, q, topic, page]);

  useEffect(() => { setPage(1); fetchArticles(true); }, [type, location, q, topic]);

  const featured = articles[0];
  const rest = articles.slice(1);
  const featuredExcerpt = featured ? parseExcerpt(featured.excerpt, featured.body) : '';
  const breaking = articles.filter(a => a.is_breaking);

  const pageTitle = (() => {
    if (type === 'viral') return '🔥 Viral di Maluku Utara';
    if (type === 'nasional') return '🗞️ Berita Nasional';
    return null;
  })();

  return (
    <div className="min-h-screen bg-white">

      {breaking.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pt-3">
          <div className="flex items-center gap-3 bg-[#003526] text-white rounded-xl px-4 py-2.5">
            <span className="text-xs font-black uppercase shrink-0 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />BREAKING
            </span>
            <Link href={`/bakabar/${breaking[0]?.slug}`} className="text-xs font-semibold flex-1 truncate hover:underline">
              {breaking[0]?.title}
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4">

        <div className="pt-2">
          <AdBanner />
        </div>

        {pageTitle && (
          <div className="mb-4">
            <h2 className="text-lg font-black text-gray-900">{pageTitle}</h2>
          </div>
        )}

        {loading && (
          <div className="space-y-4 py-4">
            <div className="animate-pulse h-56 bg-gray-100 rounded-2xl" />
            {[1, 2, 3].map(i => (
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

        {!loading && articles.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-5xl mb-3">{type === 'viral' ? '🔥' : type === 'nasional' ? '🗞️' : '📰'}</p>
            <p className="font-bold text-gray-700 text-lg">
              {type === 'viral' ? 'Belum ada berita viral' :
                type === 'nasional' ? 'Belum ada berita nasional' :
                  location !== 'all' ? 'Belum ada berita dari wilayah ini' :
                    q ? `Tidak ada hasil untuk "${q}"` : 'Belum ada artikel'}
            </p>
            {type === 'viral' && (
              <p className="text-sm text-gray-400 mt-2">Artikel dengan banyak dibaca & dibagikan akan muncul di sini</p>
            )}
          </div>
        )}

        {!loading && articles.length > 0 && (
          <div className="lg:grid lg:grid-cols-12 lg:gap-6">

            <div className="lg:col-span-8">

              {featured && (
                <Link href={featured.source === 'rss' ? featured.external_url || `/bakabar/${featured.slug}` : `/bakabar/${featured.slug}`}
                  target={featured.source === 'rss' ? '_blank' : undefined}
                  className="group block mb-6">
                  <div className="relative overflow-hidden rounded-2xl mb-3">
                    {featured.cover_image_url ? (
                      <img src={featured.cover_image_url} alt={featured.title}
                        className="w-full aspect-[16/10] object-cover object-center group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full aspect-[16/10] bg-gradient-to-br from-[#003526] to-[#0891B2] flex items-center justify-center">
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
                        : featured.author?.name || 'Redaksi BAKABAR'
                      } · {timeAgo(featured.published_at)}
                    </span>
                    {featured.source !== 'rss' && (
                      <SharePopover
                        entity_id={featured.id}
                        entity_type="article"
                        service_domain="bakabar"
                        title={featured.title}
                        url={`${APP_URL}/bakabar/${featured.slug}`}
                      />
                    )}
                    {featured.source === 'rss' && (
                      <span className="text-xs text-gray-400 italic">Baca di sumber asli →</span>
                    )}
                  </div>
                </Link>
              )}

              <div className="h-px bg-gray-100 mb-4" />

              <div className="space-y-0">
                {rest.map((article, idx) => {
                  const excerpt = parseExcerpt(article.excerpt, article.body);
                  const isRSS = article.source === 'rss';
                  const href = isRSS ? (article.external_url || `/bakabar/${article.slug}`) : `/bakabar/${article.slug}`;

                  return (
                    <div key={article.id}>
                      {idx > 0 && idx % 4 === 0 && <AdNative />}

                      {idx === 4 && recentReports.length > 0 && (
                        <LiveBALAPORFeed reports={recentReports} />
                      )}

                      {idx === 8 && (
                        <div className="my-4">
                          <WANewsletterWidget />
                        </div>
                      )}

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
                            {article.is_viral && <span className="text-xs font-bold text-orange-500">🔥</span>}
                            {article.category && <span className="text-xs font-bold text-[#003526] uppercase tracking-wide">{article.category}</span>}
                            {isRSS && <span className="text-xs text-gray-400">🗞️ Nasional</span>}
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
                                <SharePopover
                                  entity_id={article.id}
                                  entity_type="article"
                                  service_domain="bakabar"
                                  title={article.title}
                                  url={`${APP_URL}/bakabar/${article.slug}`}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>

              {rest.length < 8 && (
                <div className="mt-4">
                  <WANewsletterWidget />
                </div>
              )}

              {hasMore && (
                <button onClick={() => fetchArticles(false)} disabled={loadingMore}
                  className="w-full mt-6 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                  {loadingMore ? 'Memuat...' : 'Muat lebih banyak'}
                </button>
              )}
            </div>

            <div className="hidden lg:block lg:col-span-4">
              <div className="sticky top-[108px] space-y-5">
                <AdSidebar height={260} label="300 × 250" />

                {/* ── Card "Terpopuler" ─────────────────────────────
                    REFACTOR 14 Mei 2026 sore (CEO directive):
                    Full BAKABAR purple palette (was blue palette).
                    Source-of-truth: globals.css line 87-89.
                      bg: #FAF5FF (bakabar-muted)
                      border: light purple
                      borderLeft: #8B5CF6 (bakabar primary)
                      title text: #5B21B6 (bakabar-strong)
                      number: #8B5CF6
                      article title text: dark gray (readability)
                    ─────────────────────────────────────────────── */}
                <div className="rounded-2xl p-4" style={{ background: '#FAF5FF', border: '0.5px solid #DDD6FE', borderLeft: '3px solid #8B5CF6' }}>
                  <p className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: '#5B21B6' }}>
                    <TrendingUp size={13} strokeWidth={2.4} />
                    Terpopuler
                  </p>
                  {articles.slice(0, 5).map((a, i) => (
                    <Link key={a.id} href={`/bakabar/${a.slug}`}
                      className="flex items-start gap-2.5 py-2.5 last:border-0 group"
                      style={{ borderBottom: '0.5px solid #EDE9FE' }}>
                      <span className="text-2xl font-black leading-none w-6 shrink-0" style={{ color: '#8B5CF6' }}>{i + 1}</span>
                      <p className="text-xs font-semibold leading-snug line-clamp-3 group-hover:underline" style={{ color: '#1F2937' }}>{a.title}</p>
                    </Link>
                  ))}
                </div>

                {/* ── BALAPOR CTA sidebar ─────────────────────────
                    REFACTOR 14 Mei 2026 sore (CEO directive):
                    BALAPOR brand canonical = #DC2626 RED BERANI.
                    Pattern EEE: Card TeraLoka teal → Button BALAPOR red.
                    Button bg #D85A30 coral (legacy) → #DC2626 (canonical).
                    ───────────────────────────────────────────── */}
                <div className="bg-[#003526] rounded-2xl p-5 text-center">
                  <p className="text-white font-bold text-sm mb-1">Ada berita di sekitarmu?</p>
                  <p className="text-xs mb-3" style={{ color: '#95d3ba' }}>Laporkan via BALAPOR.</p>
                  <Link href="/balapor/buat-laporan"
                    className="block text-center text-xs font-black px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
                    style={{ background: '#DC2626', color: '#fff' }}>
                    Lapor Sekarang →
                  </Link>
                </div>

                {/* ── Card "Laporan Terbaru" (info card, no button) ──
                    Full BALAPOR identity (coral palette tint).
                    KEEP existing (CEO confirmed: "pakai BALAPOR").
                    ─────────────────────────────────────────────── */}
                {recentReports.length > 0 && (
                  <div className="rounded-2xl p-4" style={{ background: '#FFF7F5', border: '0.5px solid #F5C4B3', borderLeft: '3px solid #D85A30' }}>
                    <p className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: '#993C1D' }}>
                      <Siren size={13} strokeWidth={2.4} />
                      Laporan Terbaru
                    </p>
                    {recentReports.slice(0, 3).map((r: any) => (
                      <div key={r.id} className="flex items-start gap-2 py-2 last:border-0" style={{ borderBottom: '0.5px solid #F5C4B3' }}>
                        <span className="text-sm shrink-0">{CATEGORY_ICON[r.category] || '📋'}</span>
                        <div>
                          <p className="text-xs font-semibold leading-snug line-clamp-2" style={{ color: '#4A1B0C' }}>{r.title}</p>
                          <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: '#993C1D' }}>
                            <Clock size={9} strokeWidth={2.2} />
                            {timeAgo(r.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <AdSidebar height={210} label="300 × 200" />
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
