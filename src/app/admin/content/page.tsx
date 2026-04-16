'use client';

import { useEffect, useState, useContext } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

interface Article {
  id: string;
  title: string;
  slug: string;
  status: string;
  category: string | null;
  author_name: string;
  view_count: number;
  viral_score: number;
  is_viral: boolean;
  is_breaking: boolean;
  published_at: string | null;
  created_at: string;
}

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
  const colors  = ['#1B6B4A', '#0891B2', '#7C3AED', '#DB2777', '#D97706'];
  const color   = colors[initial.charCodeAt(0) % colors.length];
  return (
    <div title={name} style={{ width: 26, height: 26, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
      {initial}
    </div>
  );
}

export default function BakabarCommandPage() {
  const { token } = useAuth();
  const { t }     = useContext(AdminThemeContext);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/admin/articles?limit=50`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setArticles(d.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const published   = articles.filter(a => a.status === 'published');
  const drafts      = articles.filter(a => a.status === 'draft');
  const totalViews  = published.reduce((s, a) => s + (a.view_count || 0), 0);
  const now         = Date.now();
  const staleDrafts = drafts.filter(a => now - new Date(a.created_at).getTime() > 3 * 3600 * 1000);
  const trending    = [...published].sort((a, b) => b.viral_score - a.viral_score).slice(0, 5);
  const recent      = [...published]
    .sort((a, b) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime())
    .slice(0, 5);

  const StatCard = ({ label, value, sub, color = '#1B6B4A' }: { label: string; value: string | number; sub?: string; color?: string }) => (
    <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, padding: '18px 20px', flex: 1 }}>
      <div style={{ fontSize: 12, color: t.textDim, fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: '-0.03em', marginBottom: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: t.textDim }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', fontFamily: "'Outfit', system-ui" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary, letterSpacing: '-0.4px' }}>
            📰 BAKABAR Command Center
          </h1>
          <p style={{ color: t.textDim, fontSize: 13, marginTop: 3 }}>Overview performa konten hari ini</p>
        </div>
        <Link href="/admin/bakabar/hub" style={{ padding: '8px 16px', borderRadius: 10, background: '#1B6B4A', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          Editorial Hub →
        </Link>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${t.sidebarBorder}`, paddingBottom: 0 }}>
        {['Overview', 'Newsroom Analytics', 'Distribution Metrics'].map((tab, i) => (
          <div key={tab} style={{ padding: '8px 16px', fontSize: 13, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? '#1B6B4A' : t.textDim, cursor: 'pointer', borderBottom: i === 0 ? '2px solid #1B6B4A' : '2px solid transparent', marginBottom: -1 }}>
            {tab}
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: t.textDim }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #1B6B4A', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          Memuat data...
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <StatCard label="Artikel Terbit Hari Ini" value={published.length} sub="artikel published" color="#1B6B4A" />
            <StatCard label="Total Views Hari Ini" value={totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}K` : totalViews} sub="dari semua artikel" color="#0891B2" />
            <StatCard
              label="Draft Perlu Perhatian"
              value={staleDrafts.length}
              sub="belum dipublish > 3 jam"
              color={staleDrafts.length > 0 ? '#F59E0B' : '#10B981'}
            />
          </div>

          {/* Trending + Perlu Perhatian */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Trending */}
            <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary }}>🔥 Trending Hari Ini</span>
                <Link href="/admin/bakabar/hub" style={{ fontSize: 11, color: '#1B6B4A', textDecoration: 'none', fontWeight: 600 }}>See All →</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {trending.slice(0, 2).map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F97316', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 1 }}>{a.title}</p>
                      <p style={{ fontSize: 11, color: t.textDim }}>+{a.view_count.toLocaleString('id-ID')} views (+{a.viral_score} score)</p>
                    </div>
                    <a href={`/news/${a.slug}`} target="_blank" rel="noopener noreferrer"
                      style={{ padding: '5px 10px', borderRadius: 8, background: '#1B6B4A', color: '#fff', fontSize: 11, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
                      Push →
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Perlu Perhatian */}
            <div style={{ background: staleDrafts.length > 0 ? 'rgba(245,158,11,0.03)' : t.sidebar, borderRadius: 14, border: `1px solid ${staleDrafts.length > 0 ? '#FDE68A' : t.sidebarBorder}`, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary }}>⚠️ Perlu Perhatian</span>
                <Link href="/admin/bakabar/hub" style={{ fontSize: 11, color: '#F59E0B', textDecoration: 'none', fontWeight: 600 }}>Review →</Link>
              </div>
              {staleDrafts.length === 0 ? (
                <p style={{ fontSize: 12, color: t.textDim }}>✓ Semua artikel sudah diproses dengan baik.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#92400E' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
                    {staleDrafts.length} draft belum dipublish {'>'} 3 jam
                  </li>
                  {drafts.length > 0 && (
                    <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#92400E' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F97316', flexShrink: 0 }} />
                      {drafts.length} total draft menunggu review
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          {/* Editorial Dashboard */}
          <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: t.textPrimary }}>Editorial Dashboard</span>
              <Link href="/admin/bakabar/hub" style={{ fontSize: 11, color: '#1B6B4A', textDecoration: 'none', fontWeight: 600 }}>Buka Hub →</Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Trending table */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, marginBottom: 10 }}>Artikel Trending</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 60px', fontSize: 9, fontWeight: 800, color: t.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 0 6px', borderBottom: `1px solid ${t.sidebarBorder}`, marginBottom: 6 }}>
                  <span>Artikel</span>
                  <span style={{ textAlign: 'right' }}>Score</span>
                  <span style={{ textAlign: 'right' }}>Views</span>
                </div>
                {trending.map((a, i) => (
                  <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 60px', padding: '8px 0', borderBottom: `1px solid ${t.sidebarBorder}`, alignItems: 'center' }}>
                    <div style={{ minWidth: 0, paddingRight: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, width: 16, height: 16, borderRadius: '50%', background: i < 2 ? '#F97316' : t.sidebarBorder, color: i < 2 ? '#fff' : t.textDim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
                      </div>
                      <div style={{ fontSize: 10, color: t.textDim, paddingLeft: 22 }}>{a.category} · {timeAgo(a.published_at || a.created_at)}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 800, color: a.viral_score > 100 ? '#F97316' : t.textPrimary }}>{a.viral_score}</div>
                    <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: t.textMuted }}>{a.view_count >= 1000 ? `${(a.view_count / 1000).toFixed(1)}k` : a.view_count}</div>
                  </div>
                ))}
              </div>

              {/* Artikel Baru */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, marginBottom: 10 }}>Artikel Baru</div>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 50px 28px', fontSize: 9, fontWeight: 800, color: t.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 0 6px', borderBottom: `1px solid ${t.sidebarBorder}`, marginBottom: 6 }}>
                  <span>Status</span><span>Updated</span>
                  <span style={{ textAlign: 'right' }}>Views</span>
                  <span></span>
                </div>
                {recent.map(a => (
                  <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 50px 28px', padding: '8px 0', borderBottom: `1px solid ${t.sidebarBorder}`, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 20, background: 'rgba(16,185,129,0.12)', color: '#059669', display: 'inline-block', width: 'fit-content' }}>Published</span>
                    <div style={{ minWidth: 0, paddingLeft: 8, paddingRight: 8 }}>
                      <p style={{ fontSize: 10, color: t.textDim, marginBottom: 1 }}>{timeAgo(a.published_at || a.created_at)}</p>
                      <p style={{ fontSize: 11, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</p>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: t.textMuted }}>{a.view_count >= 1000 ? `${(a.view_count / 1000).toFixed(1)}k` : a.view_count}</div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}><AuthorAvatar name={a.author_name} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
