'use client';

import { useEffect, useState, useCallback, useRef, useContext, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Article {
  id: string;
  title: string;
  slug: string;
  status: string;
  category: string | null;
  author_name: string;
  cover_image_url: string | null;
  created_at: string;
  published_at: string | null;
  view_count: number;
  share_count: number;
  viral_score: number;
  is_viral: boolean;
  is_breaking: boolean;
  source: string;
}

const STATUS_TABS = [
  { value: '',          label: 'Semua',     color: '#6B7280' },
  { value: 'draft',     label: 'Draft',     color: '#F59E0B' },
  { value: 'published', label: 'Publikasi', color: '#10B981' },
  { value: 'archived',  label: 'Arsip',     color: '#9CA3AF' },
];

const CATEGORIES = [
  'berita', 'transportasi', 'sosial', 'kesehatan',
  'pendidikan', 'ekonomi', 'lingkungan', 'olahraga',
];

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  published: { bg: 'rgba(16,185,129,0.12)',  color: '#059669', label: 'Published' },
  draft:     { bg: 'rgba(245,158,11,0.12)',  color: '#D97706', label: 'Draft'     },
  archived:  { bg: 'rgba(107,114,128,0.12)', color: '#6B7280', label: 'Arsip'     },
};

function timeAgo(dateStr: string) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

function AuthorAvatar({ name }: { name: string }) {
  const initial = (name || 'A').charAt(0).toUpperCase();
  const colors = ['#1B6B4A', '#0891B2', '#7C3AED', '#DB2777', '#D97706'];
  const color = colors[initial.charCodeAt(0) % colors.length];
  return (
    <div title={name} style={{
      width: 28, height: 28, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0,
    }}>
      {initial}
    </div>
  );
}

function TrendingWidget({ articles, t }: { articles: Article[]; t: any }) {
  const trending = articles
    .filter(a => a.status === 'published')
    .sort((a, b) => b.viral_score - a.viral_score)
    .slice(0, 2);
  if (!trending.length) return null;
  return (
    <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, padding: '16px 20px', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary }}>🔥 Trending Hari Ini</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {trending.map(a => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F97316', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 1 }}>
                {a.title}
              </p>
              <p style={{ fontSize: 11, color: t.textDim }}>
                {a.view_count.toLocaleString('id-ID')} views · score {a.viral_score}
              </p>
            </div>
            <a href={`/news/${a.slug}`} target="_blank" rel="noopener noreferrer" style={{
              padding: '5px 10px', borderRadius: 8, background: '#1B6B4A',
              color: '#fff', fontSize: 11, fontWeight: 700, textDecoration: 'none', flexShrink: 0,
            }}>Lihat →</a>
          </div>
        ))}
      </div>
    </div>
  );
}

function PerluPerhatianWidget({ articles, t }: { articles: Article[]; t: any }) {
  const now = Date.now();
  const stale = articles.filter(a => a.status === 'draft' && now - new Date(a.created_at).getTime() > 24 * 3600 * 1000);
  return (
    <div style={{
      background: stale.length > 0 ? (t.sidebar) : t.sidebar,
      borderRadius: 14,
      border: `1px solid ${stale.length > 0 ? '#FDE68A' : t.sidebarBorder}`,
      padding: '16px 20px', flex: 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary }}>⚠️ Perlu Perhatian</span>
        {stale.length === 0 && <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>✓ Semua oke</span>}
      </div>
      {stale.length === 0 ? (
        <p style={{ fontSize: 12, color: t.textDim }}>Tidak ada draft yang terlalu lama.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#92400E' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
            {stale.length} draft belum dipublish {'>'} 24 jam
          </li>
        </ul>
      )}
    </div>
  );
}

