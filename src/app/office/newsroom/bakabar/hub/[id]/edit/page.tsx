'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ImageUpload from '@/components/ui/ImageUpload';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

const CATEGORIES = [
  { key: 'berita',       label: 'Berita' },
  { key: 'politik',      label: 'Politik' },
  { key: 'ekonomi',      label: 'Ekonomi' },
  { key: 'sosial',       label: 'Sosial' },
  { key: 'budaya',       label: 'Budaya' },
  { key: 'olahraga',     label: 'Olahraga' },
  { key: 'teknologi',    label: 'Teknologi' },
  { key: 'kesehatan',    label: 'Kesehatan' },
  { key: 'pendidikan',   label: 'Pendidikan' },
  { key: 'transportasi', label: 'Transportasi' },
  { key: 'lingkungan',   label: 'Lingkungan' },
  { key: 'cuaca',        label: 'Cuaca' },
  { key: 'opini',        label: 'Opini' },
];

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  published: { bg: 'rgba(16,185,129,0.12)',  color: '#059669', label: 'Published' },
  draft:     { bg: 'rgba(245,158,11,0.12)',  color: '#D97706', label: 'Draft'     },
  review:    { bg: 'rgba(8,145,178,0.12)',   color: '#0891B2', label: 'Review'    },
  archived:  { bg: 'rgba(107,114,128,0.12)', color: '#6B7280', label: 'Arsip'     },
};

interface Version {
  id: string;
  version_number: number;
  title: string;
  edited_by: string | null;
  editor_name: string;
  change_note: string | null;
  created_at: string;
}

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

