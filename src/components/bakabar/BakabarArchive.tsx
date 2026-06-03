// ════════════════════════════════════════════════════════════════
// BAKABAR — Archive (Server Component) v1.0
// PATH: src/components/bakabar/BakabarArchive.tsx
// ────────────────────────────────────────────────────────────────
// 2 Jun 2026 — Halaman "rak" listing artikel. Dipakai DUA route (twins):
//   • /bakabar/kanal/[slug]    (asal: nasional / daerah / viral)
//   • /bakabar/kategori/[slug] (tema: politik / ekonomi / dst)
//
// Frame ADS = reuse total dari homepage (DCATopLeaderboard + DCASkyscraper,
// keduanya self-fetch by-position, empty→null). Zero kerjaan backend iklan.
// Kartu = mirror gaya RegionSection (Lora serif, accent #8B5CF6, border gray).
// ════════════════════════════════════════════════════════════════

import Link from 'next/link';
import DCASkyscraper from './DCASkyscraper';
import DCATopLeaderboard from './DCATopLeaderboard';
import ArchiveInFeedAd from './ArchiveInFeedAd';
import DCAInlineBanner from './DCAInlineBanner';
import { getCategory } from '@/lib/categories';

export type ArchiveArticle = {
  id:               string;
  title:            string;
  slug:             string;
  excerpt?:         string | null;
  category?:        string | null;
  published_at?:    string | null;
  created_at?:      string | null;
  cover_image_url?: string | null;
  source?:          string | null;
  source_name?:     string | null;
  is_viral?:        boolean;
};

const THUMB_FALLBACK = 'linear-gradient(135deg, #1e3a8a, #0f172a)';

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return d < 7
    ? `${d} hari lalu`
    : new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ArticleCard({ a }: { a: ArchiveArticle }) {
  const cat = getCategory(a.category);
  const meta = timeAgo(a.published_at || a.created_at);
  return (
    <Link
      href={`/bakabar/${a.slug}`}
      className="group flex flex-col rounded-lg overflow-hidden bg-white border border-gray-200 hover:shadow-md transition-shadow"
    >
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16 / 9', background: THUMB_FALLBACK }}>
        {a.cover_image_url && (
          <img
            src={a.cover_image_url}
            alt={a.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        )}
        {cat && (
          <span
            className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-white text-[10px] font-bold uppercase tracking-wide"
            style={{ background: cat.color }}
          >
            {cat.label}
          </span>
        )}
      </div>
      <div className="flex flex-col flex-1 p-3.5">
        <h3
          className="text-[15px] font-bold leading-snug text-gray-900 line-clamp-3 mb-2"
          style={{ fontFamily: "'Lora', Georgia, serif" }}
        >
          {a.title}
        </h3>
        {a.excerpt && <p className="text-[12.5px] text-gray-500 line-clamp-2 mb-2.5">{a.excerpt}</p>}
        <div className="mt-auto flex items-center gap-1.5 text-[11px] text-gray-400">
          <span className="font-semibold text-gray-500">{a.source_name || 'BAKABAR'}</span>
          {meta && (<><span>·</span><span>{meta}</span></>)}
        </div>
      </div>
    </Link>
  );
}

type Props = {
  kicker:   string;            // 'Kanal' | 'Kategori'
  title:    string;            // mis. 'Politik' / 'Berita Ternate'
  articles: ArchiveArticle[];
};

export default function BakabarArchive({ kicker, title, articles }: Props) {
  return (
    <div className="min-h-screen bg-white">
      <style>{`
        .line-clamp-2 { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .line-clamp-3 { display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
      `}</style>

      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex gap-5 items-start justify-center pt-3">

          <DCASkyscraper side="left" />

          <main className="flex-1 min-w-0" style={{ maxWidth: 1000 }}>
            <DCATopLeaderboard />

            {/* Header rak */}
            <header className="my-6 flex items-stretch gap-3">
              <div className="w-1 rounded-sm shrink-0" style={{ background: '#8B5CF6' }} />
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#8B5CF6' }}>
                  {kicker}
                </div>
                <h1
                  className="font-extrabold tracking-[-0.6px] text-gray-900"
                  style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 30 }}
                >
                  {title}
                </h1>
                <p className="text-[13px] text-gray-500 mt-0.5">{articles.length} artikel</p>
              </div>
            </header>

            {articles.length === 0 ? (
              <div className="py-20 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-gray-500 text-sm">Belum ada artikel di {kicker.toLowerCase()} ini.</p>
                <Link
                  href="/bakabar"
                  className="inline-block mt-4 text-[13px] font-bold hover:underline"
                  style={{ color: '#378ADD' }}
                >
                  ← Kembali ke BAKABAR
                </Link>
              </div>
            ) : (
              <div
                className="grid gap-5 pb-12"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
              >
                {(() => {
                  let nativeSlot = 0;
                  return articles.flatMap((a, i) => {
                    const out = [<ArticleCard key={a.id} a={a} />];
                    const n = i + 1; // berapa artikel sudah tampil
                    if (n === 12) {
                      // Band melebar (inline_banner) sekali di tengah, full 3 kolom
                      out.push(
                        <div key="inline-band" style={{ gridColumn: '1 / -1' }}>
                          <DCAInlineBanner />
                        </div>,
                      );
                    } else if (n % 6 === 0) {
                      // Kartu native (kanal_infeed) tiap 6 kartu, 1 sel
                      out.push(<ArchiveInFeedAd key={`infeed-${n}`} slot={nativeSlot++} />);
                    }
                    return out;
                  });
                })()}
              </div>
            )}
          </main>

          <DCASkyscraper side="right" />

        </div>
      </div>
    </div>
  );
}
