'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ImageUpload from '@/components/ui/ImageUpload';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

const CATEGORIES = [
  { key: 'berita', label: 'Berita' },
  { key: 'politik', label: 'Politik' },
  { key: 'ekonomi', label: 'Ekonomi' },
  { key: 'sosial', label: 'Sosial' },
  { key: 'budaya', label: 'Budaya' },
  { key: 'olahraga', label: 'Olahraga' },
  { key: 'teknologi', label: 'Teknologi' },
  { key: 'kesehatan', label: 'Kesehatan' },
  { key: 'pendidikan', label: 'Pendidikan' },
  { key: 'transportasi', label: 'Transportasi' },
  { key: 'cuaca', label: 'Cuaca' },
  { key: 'opini', label: 'Opini' },
];

export default function EditArticlePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('berita');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [status, setStatus] = useState('draft');
  const [slug, setSlug] = useState('');
  const [sourceReportId, setSourceReportId] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    const fetch_ = async () => {
      try {
        const res = await fetch(`${API}/admin/articles?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error?.message);

        const article = data.data.data.find((a: any) => a.id === id);
        if (!article) { setError('Artikel tidak ditemukan.'); return; }

        const detailRes = await fetch(`${API}/content/articles/${article.slug}`);
        const detailData = await detailRes.json();
        if (detailData.success && detailData.data) {
          const a = detailData.data;
          setTitle(a.title || '');
          setBody(a.body || '');
          setCategory(a.category || 'berita');
          setCoverImageUrl(a.cover_image_url || '');
          setStatus(a.status || 'draft');
          setSlug(a.slug || '');
          setSourceReportId(a.source_report_id || null);
        } else {
          setTitle(article.title || '');
          setCategory(article.category || 'berita');
          setStatus(article.status || 'draft');
          setSlug(article.slug || '');
        }
      } catch (err: any) {
        setError(err.message || 'Gagal memuat artikel');
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [token, id]);

  // ── handleSave ────────────────────────────────────────────────
  // publishNow = true  → simpan konten lalu publish (untuk draft)
  // publishNow = false → simpan konten saja, status TIDAK berubah
  const handleSave = async (publishNow = false) => {
    if (!title.trim() || !body.trim()) {
      setError('Judul dan isi artikel wajib diisi.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      // 1. Update konten — backend TIDAK ubah status via PUT
      const payload: any = {
        title: title.trim(),
        body: body.trim(),
        excerpt: body.trim().replace(/\n+/g, ' ').slice(0, 200),
        category,
        cover_image_url: coverImageUrl || null,
      };

      const res = await fetch(`${API}/content/articles/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);

      // 2. Kalau publishNow → panggil endpoint publish terpisah
      if (publishNow) {
        const pubRes = await fetch(`${API}/content/articles/${id}/publish`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const pubData = await pubRes.json();
        if (!pubData.success) throw new Error(pubData.error?.message);
        setStatus('published');
        setSuccess('Artikel berhasil dipublish! 🚀');
      } else {
        // Status tetap seperti semula
        setSuccess(
          status === 'published'
            ? 'Perubahan tersimpan ✓ (tetap published)'
            : 'Draft tersimpan ✓'
        );
      }
      setTimeout(() => setSuccess(''), 3500);
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
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

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', fontFamily: "'Outfit', system-ui" }}>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }`}</style>

      {success && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 99,
          background: '#10B981', color: '#fff', padding: '10px 18px',
          borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)', animation: 'fadeIn 0.2s ease',
        }}>{success}</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.4px' }}>
            ✏️ Edit Artikel
          </h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: status === 'published' ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
              color: status === 'published' ? '#10B981' : '#6B7280',
            }}>
              {status === 'published' ? '✅ Published' : status === 'draft' ? 'Draft' : 'Arsip'}
            </span>
            {status === 'published' && (
              <span style={{ fontSize: 11, color: '#6B7280' }}>
                Perubahan akan langsung live setelah disimpan
              </span>
            )}
            {sourceReportId && (
              <span style={{ fontSize: 11, color: '#0891B2', background: 'rgba(8,145,178,0.08)', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                🤖 AI Generated dari BALAPOR
              </span>
            )}
          </div>
        </div>
        <Link href="/admin/content" style={{
          fontSize: 13, color: '#1B6B4A', fontWeight: 500, textDecoration: 'none',
          padding: '6px 12px', background: 'rgba(27,107,74,0.08)', borderRadius: 8,
        }}>← Kembali</Link>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 10, padding: '10px 16px', marginBottom: 16,
          fontSize: 13, color: '#EF4444',
        }}>{error}</div>
      )}

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
          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
            Slug: <code style={{ background: '#F3F4F6', padding: '1px 5px', borderRadius: 4 }}>{slug}</code>
          </p>
        </div>

        {/* Kategori */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 10 }}>
            Kategori
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
            {body.length} karakter · ~{Math.ceil(body.split(' ').length / 200)} menit baca
          </p>
        </div>

        {/* Action buttons */}
        <div style={{
          background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB',
          padding: '16px 20px', display: 'flex', gap: 10, flexWrap: 'wrap',
          alignItems: 'center', justifyContent: 'flex-end',
        }}>
          {slug && (
            <a
              href={`/news/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: '#F3F4F6', color: '#374151', textDecoration: 'none',
                marginRight: 'auto',
              }}
            >
              👁️ Preview
            </a>
          )}

          {/* Tombol simpan — label sesuai status artikel */}
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            style={{
              padding: '10px 20px', borderRadius: 10,
              border: status === 'published' ? 'none' : '1px solid #E5E7EB',
              background: status === 'published' ? '#1B6B4A' : '#fff',
              color: status === 'published' ? '#fff' : '#374151',
              fontSize: 13, fontWeight: 600,
              cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1,
              boxShadow: status === 'published' ? '0 4px 12px rgba(27,107,74,0.2)' : 'none',
            }}
          >
            {saving
              ? 'Menyimpan...'
              : status === 'published'
                ? '💾 Simpan Perubahan'
                : '💾 Simpan Draft'
            }
          </button>

          {/* Tombol publish — hanya untuk non-published */}
          {status !== 'published' && (
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              style={{
                padding: '10px 20px', borderRadius: 10, border: 'none',
                background: '#1B6B4A', color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1,
                boxShadow: '0 4px 12px rgba(27,107,74,0.2)',
              }}
            >
              {saving ? 'Memproses...' : '🚀 Publish Sekarang'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
