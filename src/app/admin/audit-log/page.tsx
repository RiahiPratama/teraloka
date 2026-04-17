'use client';

import { useState, useEffect, useCallback, useContext, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  article_title: string;
  article_slug: string | null;
  old_data: any;
  new_data: any;
  ip_address: string | null;
  created_at: string;
}

const ACTION_STYLE: Record<string, { bg: string; color: string; label: string; icon: string }> = {
  create:  { bg: 'rgba(16,185,129,0.12)',  color: '#059669', label: 'Create',  icon: '✨' },
  update:  { bg: 'rgba(8,145,178,0.12)',   color: '#0891B2', label: 'Update',  icon: '✏️' },
  delete:  { bg: 'rgba(239,68,68,0.12)',   color: '#DC2626', label: 'Delete',  icon: '🗑️' },
  publish: { bg: 'rgba(16,185,129,0.12)',  color: '#059669', label: 'Publish', icon: '🚀' },
  archive: { bg: 'rgba(107,114,128,0.12)', color: '#6B7280', label: 'Archive', icon: '🗂️' },
  restore: { bg: 'rgba(124,58,237,0.12)',  color: '#7C3AED', label: 'Restore', icon: '↻'  },
};

function timeAgo(dateStr: string) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'baru saja';
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function AuditLogContent() {
  const { token, user } = useAuth();
  const themeCtx = useContext(AdminThemeContext);
  // Fallback kalau context belum ready
  const t = themeCtx?.t ?? {
    mainBg: '#F9FAFB', sidebar: '#fff', sidebarBorder: '#E5E7EB',
    textPrimary: '#111827', textMuted: '#374151', textDim: '#6B7280',
    navHover: '#F3F4F6', navActive: 'rgba(27,107,74,0.08)',
    accent: '#1B6B4A', accentDim: '#6B7280',
  };

  const [logs, setLogs]         = useState<AuditLog[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage]         = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 30;

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: String(limit), page: String(page) });
      if (actionFilter) params.set('action', actionFilter);

      const res  = await fetch(`${API}/admin/articles/audit-log?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Gagal memuat audit log');

      setLogs(data.data.data || []);
      setTotal(data.data.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, actionFilter, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  if (user && user.role !== 'super_admin') {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <p style={{ fontSize: 36, marginBottom: 8 }}>🚫</p>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary }}>Akses Ditolak</h2>
        <p style={{ fontSize: 13, color: t.textDim, marginTop: 4 }}>
          Audit log hanya untuk Super Admin.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(total / limit);

  const formatDiff = (old_data: any, new_data: any): string[] => {
    if (!old_data && !new_data) return [];
    const keys = new Set([...Object.keys(old_data || {}), ...Object.keys(new_data || {})]);
    const lines: string[] = [];
    for (const k of keys) {
      const oldVal = old_data?.[k];
      const newVal = new_data?.[k];
      lines.push(`${k}: ${JSON.stringify(oldVal)?.slice(0, 80) || '—'}  →  ${JSON.stringify(newVal)?.slice(0, 80) || '—'}`);
    }
    return lines;
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', fontFamily: "'Outfit', system-ui" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary, letterSpacing: '-0.4px' }}>
            📜 Audit Log — Articles
          </h1>
          <p style={{ color: t.textDim, fontSize: 13, marginTop: 3 }}>
            {total} event · halaman {page} dari {totalPages || 1}
          </p>
        </div>
        <Link href="/admin" style={{
          fontSize: 13, color: t.accent, fontWeight: 500, textDecoration: 'none',
          padding: '6px 14px', background: t.navActive, borderRadius: 8,
        }}>← Super Admin</Link>
      </div>

      {/* Filter */}
      <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: t.textDim, fontWeight: 600 }}>Filter action:</span>
        <div style={{ display: 'flex', gap: 4, background: t.mainBg, borderRadius: 8, padding: 3, border: `1px solid ${t.sidebarBorder}` }}>
          {[
            { v: '', label: 'Semua' },
            { v: 'create', label: 'Create' },
            { v: 'update', label: 'Update' },
            { v: 'publish', label: 'Publish' },
            { v: 'archive', label: 'Archive' },
            { v: 'restore', label: 'Restore' },
          ].map(f => (
            <button
              key={f.v}
              onClick={() => { setActionFilter(f.v); setPage(1); }}
              style={{
                padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 700,
                background: actionFilter === f.v ? t.navActive : 'transparent',
                color: actionFilter === f.v ? t.accent : t.textDim,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 10, padding: '10px 16px', marginBottom: 16,
          fontSize: 13, color: '#EF4444',
        }}>{error}</div>
      )}

      {/* Timeline */}
      <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, overflow: 'hidden' }}>

        {loading && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: t.textDim }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${t.accent}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
            Memuat audit log...
          </div>
        )}

        {!loading && logs.length === 0 && (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
            <p style={{ color: t.textDim, fontSize: 13 }}>
              {actionFilter ? `Tidak ada event dengan action "${actionFilter}"` : 'Belum ada audit log'}
            </p>
          </div>
        )}

        {!loading && logs.map((log, idx) => {
          const ast = ACTION_STYLE[log.action] ?? { bg: '#F3F4F6', color: '#6B7280', label: log.action, icon: '•' };
          const isExpanded = expandedId === log.id;
          const hasDiff = log.old_data || log.new_data;

          return (
            <div key={log.id} style={{ borderBottom: idx < logs.length - 1 ? `1px solid ${t.sidebarBorder}` : 'none' }}>
              <div
                onClick={() => hasDiff && setExpandedId(isExpanded ? null : log.id)}
                style={{
                  padding: '14px 18px',
                  cursor: hasDiff ? 'pointer' : 'default',
                  display: 'grid',
                  gridTemplateColumns: '100px 1fr 180px 140px 120px',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                {/* Action */}
                <span style={{
                  background: ast.bg, color: ast.color,
                  fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20,
                  display: 'inline-block', width: 'fit-content',
                }}>
                  {ast.icon} {ast.label}
                </span>

                {/* Article title + slug */}
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.article_title}
                  </p>
                  {log.article_slug && (
                    <a
                      href={`/news/${log.article_slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: 11, color: t.textDim, textDecoration: 'none' }}
                    >
                      {log.article_slug} ↗
                    </a>
                  )}
                </div>

                {/* User */}
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: t.textMuted }}>
                    {log.user_name}
                  </p>
                  {log.ip_address && (
                    <p style={{ fontSize: 10, color: t.textDim, fontFamily: 'monospace' }}>
                      {log.ip_address}
                    </p>
                  )}
                </div>

                {/* Time */}
                <div>
                  <p style={{ fontSize: 12, color: t.textMuted, fontWeight: 600 }}>{timeAgo(log.created_at)}</p>
                  <p style={{ fontSize: 10, color: t.textDim }}>{formatDate(log.created_at)}</p>
                </div>

                {/* Expand indicator */}
                <div style={{ textAlign: 'right' }}>
                  {hasDiff && (
                    <span style={{ fontSize: 11, color: t.textDim }}>
                      {isExpanded ? '▲ Tutup' : '▼ Lihat Diff'}
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded diff view */}
              {isExpanded && hasDiff && (
                <div style={{ padding: '0 18px 16px 18px', background: t.mainBg }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: t.textDim, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Perubahan Data
                  </p>
                  <div style={{
                    background: t.sidebar, borderRadius: 8,
                    padding: '12px 14px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: 11, lineHeight: 1.7, color: t.textPrimary,
                    border: `1px solid ${t.sidebarBorder}`, overflow: 'auto',
                  }}>
                    {formatDiff(log.old_data, log.new_data).map((line, i) => (
                      <div key={i} style={{ wordBreak: 'break-all' }}>{line}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, padding: '0 4px' }}>
          <p style={{ fontSize: 12, color: t.textDim }}>
            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} dari {total} event
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${t.sidebarBorder}`, background: t.sidebar, color: page === 1 ? t.textDim : t.textPrimary, fontSize: 12, fontWeight: 600, cursor: page === 1 ? 'default' : 'pointer' }}>
              ← Prev
            </button>
            <span style={{ padding: '6px 14px', fontSize: 12, color: t.textPrimary, fontWeight: 700 }}>
              Hal. {page}
            </span>
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

export default function AuditLogPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Memuat...</div>}>
      <AuditLogContent />
    </Suspense>
  );
}