function HubContent() {
  const { token } = useAuth();
  const { t } = useContext(AdminThemeContext);
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || '';

  const [articles, setArticles]       = useState<Article[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [actionLoading, setAction]    = useState<string | null>(null);
  const [statusFilter, setStatus]     = useState(initialStatus);
  const [categoryFilter, setCategory] = useState('');
  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage]               = useState(1);
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);
  const limit = 20;
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchArticles = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), page: String(page) });
      if (statusFilter)   params.set('status', statusFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      if (search)         params.set('q', search);
      const res  = await fetch(`${API_URL}/admin/articles?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      setArticles(data.data.data);
      setTotal(data.data.total);
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat artikel', false);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, categoryFilter, search, page]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1); }, 400);
  };

  const updateStatus = async (id: string, status: string, title: string) => {
    if (!token) return;
    setAction(id + status);
    try {
      const res  = await fetch(`${API_URL}/admin/articles/${id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      showToast(`"${title.slice(0, 28)}..." → ${STATUS_STYLE[status]?.label ?? status}`);
      fetchArticles();
    } catch (err: any) {
      showToast(err.message || 'Gagal update', false);
    } finally {
      setAction(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', fontFamily: "'Outfit', system-ui" }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }
        @keyframes spin   { to { transform: rotate(360deg); } }
        .row-hover:hover { background: ${t.navHover} !important; }
      `}</style>

      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 99, background: toast.ok ? '#10B981' : '#EF4444', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', animation: 'fadeIn 0.2s ease' }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary, letterSpacing: '-0.4px' }}>
            📰 Editorial Command Center
          </h1>
          <p style={{ color: t.textDim, fontSize: 13, marginTop: 3 }}>
            {total} artikel · halaman {page} dari {totalPages || 1}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/office/newsroom/bakabar/hub/new" style={{ fontSize: 13, color: '#fff', fontWeight: 700, textDecoration: 'none', padding: '8px 16px', background: '#1B6B4A', borderRadius: 10 }}>
            + Tulis Cepat
          </Link>
          <Link href="/office/newsroom/bakabar" style={{ fontSize: 13, color: t.textMuted, fontWeight: 500, textDecoration: 'none', padding: '7px 12px', background: t.navHover, borderRadius: 10 }}>
            ← Overview
          </Link>
        </div>
      </div>

      {/* Widgets */}
      {!loading && articles.length > 0 && (
        <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
          <TrendingWidget articles={articles} t={t} />
          <PerluPerhatianWidget articles={articles} t={t} />
        </div>
      )}

      {/* Toolbar */}
      <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: t.mainBg, borderRadius: 8, padding: '6px 12px', border: `1px solid ${t.sidebarBorder}`, flex: '1', minWidth: 180 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={t.textDim} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            value={searchInput}
            onChange={e => handleSearchInput(e.target.value)}
            placeholder="Cari judul artikel..."
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, color: t.textPrimary, width: '100%' }}
          />
        </div>

        {/* Status tabs */}
        <div style={{ display: 'flex', gap: 4, background: t.mainBg, borderRadius: 8, padding: 3, border: `1px solid ${t.sidebarBorder}` }}>
          {STATUS_TABS.map(tab => (
            <button key={tab.value} onClick={() => { setStatus(tab.value); setPage(1); }} style={{
              padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 700,
              background: statusFilter === tab.value ? t.navActive : 'transparent',
              color: statusFilter === tab.value ? tab.color : t.textDim,
              transition: 'all 0.15s',
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category */}
        <select value={categoryFilter} onChange={e => { setCategory(e.target.value); setPage(1); }} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${t.sidebarBorder}`, fontSize: 11, color: t.textPrimary, background: t.sidebar, cursor: 'pointer', outline: 'none' }}>
          <option value="">Semua Kategori</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, overflow: 'hidden' }}>

        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 70px 70px 100px 100px 150px', padding: '10px 16px', background: t.mainBg, borderBottom: `1px solid ${t.sidebarBorder}`, fontSize: 10, fontWeight: 800, color: t.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', gap: 8 }}>
          <span>Status</span>
          <span>Judul</span>
          <span style={{ textAlign: 'right' }}>Score</span>
          <span style={{ textAlign: 'right' }}>Views</span>
          <span>Updated</span>
          <span>Editor</span>
          <span>Aksi</span>
        </div>

        {loading && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: t.textDim }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid #1B6B4A`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
            Memuat artikel...
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
            <p style={{ color: t.textDim, fontSize: 13 }}>{search ? `Tidak ada hasil untuk "${search}"` : 'Tidak ada artikel'}</p>
          </div>
        )}

        {!loading && articles.map((a, idx) => {
          const st = STATUS_STYLE[a.status] ?? { bg: t.navHover, color: t.textDim, label: a.status };
          return (
            <div key={a.id} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '110px 1fr 70px 70px 100px 100px 150px', gap: 8, padding: '12px 16px', alignItems: 'center', borderBottom: idx < articles.length - 1 ? `1px solid ${t.sidebarBorder}` : 'none', background: 'transparent', transition: 'background 0.1s' }}>

              {/* Status */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ background: st.bg, color: st.color, fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, display: 'inline-block', width: 'fit-content' }}>{st.label}</span>
                {a.is_viral    && <span style={{ fontSize: 10, fontWeight: 700, color: '#F97316' }}>🔥 Viral</span>}
                {a.is_breaking && <span style={{ fontSize: 10, fontWeight: 700, color: '#EF4444' }}>🔴 Breaking</span>}
              </div>

              {/* Judul */}
              <div style={{ minWidth: 0, paddingRight: 16 }}>
                <p style={{ fontWeight: 700, fontSize: 13, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{a.title}</p>
                <p style={{ fontSize: 11, color: t.textDim }}>
                  {a.category || 'Umum'}
                  {a.source === 'balapor' && ' · 📢 BALAPOR'}
                  {a.source === 'rss'     && ' · 🗞️ RSS'}
                </p>
              </div>

              {/* Score */}
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: a.viral_score > 100 ? '#F97316' : t.textPrimary }}>{a.viral_score ?? 0}</span>
              </div>

              {/* Views */}
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: t.textMuted }}>
                  {a.view_count >= 1000 ? `${(a.view_count / 1000).toFixed(1)}k` : a.view_count ?? 0}
                </span>
              </div>

              {/* Updated */}
              <div><p style={{ fontSize: 11, color: t.textDim }}>{timeAgo(a.published_at || a.created_at)}</p></div>

              {/* Editor */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <AuthorAvatar name={a.author_name} />
                <span style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 56 }}>
                  {a.author_name?.split(' ')[0]}
                </span>
              </div>

              {/* Aksi */}
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {a.status === 'draft' && (
                  <button onClick={() => updateStatus(a.id, 'published', a.title)} disabled={actionLoading === a.id + 'published'}
                    style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: 'rgba(16,185,129,0.12)', color: '#059669', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    {actionLoading === a.id + 'published' ? '...' : 'Publish'}
                  </button>
                )}
                {a.status === 'published' && (
                  <button onClick={() => updateStatus(a.id, 'archived', a.title)} disabled={actionLoading === a.id + 'archived'}
                    style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: 'rgba(107,114,128,0.1)', color: t.textDim, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    {actionLoading === a.id + 'archived' ? '...' : 'Arsip'}
                  </button>
                )}
                {a.status === 'archived' && (
                  <button onClick={() => updateStatus(a.id, 'draft', a.title)} disabled={actionLoading === a.id + 'draft'}
                    style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: 'rgba(245,158,11,0.1)', color: '#D97706', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    {actionLoading === a.id + 'draft' ? '...' : 'Draft'}
                  </button>
                )}
                <a href={`/news/${a.slug}`} target="_blank" rel="noopener noreferrer"
                  style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(107,114,128,0.08)', color: t.textDim, fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                  Lihat
                </a>
                <Link href={`/admin/content/${a.id}/edit`}
                  style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(8,145,178,0.08)', color: '#0891B2', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                  Edit
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, padding: '0 4px' }}>
          <p style={{ fontSize: 12, color: t.textDim }}>
            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} dari {total} artikel
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${t.sidebarBorder}`, background: t.sidebar, color: page === 1 ? t.textDim : t.textPrimary, fontSize: 12, fontWeight: 600, cursor: page === 1 ? 'default' : 'pointer' }}>
              ← Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page - 2 + i;
              if (p < 1 || p > totalPages) return null;
              return (
                <button key={p} onClick={() => setPage(p)}
                  style={{ width: 34, height: 34, borderRadius: 8, border: p === page ? 'none' : `1px solid ${t.sidebarBorder}`, background: p === page ? '#1B6B4A' : t.sidebar, color: p === page ? '#fff' : t.textPrimary, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${t.sidebarBorder}`, background: t.sidebar, color: page === totalPages ? t.textDim : t.textPrimary, fontSize: 12, fontWeight: 600, cursor: page === totalPages ? 'default' : 'pointer' }}>
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BakabarHubPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Memuat...</div>}>
      <HubContent />
    </Suspense>
  );
}
