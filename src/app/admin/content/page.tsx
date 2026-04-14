'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Article {
  id: string;
  title: string;
  slug: string;
  status: string;
  category: string | null;
  author_id: string | null;
  created_at: string;
  published_at: string | null;
}

interface Report {
  id: string;
  title: string;
  content: string | null;
  status: string;
  category: string | null;
  anonymity_level: string | null;
  risk_score: number | null;
  location_name: string | null;
  created_at: string;
}

const ARTICLE_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  published: { bg: 'rgba(16,185,129,0.1)',  color: '#10B981', label: 'Published' },
  draft:     { bg: 'rgba(107,114,128,0.1)', color: '#6B7280', label: 'Draft' },
  archived:  { bg: 'rgba(107,114,128,0.1)', color: '#9CA3AF', label: 'Arsip' },
};

const REPORT_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: 'rgba(245,158,11,0.1)',  color: '#F59E0B', label: 'Pending' },
  verified: { bg: 'rgba(16,185,129,0.1)',  color: '#10B981', label: 'Verified' },
  rejected: { bg: 'rgba(239,68,68,0.1)',   color: '#EF4444', label: 'Ditolak' },
  archived: { bg: 'rgba(107,114,128,0.1)', color: '#9CA3AF', label: 'Arsip' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Hari ini';
  if (d === 1) return 'Kemarin';
  return `${d} hari lalu`;
}

