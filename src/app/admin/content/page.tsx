import Link from 'next/link';
import { getArticlesAdmin } from '@/lib/engine/content-engine';
import { getReportsForModeration } from '@/lib/engine/moderation-engine';
import { formatRelative } from '@/utils/format';

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab || 'articles';

  return (
    <div className="px-4 py-4">
      <Link href="/admin" className="text-sm text-[#1B6B4A]">← Command Center</Link>
      <h1 className="mt-2 text-xl font-bold">📰 Konten</h1>

      {/* Tabs */}
      <div className="mt-4 flex gap-2">
        <Link
          href="/admin/content"
          className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'articles' ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100'}`}
        >
          Artikel
        </Link>
        <Link
          href="/admin/content?tab=reports"
          className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'reports' ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100'}`}
        >
          Laporan BALAPOR
        </Link>
      </div>

      {tab === 'articles' ? <ArticlesTab status={params.status} /> : <ReportsTab />}
    </div>
  );
}

async function ArticlesTab({ status }: { status?: string }) {
  let articles: any[] = [];
  let total = 0;
  try {
    const result = await getArticlesAdmin({ status, page: 1, limit: 50 });
    articles = result.data;
    total = result.total;
  } catch {}

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{total} artikel</p>
        <Link href="/admin/content/new" className="rounded-lg bg-[#1B6B4A] px-3 py-1.5 text-sm text-white">
          + Tulis Artikel
        </Link>
      </div>

      <div className="mt-3 space-y-2">
        {articles.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-500">Belum ada artikel. Mulai tulis!</p>
          </div>
        ) : (
          articles.map((a: any) => (
            <div key={a.id} className="rounded-lg border border-gray-100 p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {a.author?.full_name} · {formatRelative(a.created_at)}
                  </p>
                </div>
                <span className={`rounded px-2 py-0.5 text-xs ${
                  a.status === 'published' ? 'bg-green-100 text-green-700' :
                  a.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {a.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

async function ReportsTab() {
  let reports: any[] = [];
  try {
    const result = await getReportsForModeration({ page: 1, limit: 50 });
    reports = result.data;
  } catch {}

  return (
    <div className="mt-4 space-y-2">
      {reports.length === 0 ? (
        <div className="rounded-xl bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-500">Tidak ada laporan pending.</p>
        </div>
      ) : (
        reports.map((r: any) => (
          <div key={r.id} className="rounded-lg border border-gray-100 p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">{r.title}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Risk: {r.risk_score} · {r.anonymity_level} · {formatRelative(r.created_at)}
                </p>
              </div>
              <span className={`rounded px-2 py-0.5 text-xs ${
                r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                r.status === 'verified' ? 'bg-green-100 text-green-700' :
                r.status === 'rejected' ? 'bg-red-100 text-red-700' :
                'bg-gray-100'
              }`}>
                {r.status}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