export default function EditArticlePage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const { token, user } = useAuth();

  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [statusSaving, setStatusSaving] = useState<string | null>(null);
  const [restoring, setRestoring]       = useState<number | null>(null);
  const [error, setError]               = useState('');
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null);

  // Form fields
  const [title, setTitle]                 = useState('');
  const [body, setBody]                   = useState('');
  const [excerpt, setExcerpt]             = useState('');
  const [category, setCategory]           = useState('berita');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isBreaking, setIsBreaking]       = useState(false);
  const [changeNote, setChangeNote]       = useState('');

  // Meta (readonly)
  const [status, setStatus]               = useState('draft');
  const [slug, setSlug]                   = useState('');
  const [viewCount, setViewCount]         = useState(0);
  const [viralScore, setViralScore]       = useState(0);
  const [sourceReportId, setSourceReportId] = useState<string | null>(null);
  const [authorName, setAuthorName]       = useState('');

  // Version history
  const [versions, setVersions]           = useState<Version[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [showVersions, setShowVersions]   = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchArticle = useCallback(async () => {
    if (!token || !id) return;
    try {
      const res  = await fetch(`${API}/admin/articles/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Gagal memuat artikel');

      const a = data.data;
      setTitle(a.title || '');
      setBody(a.body || '');
      setExcerpt(a.excerpt || '');
      setCategory(a.category || 'berita');
      setCoverImageUrl(a.cover_image_url || '');
      setIsBreaking(!!a.is_breaking);
      setStatus(a.status || 'draft');
      setSlug(a.slug || '');
      setViewCount(a.view_count || 0);
      setViralScore(a.viral_score || 0);
      setSourceReportId(a.source_report_id || null);
      setAuthorName(a.author_name || 'Admin');
    } catch (err: any) {
      setError(err.message || 'Gagal memuat artikel');
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  const fetchVersions = useCallback(async () => {
    if (!token || !id) return;
    setVersionsLoading(true);
    try {
      const res  = await fetch(`${API}/admin/articles/${id}/versions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setVersions(data.data || []);
    } catch {
      // silent — nggak critical
    } finally {
      setVersionsLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    fetchArticle();
    fetchVersions();
  }, [fetchArticle, fetchVersions]);

  // Save content (PATCH /admin/articles/:id) — auto track version + audit
  const handleSave = async () => {
    if (!title.trim()) { setError('Judul tidak boleh kosong'); return; }
    if (!body.trim())  { setError('Isi artikel tidak boleh kosong'); return; }

    setSaving(true);
    setError('');

    try {
      const payload: any = {
        title: title.trim(),
        body: body.trim(),
        excerpt: (excerpt.trim() || body.trim().replace(/\n+/g, ' ').slice(0, 200)),
        category,
        cover_image_url: coverImageUrl || null,
        is_breaking: isBreaking,
      };
      if (changeNote.trim()) payload.change_note = changeNote.trim();

      const res  = await fetch(`${API}/admin/articles/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);

      showToast('Perubahan tersimpan ✓');
      setChangeNote('');
      // Refresh versions list — kemungkinan ada versi baru kalau title/body berubah
      fetchVersions();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  // Status transition (Pattern A) via PATCH /admin/articles/:id/status
  const handleStatusChange = async (newStatus: string) => {
    if (!token || !id) return;
    setStatusSaving(newStatus);
    setError('');

    try {
      const res  = await fetch(`${API}/admin/articles/${id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);

      setStatus(newStatus);
      showToast(`Status → ${STATUS_STYLE[newStatus]?.label || newStatus}`);
    } catch (err: any) {
      setError(err.message || 'Gagal ubah status');
      showToast(err.message || 'Gagal ubah status', false);
    } finally {
      setStatusSaving(null);
    }
  };

  // Restore ke versi tertentu (super_admin only)
  const handleRestore = async (versionNumber: number) => {
    if (!token || !id) return;
    const confirmMsg =
      `Restore artikel ini ke versi #${versionNumber}?\n\n` +
      `Title & body akan di-overwrite dengan versi ${versionNumber}. ` +
      `Aksi ini akan di-log sebagai versi baru (tidak menghapus history).`;

    if (!window.confirm(confirmMsg)) return;

    setRestoring(versionNumber);
    setError('');

    try {
      const res  = await fetch(`${API}/admin/articles/${id}/restore/${versionNumber}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);

      showToast(`Restored ke versi #${versionNumber}`);
      // Reload article + versions
      await fetchArticle();
      await fetchVersions();
    } catch (err: any) {
      setError(err.message || 'Gagal restore');
      showToast(err.message || 'Gagal restore', false);
    } finally {
      setRestoring(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #1B6B4A', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const st = STATUS_STYLE[status] ?? { bg: '#F3F4F6', color: '#6B7280', label: status };

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', fontFamily: "'Outfit', system-ui" }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }
        @keyframes spin   { to { transform: rotate(360deg); } }
      `}</style>

      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 99,
          background: toast.ok ? '#10B981' : '#EF4444', color: '#fff',
          padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)', animation: 'fadeIn 0.2s ease',
        }}>{toast.ok ? '✓ ' : '✗ '}{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.4px' }}>
            ✏️ Edit Artikel
          </h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
              background: st.bg, color: st.color,
            }}>{st.label}</span>
            {status === 'published' && (
              <span style={{ fontSize: 11, color: '#6B7280' }}>
                {viewCount.toLocaleString('id-ID')} views · score {viralScore}
              </span>
            )}
            {sourceReportId && (
              <span style={{ fontSize: 11, color: '#0891B2', background: 'rgba(8,145,178,0.08)', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                🤖 AI from BALAPOR
              </span>
            )}
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>by {authorName}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowVersions(v => !v)}
            style={{
              fontSize: 13, color: showVersions ? '#fff' : '#0891B2', fontWeight: 600,
              padding: '6px 14px', background: showVersions ? '#0891B2' : 'rgba(8,145,178,0.08)',
              borderRadius: 8, border: 'none', cursor: 'pointer',
            }}
          >
            📜 History ({versions.length})
          </button>
          <Link href="/office/newsroom/bakabar/hub" style={{
            fontSize: 13, color: '#1B6B4A', fontWeight: 500, textDecoration: 'none',
            padding: '6px 14px', background: 'rgba(27,107,74,0.08)', borderRadius: 8,
          }}>← Kembali</Link>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 10, padding: '10px 16px', marginBottom: 16,
          fontSize: 13, color: '#EF4444',
        }}>{error}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: showVersions ? '1fr 320px' : '1fr', gap: 20, alignItems: 'start' }}>

        {/* MAIN FORM */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Cover Image */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: 20 }}>
            <ImageUpload
              bucket="articles"
              onUpload={(urls) => setCoverImageUrl(urls[0] || '')}
              existingUrls={coverImageUrl ? [coverImageUrl] : []}
              label="Foto Cover Artikel"
              maxFiles={1}
            />
          </div>

          {/* Judul */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>
              Judul Artikel <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul artikel yang menarik..."
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: '1px solid #E5E7EB', fontSize: 15, fontWeight: 600,
                outline: 'none', boxSizing: 'border-box', color: '#111827',
              }}
              onFocus={(e) => e.target.style.borderColor = '#1B6B4A'}
              onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
            />
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
              Slug: <code style={{ background: '#F3F4F6', padding: '1px 5px', borderRadius: 4 }}>{slug}</code>
              <span style={{ marginLeft: 10 }}>{title.length} / 150 karakter</span>
            </p>
          </div>

          {/* Kategori + Breaking flag */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 10 }}>
              Kategori
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setCategory(cat.key)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, border: 'none',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    background: category === cat.key ? '#1B6B4A' : '#F3F4F6',
                    color: category === cat.key ? '#fff' : '#374151',
                    transition: 'all 0.15s',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={isBreaking}
                onChange={(e) => setIsBreaking(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#EF4444' }}
              />
              🔴 Tandai sebagai Breaking News
            </label>
          </div>

          {/* Excerpt (opsional) */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>
              Excerpt <span style={{ color: '#9CA3AF', fontWeight: 400, fontSize: 11 }}>(opsional — auto dari body kalau kosong)</span>
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Ringkasan pendek untuk preview (max 200 karakter)..."
              rows={2}
              maxLength={200}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: '1px solid #E5E7EB', fontSize: 13,
                outline: 'none', boxSizing: 'border-box', resize: 'vertical',
                color: '#374151', fontFamily: 'inherit',
              }}
            />
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, textAlign: 'right' }}>
              {excerpt.length} / 200
            </p>
          </div>

          {/* Isi Artikel */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>
              Isi Artikel <span style={{ color: '#EF4444' }}>*</span>
            </label>
            {sourceReportId && (
              <div style={{
                background: 'rgba(8,145,178,0.04)', border: '1px solid rgba(8,145,178,0.2)',
                borderRadius: 8, padding: '8px 12px', marginBottom: 10,
                fontSize: 12, color: '#0891B2',
              }}>
                🤖 Konten ini di-generate oleh AI dari laporan warga. Review dan edit sebelum publish.
              </div>
            )}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tulis isi artikel di sini..."
              rows={20}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: '1px solid #E5E7EB', fontSize: 14, lineHeight: 1.8,
                outline: 'none', boxSizing: 'border-box', resize: 'vertical',
                color: '#374151', fontFamily: 'inherit',
              }}
              onFocus={(e) => e.target.style.borderColor = '#1B6B4A'}
              onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
            />
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, textAlign: 'right' }}>
              {body.length} karakter · ~{Math.max(1, Math.ceil(body.split(/\s+/).filter(Boolean).length / 200))} menit baca
            </p>
          </div>

          {/* Change note (audit descriptive) */}
          <div style={{ background: '#FFFBEB', borderRadius: 14, border: '1px solid #FDE68A', padding: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#92400E', display: 'block', marginBottom: 8 }}>
              📝 Catatan Perubahan <span style={{ color: '#9CA3AF', fontWeight: 400, fontSize: 11 }}>(opsional)</span>
            </label>
            <input
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="Contoh: Fix typo di paragraf 2 · Update data statistik · Tambah quote narasumber..."
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: '1px solid #FDE68A', fontSize: 13,
                outline: 'none', boxSizing: 'border-box',
                color: '#374151', background: '#fff',
              }}
            />
            <p style={{ fontSize: 11, color: '#92400E', marginTop: 6 }}>
              Catatan ini disimpan di history versi untuk audit trail. Tulis deskripsi singkat perubahan yang kamu lakukan.
            </p>
          </div>

          {/* Action buttons */}
          <div style={{
            background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB',
            padding: '16px 20px', display: 'flex', gap: 10, flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            {slug && (
              <a
                href={`/news/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  background: '#F3F4F6', color: '#374151', textDecoration: 'none',
                }}
              >
                👁️ Preview
              </a>
            )}

            <div style={{ flex: 1 }} />

            {/* Save content */}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '10px 20px', borderRadius: 10, border: 'none',
                background: '#1B6B4A', color: '#fff',
                fontSize: 13, fontWeight: 700,
                cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1,
                boxShadow: '0 4px 12px rgba(27,107,74,0.2)',
              }}
            >
              {saving ? 'Menyimpan...' : '💾 Simpan Perubahan'}
            </button>
          </div>

          {/* Status transition buttons (Pattern A) */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: '16px 20px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Aksi Status
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {status === 'draft' && (
                <>
                  <button
                    onClick={() => handleStatusChange('published')}
                    disabled={statusSaving === 'published'}
                    style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: '#10B981', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: statusSaving ? 0.5 : 1 }}
                  >
                    {statusSaving === 'published' ? '...' : '🚀 Publish'}
                  </button>
                  <button
                    onClick={() => handleStatusChange('review')}
                    disabled={statusSaving === 'review'}
                    style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #0891B2', background: '#fff', color: '#0891B2', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: statusSaving ? 0.5 : 1 }}
                  >
                    {statusSaving === 'review' ? '...' : '🔍 Kirim ke Review'}
                  </button>
                </>
              )}

              {status === 'review' && (
                <>
                  {isSuperAdmin && (
                    <button
                      onClick={() => handleStatusChange('published')}
                      disabled={statusSaving === 'published'}
                      style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: '#10B981', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: statusSaving ? 0.5 : 1 }}
                    >
                      {statusSaving === 'published' ? '...' : '✅ Approve & Publish'}
                    </button>
                  )}
                  <button
                    onClick={() => handleStatusChange('draft')}
                    disabled={statusSaving === 'draft'}
                    style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #D97706', background: '#fff', color: '#D97706', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: statusSaving ? 0.5 : 1 }}
                  >
                    {statusSaving === 'draft' ? '...' : '↩️ Kembalikan ke Draft'}
                  </button>
                </>
              )}

              {status === 'published' && (
                <button
                  onClick={() => handleStatusChange('archived')}
                  disabled={statusSaving === 'archived'}
                  style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #6B7280', background: '#fff', color: '#6B7280', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: statusSaving ? 0.5 : 1 }}
                >
                  {statusSaving === 'archived' ? '...' : '🗂️ Arsip'}
                </button>
              )}

              {status === 'archived' && isSuperAdmin && (
                <button
                  onClick={() => handleStatusChange('draft')}
                  disabled={statusSaving === 'draft'}
                  style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #D97706', background: '#fff', color: '#D97706', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: statusSaving ? 0.5 : 1 }}
                >
                  {statusSaving === 'draft' ? '...' : '↩️ Kembalikan ke Draft'}
                </button>
              )}

              {status === 'archived' && !isSuperAdmin && (
                <p style={{ fontSize: 12, color: '#9CA3AF' }}>
                  Artikel sudah di-arsipkan. Hanya Super Admin yang bisa mengembalikan.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* VERSION HISTORY PANEL */}
        {showVersions && (
          <aside style={{ position: 'sticky', top: 20 }}>
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: 16, maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>📜 Version History</h2>
                <button onClick={() => setShowVersions(false)} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 16, cursor: 'pointer' }}>✕</button>
              </div>

              {versionsLoading && (
                <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: 20 }}>Loading...</p>
              )}

              {!versionsLoading && versions.length === 0 && (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <p style={{ fontSize: 24, marginBottom: 8 }}>📭</p>
                  <p style={{ fontSize: 12, color: '#9CA3AF' }}>Belum ada versi tersimpan.</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Save perubahan untuk buat versi pertama.</p>
                </div>
              )}

              {!versionsLoading && versions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {versions.map((v, idx) => {
                    const isCurrent = idx === 0;
                    return (
                      <div
                        key={v.id}
                        style={{
                          padding: 12,
                          borderRadius: 10,
                          background: isCurrent ? 'rgba(27,107,74,0.06)' : '#F9FAFB',
                          border: `1px solid ${isCurrent ? 'rgba(27,107,74,0.3)' : '#E5E7EB'}`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: isCurrent ? '#1B6B4A' : '#374151' }}>
                            #{v.version_number} {isCurrent && '(current)'}
                          </span>
                          <span style={{ fontSize: 10, color: '#9CA3AF' }}>{timeAgo(v.created_at)}</span>
                        </div>
                        <p style={{ fontSize: 12, color: '#374151', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {v.title}
                        </p>
                        <p style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                          by {v.editor_name}
                        </p>
                        {v.change_note && (
                          <p style={{ fontSize: 11, color: '#92400E', marginTop: 4, fontStyle: 'italic', padding: '4px 8px', background: '#FFFBEB', borderRadius: 6 }}>
                            💬 {v.change_note}
                          </p>
                        )}
                        {!isCurrent && isSuperAdmin && (
                          <button
                            onClick={() => handleRestore(v.version_number)}
                            disabled={restoring === v.version_number}
                            style={{
                              marginTop: 8, padding: '5px 10px', borderRadius: 6, border: 'none',
                              background: 'rgba(8,145,178,0.1)', color: '#0891B2',
                              fontSize: 11, fontWeight: 700, cursor: 'pointer',
                              opacity: restoring === v.version_number ? 0.5 : 1,
                              width: '100%',
                            }}
                          >
                            {restoring === v.version_number ? 'Restoring...' : '↻ Restore to this version'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 12, textAlign: 'center', lineHeight: 1.5 }}>
                {isSuperAdmin
                  ? 'Super Admin: bisa restore ke versi manapun'
                  : 'Hanya Super Admin yang bisa restore'}
              </p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
