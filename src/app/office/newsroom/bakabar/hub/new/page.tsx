'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ImageUpload from '@/components/ui/ImageUpload';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';
const LOCAL_DRAFT_KEY = 'bakabar_draft_v1';
const AUTO_SAVE_DELAY = 2000;

const CATEGORIES = [
  { key: 'berita',       label: 'Berita',       icon: '📰', color: '#1B6B4A' },
  { key: 'viral',        label: 'Viral',        icon: '🔥', color: '#F97316' },
  { key: 'politik',      label: 'Politik',      icon: '🏛️', color: '#7C3AED' },
  { key: 'ekonomi',      label: 'Ekonomi',      icon: '💰', color: '#059669' },
  { key: 'sosial',       label: 'Sosial',       icon: '🤝', color: '#0891B2' },
  { key: 'transportasi', label: 'Transportasi', icon: '🚤', color: '#0284C7' },
  { key: 'olahraga',     label: 'Olahraga',     icon: '⚽', color: '#DC2626' },
  { key: 'budaya',       label: 'Budaya',       icon: '🎭', color: '#DB2777' },
  { key: 'teknologi',    label: 'Teknologi',    icon: '💡', color: '#2563EB' },
];

const PLATFORMS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok',    label: 'TikTok' },
  { key: 'facebook',  label: 'Facebook' },
  { key: 'twitter',   label: 'Twitter / X' },
  { key: 'youtube',   label: 'YouTube' },
  { key: 'whatsapp',  label: 'WhatsApp' },
  { key: 'lainnya',   label: 'Lainnya' },
];

// ──────────────────────────────────────────────────────────────
// Markdown — mini parser untuk live preview
// Safe: escape HTML dulu, baru apply markdown transforms
// ──────────────────────────────────────────────────────────────
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMarkdown(text: string): string {
  if (!text) return '';
  let html = escapeHtml(text);

  // Heading (harus sebelum bold/italic karena pakai #)
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm,  '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm,   '<h1>$1</h1>');

  // Blockquote (& karena dari escape)
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // List items (akan di-wrap <ul> setelah ini)
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  // Group consecutive <li> in <ul>
  html = html.replace(/(<li>[\s\S]+?<\/li>)(\n(?!<li>)|$)/g, '<ul>$1</ul>$2');

  // Inline
  html = html.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Paragraphs — split by double-newline, wrap non-block content
  const blocks = html.split(/\n\n+/).map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (/^<(h[1-3]|ul|blockquote)/.test(trimmed)) return trimmed;
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).filter(Boolean);

  return blocks.join('\n');
}

