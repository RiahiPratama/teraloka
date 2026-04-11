import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getArticleBySlug } from '@/lib/engine/content-engine';
import { formatDate } from '@/utils/format';
import type { Metadata } from 'next';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: 'Artikel tidak ditemukan' };
  return {
    title: `${article.title} | BAKABAR`,
    description: article.excerpt || article.title,
    openGraph: {
      title: article.title,
      description: article.excerpt || article.title,
      images: article.cover_image_url ? [article.cover_image_url] : [],
      type: 'article',
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  return (
    <article className="px-4 py-4">
      <Link href="/news" className="text-sm text-[#1B6B4A]">← Kembali</Link>

      {article.is_breaking && (
        <span className="mt-2 inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
          🔴 BREAKING
        </span>
      )}

      <h1 className="mt-2 text-xl font-bold leading-tight">{article.title}</h1>

      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
        <span>{article.author?.full_name || 'Redaksi'}</span>
        <span>·</span>
        <span>{formatDate(article.published_at)}</span>
        <span>·</span>
        <span>{article.view_count} views</span>
      </div>

      {article.cover_image_url && (
        <div className="mt-4 overflow-hidden rounded-xl">
          <img src={article.cover_image_url} alt="" className="w-full" />
        </div>
      )}

      <div
        className="prose prose-sm mt-4 max-w-none"
        dangerouslySetInnerHTML={{ __html: article.body }}
      />

      {article.source === 'balapor' && (
        <div className="mt-6 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          📢 Artikel ini berasal dari laporan warga via BALAPOR
        </div>
      )}

      {article.tags && article.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {article.tags.map((tag: string) => (
            <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
