import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import AdSidebarSlug from '@/components/public/ads/AdSidebarSlug';
// SESI 7 (22 Mei 2026): Render markdown body + cover image
import { renderMarkdown } from '@/lib/ads/markdown';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

type Props = { params: Promise<{ slug: string }> };

interface Advertorial {
  id: string;
  title: string;
  body: string;
  image_url: string | null;                  // SESI 7: cover image
  cover_image_caption: string | null;        // SESI 7: cover caption
  link_url: string;
  advertiser_name: string;
  advertiser_type: 'umum' | 'politisi' | 'pemerintah' | 'komersial';
  advertiser_logo_url: string | null;
  disclaimer_text: string | null;
  slug: string;
  ad_format: 'text';
  status: string;
  starts_at: string;
  ends_at: string;
  view_count: number;
  click_count: number;
  impression_count: number;
}

async function getAdvertorial(slug: string): Promise<Advertorial | null> {
  try {
    // cache: no-store → selalu fresh fetch supaya view_count akurat
    const res = await fetch(`${API}/public/sponsored/${slug}`, { cache: 'no-store' });
    const data = await res.json();
    if (!data.success) return null;
    return data.data;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// SEO — dynamic noindex sesuai status iklan
// ─────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ad = await getAdvertorial(slug);

  if (!ad) {
    return {
      title: 'Konten tidak ditemukan',
      robots: { index: false, follow: false },
    };
  }

  // Q6: dynamic noindex — active = indexed, lainnya = noindex
  const shouldIndex = ad.status === 'active';

  return {
    title: `${ad.title} | Konten Mitra BAKABAR TeraLoka`,
    description: ad.body.slice(0, 160),
    openGraph: {
      title: ad.title,
      description: ad.body.slice(0, 160),
      type: 'article',
      ...(ad.advertiser_logo_url && { images: [ad.advertiser_logo_url] }),
    },
    robots: {
      index:  shouldIndex,
      follow: shouldIndex,
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// SESI 7 (22 Mei 2026): Body rendering pakai renderMarkdown (BAKABAR pattern)
// Support: # H1-H3, **bold**, *italic*, > quote, - list, [link], ![img]
// ─────────────────────────────────────────────────────────────────
// renderBodyAsParagraphs() removed — replaced dengan renderMarkdown dari @/lib/markdown

// ─────────────────────────────────────────────────────────────────
// Helper — label advertiser type
// ─────────────────────────────────────────────────────────────────
const ADVERTISER_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pemerintah: { label: 'Pemerintah',        color: '#1e3a8a', bg: '#DBEAFE', border: '#93C5FD' },
  politisi:   { label: 'Kampanye Politik',  color: '#9f1239', bg: '#FCE7F3', border: '#F9A8D4' },
  komersial:  { label: 'Mitra Bisnis',      color: '#78350F', bg: '#FEF3C7', border: '#FCD34D' },
  umum:       { label: 'Konten Mitra',      color: '#065F46', bg: '#D1FAE5', border: '#6EE7B7' },
};

// ═══════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════
export default async function SponsoredPage({ params }: Props) {
  const { slug } = await params;
  const ad = await getAdvertorial(slug);
  if (!ad) notFound();

  const typeConfig = ADVERTISER_TYPE_CONFIG[ad.advertiser_type] || ADVERTISER_TYPE_CONFIG.umum;
  const bodyHtml = renderMarkdown(ad.body);

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600&display=swap');
        .sponsored-body {
          font-family: 'Lora', Georgia, serif;
          font-size: 17px;
          line-height: 1.85;
          color: #1a1a1a;
        }
        .sponsored-body p {
          margin-bottom: 1.3em;
        }
        .sponsored-body h1 {
          font-size: 1.7em;
          font-weight: 700;
          line-height: 1.3;
          margin: 1.5em 0 0.6em;
          color: #111827;
        }
        .sponsored-body h2 {
          font-size: 1.4em;
          font-weight: 700;
          line-height: 1.35;
          margin: 1.4em 0 0.5em;
          color: #111827;
        }
        .sponsored-body h3 {
          font-size: 1.2em;
          font-weight: 600;
          line-height: 1.4;
          margin: 1.3em 0 0.4em;
          color: #1f2937;
        }
        .sponsored-body ul {
          margin: 0.5em 0 1.3em 1.5em;
          list-style: disc;
        }
        .sponsored-body ul li {
          margin-bottom: 0.4em;
        }
        .sponsored-body blockquote {
          margin: 1.5em 0;
          padding: 0.8em 1.2em;
          border-left: 4px solid #1B6B4A;
          background: rgba(27, 107, 74, 0.04);
          font-style: italic;
          color: #4B5563;
        }
        .sponsored-body strong {
          font-weight: 700;
          color: #111827;
        }
        .sponsored-body a {
          color: #1B6B4A;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .sponsored-body .bk-fig {
          margin: 1.5em 0;
        }
        .sponsored-body .bk-fig img,
        .sponsored-body .bk-inline {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          display: block;
          margin: 0 auto;
        }
        .sponsored-body .bk-fig figcaption {
          margin-top: 0.6em;
          text-align: center;
          font-size: 0.85em;
          color: #6B7280;
          font-style: italic;
        }
      `}</style>

      <div className="max-w-4xl mx-auto px-4">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">

          {/* ── Main content ── */}
          <article className="lg:col-span-8 pt-6 pb-16">

            {/* BANNER PROMINENT — Konten Mitra */}
            <div className="mb-6 rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: typeConfig.bg, border: `1.5px solid ${typeConfig.border}` }}>
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: `${typeConfig.color}22` }}>
                <span style={{ color: typeConfig.color, fontSize: 16, fontWeight: 900 }}>!</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: typeConfig.color }}>
                  {typeConfig.label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: typeConfig.color, opacity: 0.85 }}>
                  Konten ini adalah iklan berbayar. BAKABAR tidak terlibat dalam penulisan.
                </p>
              </div>
            </div>

            {/* Header — advertiser info */}
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-100">
              {ad.advertiser_logo_url ? (
                <img src={ad.advertiser_logo_url} alt={ad.advertiser_name}
                  className="w-12 h-12 rounded-full object-cover bg-gray-50 border border-gray-200" />
              ) : (
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0"
                  style={{ background: typeConfig.color }}>
                  {ad.advertiser_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-gray-900">{ad.advertiser_name}</p>
                <p className="text-xs text-gray-500">
                  Konten Mitra · Tayang hingga {new Date(ad.ends_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Title */}
            <h1 style={{ fontFamily: 'Lora, Georgia, serif' }}
              className="text-3xl font-bold text-gray-900 leading-snug tracking-tight mb-6">
              {ad.title}
            </h1>

            {/* SESI 7: Cover image (hero photo) di atas body */}
            {ad.image_url && (
              <figure className="mb-6 -mx-4 md:mx-0">
                <img
                  src={ad.image_url}
                  alt={ad.title}
                  className="w-full h-auto md:rounded-xl"
                  style={{ aspectRatio: '16 / 9', objectFit: 'cover' }}
                />
                {ad.cover_image_caption && (
                  <figcaption className="mt-2 px-4 md:px-0 text-xs italic text-gray-500 leading-relaxed">
                    {ad.cover_image_caption}
                  </figcaption>
                )}
              </figure>
            )}

            {/* Body — SESI 7: Markdown render via renderMarkdown() */}
            <div
              className="sponsored-body"
              dangerouslySetInnerHTML={{
                __html: bodyHtml || '<p class="text-gray-400 italic">Konten tidak tersedia.</p>'
              }}
            />

            {/* CTA Prominent */}
            <div className="mt-10 rounded-2xl p-6 text-center"
              style={{ background: `${typeConfig.color}`, color: '#fff' }}>
              <p className="text-sm opacity-90 mb-3">
                Informasi lebih lanjut dari {ad.advertiser_name}
              </p>
              <a href={ad.link_url} target="_blank" rel="noopener noreferrer sponsored"
                className="inline-block bg-white text-sm font-black px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
                style={{ color: typeConfig.color }}>
                Kunjungi Website →
              </a>
            </div>

            {/* Disclaimer (wajib untuk politisi) */}
            {ad.disclaimer_text && (
              <div className="mt-6 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Disclaimer
                </p>
                <p className="text-xs text-gray-700 leading-relaxed italic">
                  {ad.disclaimer_text}
                </p>
              </div>
            )}

            {/* Footer note — kembali ke BAKABAR */}
            <div className="mt-8 pt-8 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500 mb-3">
                Halaman ini adalah iklan. BAKABAR menerima dan mempublikasikan konten ini sebagai kemitraan.
              </p>
              <Link href="/bakabar" className="text-sm text-[#003526] font-semibold hover:underline">
                ← Baca berita di BAKABAR
              </Link>
            </div>
          </article>

          {/* ── Sidebar ── */}
          <aside className="hidden lg:block lg:col-span-4">
            <div className="sticky top-[108px] py-6 space-y-5">
              <AdSidebarSlug />

              <div className="bg-[#003526] rounded-2xl p-5">
                <p className="text-white font-bold mb-1">Baca berita BAKABAR</p>
                <p className="text-[#95d3ba] text-xs mb-3 leading-relaxed">
                  Kabar terkini dari Maluku Utara, langsung dari sumbernya.
                </p>
                <Link href="/bakabar" className="block text-center bg-white text-[#003526] text-xs font-black px-4 py-2 rounded-xl">
                  Buka BAKABAR →
                </Link>
              </div>

              <AdSidebarSlug />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
