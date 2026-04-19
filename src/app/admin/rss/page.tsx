'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const API = process.env.NEXT_PUBLIC_API_URL;

interface RSSArticle {
  id: string;
  source_name: string;
  source_url: string;
  title: string;
  excerpt: string;
  image_url: string | null;
  published_at: string;
  status: string;
  fetched_at: string;
}

export default function AdminRSSPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [articles, setArticles] = useState<RSSArticle[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast, setToast]       = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const limit = 20;

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/rss?page=${page}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setArticles(json.data ?? []);
      setTotal(json.meta?.total ?? 0);
    } catch {
      showToast('Gagal memuat artikel RSS', 'err');
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => { if (token) fetchArticles(); }, [fetchArticles, token]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setProcessing(id);
    try {
      const res = await fetch(`${API}/admin/rss/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();

      if (action === 'approve') {
        // Parse response → get draft article ID → redirect ke editor
        // Editor akan tampil artikel dengan status=draft, excerpt prefilled,
        // body kosong (admin akan isi dengan konteks MALUT)
        const json = await res.json();
        const articleId = json.data?.id;
        if (articleId) {
          showToast('✍️ Artikel dibuat sebagai draft — siap di-edit', 'ok');
          setArticles(prev => prev.filter(a => a.id !== id));
          setTotal(prev => prev - 1);
          // Delay kecil biar user sempet lihat toast
          setTimeout(() => {
            router.push(`/office/newsroom/bakabar/hub/${articleId}/edit`);
          }, 800);
          return;
        }
        // Fallback kalau response gak ada article.id
        showToast('✅ Artikel di-approve', 'ok');
      } else {
        showToast('🗑️ Artikel ditolak', 'ok');
      }

      setArticles(prev => prev.filter(a => a.id !== id));
      setTotal(prev => prev - 1);
    } catch {
      showToast('Gagal memproses artikel', 'err');
    } finally {
      setProcessing(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const sourceColor: Record<string, string> = {
    'Antara Maluku Utara': '#E67E22',
    'CNN Indonesia':        '#C0392B',
    'Tribun Ternate':       '#2980B9',
    'Kumparan':             '#8E44AD',
    'Kompas Nusantara':     '#27AE60',
    'Detik Nasional':       '#E74C3C',
    'Detik Regional':       '#E74C3C',
    'Disway':               '#16A085',
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 999, padding: '12px 20px', borderRadius: 10, background: toast.type === 'ok' ? '#065F46' : '#7F1D1D', color: '#fff', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontFamily: 'system-ui' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#F9FAFB' }}>
              📡 RSS Nasional
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>
              Review artikel dari media nasional sebelum dipublish ke BAKABAR
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: '6px 14px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 20, fontSize: 12, fontWeight: 700, color: '#FBB F24' }}>
              <span style={{ color: '#FCD34D' }}>{total}</span>
              <span style={{ color: '#9CA3AF', marginLeft: 4 }}>menunggu review</span>
            </div>
            <button onClick={fetchArticles}
              style={{ padding: '6px 14px', background: '#1B6B4A', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#fff' }}>
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {!loading && articles.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#4B5563' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#9CA3AF', marginBottom: 8 }}>Semua artikel sudah diproses!</div>
          <div style={{ fontSize: 13, color: '#6B7280' }}>Cron job akan fetch artikel baru setiap jam.</div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#6B7280', fontSize: 14 }}>
          Memuat artikel...
        </div>
      )}

      {/* Article Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {articles.map(article => (
          <div key={article.id}
            style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 12, overflow: 'hidden', display: 'flex', gap: 0 }}>

            {/* Cover image */}
            {article.image_url && (
              <div style={{ width: 140, flexShrink: 0, overflow: 'hidden' }}>
                <img src={article.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}

            {/* Content */}
            <div style={{ flex: 1, padding: '16px 18px', minWidth: 0 }}>
              {/* Source badge + date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#fff', background: sourceColor[article.source_name] || '#374151' }}>
                  {article.source_name}
                </span>
                <span style={{ fontSize: 11, color: '#4B5563' }}>
                  {formatDate(article.published_at)}
                </span>
              </div>

              {/* Title */}
              <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: '#F9FAFB', lineHeight: 1.4 }}>
                {article.title}
              </h3>

              {/* Excerpt */}
              {article.excerpt && (
                <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6B7280', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {article.excerpt}
                </p>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <a href={article.source_url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 12, color: '#0891B2', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  🔗 Baca asli ↗
                </a>
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => handleAction(article.id, 'reject')}
                  disabled={processing === article.id}
                  style={{ padding: '6px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#EF4444', opacity: processing === article.id ? 0.5 : 1 }}>
                  Tolak
                </button>
                <button
                  onClick={() => handleAction(article.id, 'approve')}
                  disabled={processing === article.id}
                  style={{ padding: '6px 20px', background: '#1B6B4A', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#fff', opacity: processing === article.id ? 0.5 : 1 }}>
                  {processing === article.id ? '...' : '✍️ Approve & Edit'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '6px 16px', background: '#1F2937', border: '1px solid #374151', borderRadius: 8, cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 13, color: '#9CA3AF', opacity: page === 1 ? 0.5 : 1 }}>
            ← Prev
          </button>
          <span style={{ padding: '6px 16px', fontSize: 13, color: '#6B7280' }}>
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '6px 16px', background: '#1F2937', border: '1px solid #374151', borderRadius: 8, cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 13, color: '#9CA3AF', opacity: page === totalPages ? 0.5 : 1 }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