function timeSince(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 5)    return 'baru saja';
  if (diff < 60)   return `${diff} dtk lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  return `${Math.floor(diff / 3600)} jam lalu`;
}

export default function NewArticlePage() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [title, setTitle]                   = useState('');
  const [body, setBody]                     = useState('');
  const [category, setCategory]             = useState('');
  const [coverImageUrl, setCoverImageUrl]   = useState('');
  const [sourceUrl, setSourceUrl]           = useState('');
  const [sourcePlatform, setSourcePlatform] = useState('');
  const [isBreaking, setIsBreaking]         = useState(false);

  const [publishNow, setPublishNow]         = useState(false);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [submitted, setSubmitted]           = useState(false);
  const [newArticleId, setNewArticleId]     = useState<string | null>(null);

  const [showPreview, setShowPreview]       = useState(true);
  const [focusMode, setFocusMode]           = useState(false);
  const [lastSaved, setLastSaved]           = useState<Date | null>(null);
  const [, forceRerender]                   = useState(0);

  const [restorePrompt, setRestorePrompt]   = useState<any>(null);
  const [draftLoaded, setDraftLoaded]       = useState(false);

  const bodyRef   = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ───────────────────────────────────────────────────
  // Load draft dari localStorage saat mount
  // ───────────────────────────────────────────────────
  useEffect(() => {
    if (draftLoaded) return;
    try {
      const saved = localStorage.getItem(LOCAL_DRAFT_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data?.title || data?.body) {
          setRestorePrompt(data);
        }
      }
    } catch {}
    setDraftLoaded(true);
  }, [draftLoaded]);

  // ───────────────────────────────────────────────────
  // Auto-save ke localStorage (debounced)
  // ───────────────────────────────────────────────────
  useEffect(() => {
    if (!draftLoaded) return;
    if (!title && !body) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify({
          title, body, category, coverImageUrl, sourceUrl, sourcePlatform, isBreaking,
          savedAt: new Date().toISOString(),
        }));
        setLastSaved(new Date());
      } catch {}
    }, AUTO_SAVE_DELAY);

    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [title, body, category, coverImageUrl, sourceUrl, sourcePlatform, isBreaking, draftLoaded]);

  // Ticker untuk update "X mnt lalu" setiap 30 dtk
  useEffect(() => {
    if (!lastSaved) return;
    const t = setInterval(() => forceRerender(x => x + 1), 30000);
    return () => clearInterval(t);
  }, [lastSaved]);

  // ───────────────────────────────────────────────────
  // Restore draft
  // ───────────────────────────────────────────────────
  const handleRestoreDraft = () => {
    if (!restorePrompt) return;
    setTitle(restorePrompt.title || '');
    setBody(restorePrompt.body || '');
    setCategory(restorePrompt.category || '');
    setCoverImageUrl(restorePrompt.coverImageUrl || '');
    setSourceUrl(restorePrompt.sourceUrl || '');
    setSourcePlatform(restorePrompt.sourcePlatform || '');
    setIsBreaking(!!restorePrompt.isBreaking);
    setRestorePrompt(null);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(LOCAL_DRAFT_KEY);
    setRestorePrompt(null);
  };

  // ───────────────────────────────────────────────────
  // Keyboard shortcuts
  // ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false);
      }
      if (meta && e.key === 's') {
        e.preventDefault();
        if (title.trim() && body.trim() && category && !loading) {
          setPublishNow(false);
          handleSubmit(false);
        }
      }
      if (meta && e.key === 'Enter') {
        e.preventDefault();
        if (title.trim() && body.trim() && category && !loading) {
          setPublishNow(true);
          handleSubmit(true);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, category, focusMode, loading]);

  // ───────────────────────────────────────────────────
  // Markdown toolbar actions
  // ───────────────────────────────────────────────────
  const wrapSelection = (before: string, after: string = before) => {
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const selected = body.slice(start, end);
    const newText = body.slice(0, start) + before + selected + after + body.slice(end);
    setBody(newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const prefixLine = (prefix: string) => {
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = body.lastIndexOf('\n', start - 1) + 1;
    const newText = body.slice(0, lineStart) + prefix + body.slice(lineStart);
    setBody(newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  const insertLink = () => {
    const url = window.prompt('URL link:');
    if (!url) return;
    const ta = bodyRef.current;
    if (!ta) return;
    const start    = ta.selectionStart;
    const end      = ta.selectionEnd;
    const selected = body.slice(start, end) || 'teks link';
    const md = `[${selected}](${url})`;
    setBody(body.slice(0, start) + md + body.slice(end));
    setTimeout(() => ta.focus(), 0);
  };

  const handleBodyKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key === 'b') { e.preventDefault(); wrapSelection('**'); }
    if (meta && e.key === 'i') { e.preventDefault(); wrapSelection('*');  }
  };

  // ───────────────────────────────────────────────────
  // Submit
  // ───────────────────────────────────────────────────
  const handleSubmit = async (doPublish = publishNow) => {
    if (!title.trim() || !body.trim() || !category) {
      setError('Lengkapi judul, isi artikel, dan kategori.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/content/articles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          body,
          category,
          cover_image_url: coverImageUrl || null,
          source_url: sourceUrl || null,
          source_platform: sourcePlatform || null,
          is_breaking: isBreaking,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message ?? 'Gagal membuat artikel.');
        return;
      }

      const id = data.data?.id;
      setNewArticleId(id ?? null);

      if (doPublish && id) {
        await fetch(`${API}/content/articles/${id}/publish`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      // Clear local draft — artikel udah aman di server
      localStorage.removeItem(LOCAL_DRAFT_KEY);
      setSubmitted(true);
    } catch {
      setError('Koneksi bermasalah. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // ───────────────────────────────────────────────────
  // Access gates
  // ───────────────────────────────────────────────────
  if (!user || !token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-3">🔒</p>
          <h2 className="text-lg font-semibold">Akses Ditolak</h2>
          <p className="mt-1 text-sm text-gray-500">Halaman ini hanya untuk admin TeraLoka.</p>
        </div>
      </div>
    );
  }

  if (!['super_admin', 'admin_content'].includes(user.role)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-3">🚫</p>
          <h2 className="text-lg font-semibold">Bukan Admin</h2>
          <p className="mt-1 text-sm text-gray-500">Kamu tidak punya akses untuk menulis artikel.</p>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────
  // Post-submit success screen
  // ───────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <svg className="h-8 w-8 text-[#1B6B4A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Artikel {publishNow ? 'Dipublish!' : 'Disimpan sebagai Draft!'}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {publishNow ? 'Artikel sudah live di BAKABAR.' : 'Artikel tersimpan sebagai draft.'}
          </p>
          <div className="mt-5 grid gap-2">
            <button
              onClick={() => router.push('/office/newsroom/bakabar/hub')}
              className="rounded-xl bg-[#1B6B4A] py-2.5 text-sm font-semibold text-white"
            >
              Ke Editorial Command Center
            </button>
            <div className="flex gap-2">
              {newArticleId && (
                <button
                  onClick={() => router.push(`/office/newsroom/bakabar/hub/${newArticleId}/edit`)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => {
                  setSubmitted(false); setNewArticleId(null);
                  setTitle(''); setBody(''); setCategory(''); setCoverImageUrl('');
                  setSourceUrl(''); setSourcePlatform(''); setIsBreaking(false);
                  setPublishNow(false); setLastSaved(null);
                }}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600"
              >
                Tulis Lagi
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────
  // Stats + derived
  // ───────────────────────────────────────────────────
  const wordCount  = body.trim() ? body.trim().split(/\s+/).filter(Boolean).length : 0;
  const readTime   = Math.max(1, Math.ceil(wordCount / 200));
  const charCount  = body.length;
  const isViral    = category === 'viral';
  const canSubmit  = title.trim() && body.trim() && category && !loading;
  const categoryMeta = CATEGORIES.find(c => c.key === category);

  // ───────────────────────────────────────────────────
  // Styles (dipakai kedua mode)
  // ───────────────────────────────────────────────────
  const previewStyles = `
    .bk-preview h1 { font-size: 26px; font-weight: 800; line-height: 1.2; margin: 0 0 14px; color: #111827; letter-spacing: -0.4px; }
    .bk-preview h2 { font-size: 20px; font-weight: 800; margin: 22px 0 10px; color: #1F2937; }
    .bk-preview h3 { font-size: 16px; font-weight: 700; margin: 18px 0 8px; color: #1F2937; }
    .bk-preview p  { font-size: 15px; line-height: 1.8; color: #374151; margin: 0 0 14px; }
    .bk-preview strong { color: #111827; font-weight: 700; }
    .bk-preview em { color: #374151; font-style: italic; }
    .bk-preview blockquote { border-left: 3px solid #1B6B4A; padding: 6px 14px; margin: 14px 0; color: #4B5563; background: rgba(27,107,74,0.04); font-style: italic; border-radius: 0 6px 6px 0; }
    .bk-preview ul { padding-left: 22px; margin: 0 0 14px; }
    .bk-preview li { font-size: 15px; line-height: 1.8; color: #374151; margin-bottom: 4px; }
    .bk-preview a  { color: #0891B2; text-decoration: underline; }
  `;

  // ───────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────
  const containerStyle: React.CSSProperties = focusMode ? {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999, background: '#fff', overflow: 'auto',
    paddingTop: 0,
  } : {};

  return (
    <div style={containerStyle}>
      <style>{previewStyles}</style>

      {/* Restore prompt */}
      {restorePrompt && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10000, background: '#fff', border: '1px solid #FDE68A',
          borderRadius: 12, padding: '12px 20px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: 14, maxWidth: 560,
        }}>
          <span style={{ fontSize: 22 }}>💾</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>Draft tersimpan sebelumnya</p>
            <p style={{ fontSize: 11, color: '#78350F' }}>
              {restorePrompt.title ? `"${restorePrompt.title.slice(0, 50)}..."` : '(tanpa judul)'}
              {restorePrompt.savedAt && ` · ${timeSince(new Date(restorePrompt.savedAt))}`}
            </p>
          </div>
          <button onClick={handleRestoreDraft} style={{
            padding: '6px 14px', borderRadius: 8, border: 'none', background: '#1B6B4A',
            color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>Pulihkan</button>
          <button onClick={handleDiscardDraft} style={{
            padding: '6px 10px', borderRadius: 8, border: '1px solid #E5E7EB',
            background: '#fff', color: '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>Buang</button>
        </div>
      )}

      {/* Sticky toolbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #E5E7EB',
        padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: 16, fontWeight: 800, color: '#1B6B4A', letterSpacing: '-0.3px' }}>
            ✍️ Tulis Artikel
          </h1>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>
            {wordCount} kata · ~{readTime} mnt baca · {charCount} karakter
          </span>
        </div>

        {lastSaved && (
          <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            ✓ Tersimpan {timeSince(lastSaved)}
          </span>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowPreview(p => !p)} title="Toggle preview"
            style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${showPreview ? '#0891B2' : '#E5E7EB'}`,
              background: showPreview ? 'rgba(8,145,178,0.08)' : '#fff',
              color: showPreview ? '#0891B2' : '#6B7280',
              fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {showPreview ? '👁️ Preview' : '👁️ Preview'}
          </button>

          <button onClick={() => setFocusMode(f => !f)} title="Focus mode (Esc untuk keluar)"
            style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${focusMode ? '#7C3AED' : '#E5E7EB'}`,
              background: focusMode ? 'rgba(124,58,237,0.08)' : '#fff',
              color: focusMode ? '#7C3AED' : '#6B7280',
              fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {focusMode ? '🔎 Focus ON' : '🔎 Focus'}
          </button>

          <button onClick={() => router.back()}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff',
              color: '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Batal
          </button>

          <button
            onClick={() => { setPublishNow(false); handleSubmit(false); }}
            disabled={!canSubmit}
            title="Cmd/Ctrl + S"
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#fff',
              color: canSubmit ? '#374151' : '#9CA3AF',
              fontSize: 12, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
            💾 Draft
          </button>

          <button
            onClick={() => { setPublishNow(true); handleSubmit(true); }}
            disabled={!canSubmit}
            title="Cmd/Ctrl + Enter"
            style={{ padding: '6px 16px', borderRadius: 8, border: 'none',
              background: canSubmit ? '#1B6B4A' : '#D1D5DB',
              color: '#fff', fontSize: 12, fontWeight: 700,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              boxShadow: canSubmit ? '0 4px 10px rgba(27,107,74,0.25)' : 'none' }}>
            🚀 Publish
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 20px', background: 'rgba(239,68,68,0.06)', borderBottom: '1px solid rgba(239,68,68,0.15)' }}>
          <p style={{ color: '#DC2626', fontSize: 13, fontWeight: 600 }}>✗ {error}</p>
        </div>
      )}

      {/* MAIN CONTENT — 2 KOLOM */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: showPreview && !focusMode ? '1fr 1fr' : '1fr',
        gap: 0, minHeight: 'calc(100vh - 60px)',
      }}>

        {/* ── EDITOR (KIRI) ── */}
        <div style={{
          padding: '20px 28px', borderRight: showPreview && !focusMode ? '1px solid #E5E7EB' : 'none',
          maxWidth: showPreview && !focusMode ? 'none' : 820,
          margin: showPreview && !focusMode ? 0 : '0 auto', width: '100%',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Kategori */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                Kategori
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CATEGORIES.map(cat => {
                  const active = category === cat.key;
                  return (
                    <button key={cat.key} onClick={() => setCategory(cat.key)}
                      style={{
                        padding: '6px 12px', borderRadius: 8, border: 'none',
                        cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        background: active ? cat.color : '#F3F4F6',
                        color: active ? '#fff' : '#374151',
                        transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                      <span>{cat.icon}</span> {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Breaking toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={isBreaking}
                onChange={(e) => setIsBreaking(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#EF4444' }}
              />
              🔴 Tandai sebagai Breaking News
            </label>

            {/* Sumber viral */}
            {isViral && (
              <div style={{ padding: 14, borderRadius: 10, border: '1px solid #FDBA74', background: '#FFF7ED' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9A3412', marginBottom: 10 }}>
                  🔥 Berita Viral — Tambahkan sumber asli
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {PLATFORMS.map(p => (
                    <button key={p.key} onClick={() => setSourcePlatform(p.key)}
                      style={{
                        padding: '4px 10px', borderRadius: 6, border: '1px solid #FDBA74',
                        cursor: 'pointer', fontSize: 11, fontWeight: 600,
                        background: sourcePlatform === p.key ? '#F97316' : '#fff',
                        color: sourcePlatform === p.key ? '#fff' : '#9A3412',
                      }}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <input type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)}
                  placeholder="https://www.instagram.com/p/..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #FDBA74',
                    fontSize: 12, outline: 'none', boxSizing: 'border-box', background: '#fff' }} />
              </div>
            )}

            {/* Judul */}
            <div>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Judul artikel..."
                maxLength={150}
                style={{
                  width: '100%', padding: '12px 0', borderWidth: '0 0 2px 0',
                  borderColor: '#E5E7EB', borderStyle: 'solid',
                  fontSize: 24, fontWeight: 800, color: '#111827',
                  outline: 'none', fontFamily: 'inherit', letterSpacing: '-0.5px',
                  background: 'transparent',
                }}
                onFocus={e => e.target.style.borderColor = '#1B6B4A'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, textAlign: 'right' }}>
                {title.length} / 150
              </p>
            </div>

            {/* Cover */}
            <ImageUpload
              bucket="articles"
              label="Foto Cover"
              onUpload={(urls: string[]) => setCoverImageUrl(urls[0] ?? '')}
              existingUrls={coverImageUrl ? [coverImageUrl] : []}
            />

            {/* Markdown toolbar */}
            <div style={{
              display: 'flex', gap: 4, padding: '6px 8px', borderRadius: 8,
              background: '#F9FAFB', border: '1px solid #E5E7EB', flexWrap: 'wrap',
            }}>
              {[
                { label: 'B',   title: 'Bold (Cmd+B)',    action: () => wrapSelection('**'),     style: { fontWeight: 800 } },
                { label: 'I',   title: 'Italic (Cmd+I)',  action: () => wrapSelection('*'),      style: { fontStyle: 'italic' as const } },
                { label: 'H2',  title: 'Heading 2',        action: () => prefixLine('## '),        style: {} },
                { label: 'H3',  title: 'Heading 3',        action: () => prefixLine('### '),       style: {} },
                { label: '❝',   title: 'Blockquote',       action: () => prefixLine('> '),         style: {} },
                { label: '• ',  title: 'List item',        action: () => prefixLine('- '),         style: {} },
                { label: '🔗',  title: 'Link',             action: insertLink,                      style: {} },
              ].map(btn => (
                <button key={btn.label} onClick={btn.action} title={btn.title}
                  style={{ padding: '4px 10px', borderRadius: 6, border: 'none',
                    background: 'transparent', color: '#374151',
                    fontSize: 13, cursor: 'pointer', minWidth: 28, ...btn.style,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#E5E7EB')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  {btn.label}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 10, color: '#9CA3AF', alignSelf: 'center', padding: '0 6px' }}>
                Markdown: **bold** · *italic* · # heading · &gt; quote · - list
              </span>
            </div>

            {/* Body */}
            <textarea
              ref={bodyRef}
              value={body}
              onChange={e => setBody(e.target.value)}
              onKeyDown={handleBodyKey}
              placeholder={isViral
                ? 'Tulis ringkasan kenapa konten ini viral, konteks, dan reaksi warga Malut...\n\nPakai markdown:\n**bold** *italic* # heading\n> blockquote\n- list item'
                : 'Tulis isi artikel di sini.\n\nMarkdown:\n# Heading besar\n## Sub-heading\n**tebal**, *miring*\n> Kutipan penting\n- Daftar item\n[text link](url)'}
              rows={focusMode ? 30 : 20}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 10,
                border: '1px solid #E5E7EB', fontSize: 15, lineHeight: 1.75,
                outline: 'none', boxSizing: 'border-box', resize: 'vertical',
                color: '#374151', fontFamily: 'inherit', minHeight: focusMode ? 500 : 380,
              }}
              onFocus={e => e.target.style.borderColor = '#1B6B4A'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>
        </div>

        {/* ── PREVIEW (KANAN) ── */}
        {showPreview && !focusMode && (
          <div style={{
            padding: '20px 28px', background: '#F9FAFB',
            borderLeft: '1px solid #E5E7EB',
            maxHeight: 'calc(100vh - 60px)', overflowY: 'auto',
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 6 }}>
              👁️ Live Preview <span style={{ color: '#9CA3AF', fontWeight: 400 }}>— tampilan kurang lebih seperti di publik</span>
            </p>

            <article style={{
              background: '#fff', borderRadius: 14, padding: 28,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              {coverImageUrl && (
                <img src={coverImageUrl} alt="cover"
                  style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 10, marginBottom: 18 }} />
              )}

              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                {categoryMeta && (
                  <span style={{
                    padding: '3px 10px', borderRadius: 20,
                    background: categoryMeta.color, color: '#fff',
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}>
                    {categoryMeta.icon} {categoryMeta.label}
                  </span>
                )}
                {isBreaking && (
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, background: '#EF4444',
                    color: '#fff', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  }}>🔴 Breaking</span>
                )}
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                  oleh {user.name || 'Admin'} · {wordCount} kata · ~{readTime} mnt
                </span>
              </div>

              <div className="bk-preview">
                {title ? (
                  <h1>{title}</h1>
                ) : (
                  <h1 style={{ color: '#D1D5DB', fontStyle: 'italic' }}>Judul artikel...</h1>
                )}

                {body ? (
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
                ) : (
                  <p style={{ color: '#9CA3AF', fontStyle: 'italic' }}>
                    Isi artikel akan tampil di sini saat kamu mengetik...
                  </p>
                )}
              </div>

              {isViral && sourceUrl && (
                <div style={{
                  marginTop: 20, padding: '10px 14px', borderRadius: 8,
                  background: '#FFF7ED', border: '1px solid #FDBA74',
                  fontSize: 12, color: '#9A3412',
                }}>
                  📎 Sumber: <a href={sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#C2410C', textDecoration: 'underline' }}>
                    {sourcePlatform || 'link'}
                  </a>
                </div>
              )}
            </article>
          </div>
        )}
      </div>

      {/* Shortcut hint di bawah (focus mode only) */}
      {focusMode && (
        <div style={{
          position: 'fixed', bottom: 12, left: '50%', transform: 'translateX(-50%)',
          background: '#111827', color: '#E5E7EB', fontSize: 11, fontWeight: 600,
          padding: '6px 14px', borderRadius: 20, display: 'flex', gap: 10, zIndex: 10001,
        }}>
          <span>Cmd+B bold</span>
          <span>·</span>
          <span>Cmd+I italic</span>
          <span>·</span>
          <span>Cmd+S draft</span>
          <span>·</span>
          <span>Cmd+Enter publish</span>
          <span>·</span>
          <span>Esc keluar focus</span>
        </div>
      )}
    </div>
  );
}
