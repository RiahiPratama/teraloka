import Link from 'next/link';
import { getPublishedArticles, getBreakingNews } from '@/lib/engine/content-engine';
import { formatRelative } from '@/utils/format';

export const metadata = {
  title: 'BAKABAR — Berita Maluku Utara | TeraLoka',
  description: 'Portal berita lokal Maluku Utara terpercaya.',
};

const CATEGORIES = [
  { key: 'all', label: 'Semua' },
  { key: 'berita', label: 'Berita' },
  { key: 'politik', label: 'Politik' },
  { key: 'ekonomi', label: 'Ekonomi' },
  { key: 'sosial', label: 'Sosial' },
  { key: 'transportasi', label: 'Transportasi' },
  { key: 'olahraga', label: 'Olahraga' },
];

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const category = params.category !== 'all' ? params.category : undefined;
  const page = Number(params.page) || 1;

  let articles: any[] = [];
  let total = 0;
  let breaking: any[] = [];

  try {
    const result = await getPublishedArticles({ page, limit: 20, category, search: params.q });
    articles = result.data;
    total = result.total;
    breaking = await getBreakingNews();
  } catch {
    // DB belum ada data — tampilkan empty state
  }

  return (
    <div className="px-4 py-4">
      <h1 className="text-xl font-bold text-[#1B6B4A]">BAKABAR</h1>
      <p className="text-sm text-gray-500">Berita Maluku Utara</p>

      {/* Category filter */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.key}
            href={`/news${cat.key !== 'all' ? `?category=${cat.key}` : ''}`}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${
              (params.category || 'all') === cat.key
                ? 'bg-[#1B6B4A] text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {cat.label}
          </Link>
        ))}
      </div>

      {/* Breaking news */}
      {breaking.length > 0 && (
        <div className="mt-4">
          <div className="rounded-xl bg-red-50 p-3">
            <span className="text-xs font-bold text-red-600">🔴 BREAKING</span>
            {breaking.map((item: any) => (
              <Link key={item.id} href={`/news/${item.slug}`} className="mt-1 block">
                <p className="text-sm font-medium">{item.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Article list */}
      <div className="mt-4 space-y-4">
        {articles.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-8 text-center">
            <p className="text-3xl">📰</p>
            <p className="mt-2 text-sm text-gray-500">Belum ada berita.</p>
            <Link href="/reports" className="mt-2 inline-block text-sm text-[#1B6B4A] font-medium">
              Jadi warga pertama yang melapor →
            </Link>
          </div>
        ) : (
          articles.map((article: any) => (
            <Link
              key={article.id}
              href={`/news/${article.slug}`}
              className="flex gap-3 rounded-xl border border-gray-100 p-3 active:bg-gray-50"
            >
              {article.cover_image_url && (
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-200">
                  <img
                    src={article.cover_image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight line-clamp-2">
                  {article.title}
                </p>
                {article.excerpt && (
                  <p className="mt-1 text-xs text-gray-500 line-clamp-2">{article.excerpt}</p>
                )}
                <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400">
                  <span>{article.author?.full_name || 'Redaksi'}</span>
                  <span>·</span>
                  <span>{formatRelative(article.published_at)}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