export default function AdminContentPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<'articles' | 'reports'>('articles');
  const [articles, setArticles] = useState<Article[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [totalArticles, setTotalArticles] = useState(0);
  const [totalReports, setTotalReports] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchArticles = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter) params.set('status', statusFilter);
      const res  = await fetch(`${API_URL}/admin/articles?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      setArticles(data.data.data);
      setTotalArticles(data.data.total);
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat artikel', false);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  const fetchReports = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter) params.set('status', statusFilter);
      const res  = await fetch(`${API_URL}/admin/reports?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      setReports(data.data.data);
      setTotalReports(data.data.total);
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat laporan', false);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    if (tab === 'articles') fetchArticles();
    else fetchReports();
  }, [tab, fetchArticles, fetchReports]);

  const updateArticleStatus = async (id: string, status: string, title: string) => {
    if (!token) return;
    setActionLoading(id + status);
    try {
      const res  = await fetch(`${API_URL}/admin/articles/${id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      showToast(`"${title.slice(0, 30)}..." → ${ARTICLE_STATUS[status]?.label ?? status}`);
      fetchArticles();
    } catch (err: any) {
      showToast(err.message || 'Gagal update', false);
    } finally {
      setActionLoading(null);
    }
  };

  const ARTICLE_STATUS_FILTERS = [
    { value: '', label: 'Semua' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'archived', label: 'Arsip' },
  ];

  const REPORT_STATUS_FILTERS = [
    { value: '', label: 'Semua' },
    { value: 'pending', label: 'Pending' },
    { value: 'verified', label: 'Verified' },
    { value: 'rejected', label: 'Ditolak' },
  ];

  const filterOpts = tab === 'articles' ? ARTICLE_STATUS_FILTERS : REPORT_STATUS_FILTERS;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', fontFamily: "'Outfit', system-ui" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 99,
          background: toast.ok ? '#10B981' : '#EF4444',
          color: '#fff', padding: '10px 18px', borderRadius: 10,
          fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          animation: 'fadeIn 0.2s ease',
        }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.4px' }}>
            📰 Manajemen Konten
          </h1>
          <p style={{ color: '#6B7280', fontSize: 13, marginTop: 3 }}>
            {tab === 'articles' ? `${totalArticles} artikel` : `${totalReports} laporan BALAPOR`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link
            href="/admin/content/new"
            style={{
              fontSize: 13, color: '#fff', fontWeight: 600, textDecoration: 'none',
              padding: '7px 14px', background: '#1B6B4A', borderRadius: 8,
            }}
          >
            + Tulis Artikel
          </Link>
          <Link href="/admin" style={{
            fontSize: 13, color: '#1B6B4A', fontWeight: 500, textDecoration: 'none',
            padding: '6px 12px', background: 'rgba(27,107,74,0.08)', borderRadius: 8,
          }}>
            ← Overview
          </Link>
        </div>
      </div>

      {/* Tabs + Filter */}
      <div style={{
        background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB',
        padding: '14px 16px', marginBottom: 20,
        display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
      }}>
        {/* Tab toggle */}
        <div style={{ display: 'flex', gap: 4, background: '#F3F4F6', borderRadius: 10, padding: 3 }}>
          {(['articles', 'reports'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setStatusFilter(''); }}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none',
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: tab === t ? '#fff' : 'transparent',
                color: tab === t ? '#111827' : '#6B7280',
                boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {t === 'articles' ? '📰 Artikel' : '🚨 BALAPOR'}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 24, background: '#E5E7EB' }} />

        {/* Status filter */}
        <div style={{ display: 'flex', gap: 6 }}>
          {filterOpts.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              style={{
                padding: '5px 12px', borderRadius: 8, border: 'none',
                cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: statusFilter === opt.value ? '#1B6B4A' : '#F3F4F6',
                color: statusFilter === opt.value ? '#fff' : '#374151',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            border: '3px solid #1B6B4A', borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          Memuat...
        </div>
      )}

      {/* Articles */}
      {!loading && tab === 'articles' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          {articles.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
              <p style={{ color: '#6B7280', fontSize: 13 }}>Tidak ada artikel</p>
            </div>
          ) : articles.map((a) => {
            const st = ARTICLE_STATUS[a.status] ?? { bg: '#F3F4F6', color: '#6B7280', label: a.status };
            return (
              <div
                key={a.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 16px', borderBottom: '1px solid #F3F4F6',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFAFA')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontWeight: 600, fontSize: 13, color: '#111827',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {a.title}
                  </p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                    {a.category || 'Umum'} · {timeAgo(a.created_at)}
                    {a.published_at && ` · Publish: ${timeAgo(a.published_at)}`}
                  </p>
                </div>

                <span style={{
                  background: st.bg, color: st.color,
                  fontSize: 11, fontWeight: 700, padding: '3px 8px',
                  borderRadius: 20, whiteSpace: 'nowrap',
                }}>
                  {st.label}
                </span>

                <div style={{ display: 'flex', gap: 6 }}>
                  {a.status !== 'published' && (
                    <ActionBtn
                      label="Publish"
                      color="#10B981"
                      loading={actionLoading === a.id + 'published'}
                      onClick={() => updateArticleStatus(a.id, 'published', a.title)}
                    />
                  )}
                  {a.status === 'published' && (
                    <ActionBtn
                      label="Arsipkan"
                      color="#6B7280"
                      loading={actionLoading === a.id + 'archived'}
                      onClick={() => updateArticleStatus(a.id, 'archived', a.title)}
                    />
                  )}
                  {a.status !== 'draft' && a.status !== 'published' && (
                    <ActionBtn
                      label="Draft"
                      color="#F59E0B"
                      loading={actionLoading === a.id + 'draft'}
                      onClick={() => updateArticleStatus(a.id, 'draft', a.title)}
                    />
                  )}
                  <Link
                    href={`/admin/content/${a.id}/edit`}
                    style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: 'rgba(8,145,178,0.08)', color: '#0891B2', textDecoration: 'none',
                    }}
                  >
                    Edit
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reports */}
      {!loading && tab === 'reports' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          {reports.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
              <p style={{ color: '#6B7280', fontSize: 13 }}>Tidak ada laporan</p>
            </div>
          ) : reports.map((r) => {
            const st = REPORT_STATUS[r.status] ?? { bg: '#F3F4F6', color: '#6B7280', label: r.status };
            return (
              <div
                key={r.id}
                style={{
                  padding: '13px 16px', borderBottom: '1px solid #F3F4F6',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFAFA')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <p style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{r.title}</p>
                      <span style={{
                        background: st.bg, color: st.color,
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                      }}>
                        {st.label}
                      </span>
                    </div>
                    <p style={{
                      fontSize: 12, color: '#6B7280',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {r.content?.slice(0, 100) || '—'}
                    </p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
                      {r.category || '—'} · {r.anonymity_level || '—'} · Risk: {r.risk_score ?? '?'} · {r.location_name || '—'} · {timeAgo(r.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ label, color, loading, onClick }: {
  label: string; color: string; loading: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: '4px 10px', borderRadius: 6, border: 'none',
        background: `${color}18`, color, fontSize: 11, fontWeight: 700,
        cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1,
        transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => !loading && (e.currentTarget.style.background = `${color}30`)}
      onMouseLeave={(e) => (e.currentTarget.style.background = `${color}18`)}
    >
      {loading ? '...' : label}
    </button>
  );
}
