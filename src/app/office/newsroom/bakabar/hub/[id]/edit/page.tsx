'use client';

import { useState, useRef, useEffect, useContext, useCallback } from 'react';
import ImageUpload from '@/components/ui/ImageUpload';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import { createClient } from '@/lib/supabase/client';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';
const EDIT_DRAFT_KEY_PREFIX = 'bakabar_edit_draft_';
const AUTO_SAVE_DELAY = 2000;

// Pattern A workflow — mirror dari backend canTransition
// Menentukan tombol transisi status yang muncul di UI.
function canTransition(role: string, from: string, to: string): boolean {
  const map: Record<string, Record<string, string[]>> = {
    super_admin: {
      draft:     ['published', 'review', 'archived'],
      review:    ['published', 'draft', 'archived'],
      published: ['archived', 'draft'],
      archived:  ['draft', 'published'],
    },
    admin_content: {
      draft:     ['published', 'review'],
      review:    ['draft'],
      published: ['archived'],
      archived:  [],
    },
  };
  return map[role]?.[from]?.includes(to) ?? false;
}

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  draft:     { label: 'Draft',     bg: 'rgba(245,158,11,0.12)', color: '#D97706', icon: '📝' },
  review:    { label: 'Review',    bg: 'rgba(8,145,178,0.12)',  color: '#0891B2', icon: '🔍' },
  published: { label: 'Published', bg: 'rgba(16,185,129,0.12)', color: '#059669', icon: '✅' },
  archived:  { label: 'Archived',  bg: 'rgba(107,114,128,0.12)',color: '#6B7280', icon: '🗂️' },
};

const CATEGORIES = [
  { key: 'berita',       label: 'Berita',       icon: '📰', color: '#1B6B4A' },
  { key: 'viral',        label: 'Viral',        icon: '🔥', color: '#F97316' },
  { key: 'politik',      label: 'Politik',      icon: '🏛️', color: '#7C3AED' },
  { key: 'ekonomi',      label: 'Ekonomi',      icon: '💰', color: '#059669' },
  { key: 'sosial',       label: 'Sosial',       icon: '🤝', color: '#0891B2' },
  { key: 'transportasi', label: 'Transportasi', icon: '🚤', color: '#0284C7' },
  { key: 'olahraga',     label: 'Olahraga',     icon: '⚽', color: '#DC2626' },
  { key: 'kesehatan',    label: 'Kesehatan',    icon: '🩺', color: '#E11D48' },
  { key: 'pendidikan',   label: 'Pendidikan',   icon: '🎓', color: '#CA8A04' },
  { key: 'budaya',       label: 'Budaya',       icon: '🎭', color: '#DB2777' },
  { key: 'teknologi',    label: 'Teknologi',    icon: '💡', color: '#2563EB' },
  { key: 'cuaca',        label: 'Cuaca',        icon: '☁️', color: '#0EA5E9' },
  { key: 'opini',        label: 'Opini',        icon: '💬', color: '#6B7280' },
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

// Hardcoded UUID dari public.locations di Supabase.
// Kalau ada daerah baru ditambah di DB, update list ini.
const LOCATIONS = [
  { id: 'fa178abc-8b40-4f41-adaf-a08b38bfef2b', name: 'Ternate',            slug: 'ternate', type: 'kota',       icon: '🏙️' },
  { id: 'ddbdef89-87cd-4f47-a75e-01750a9d50b1', name: 'Tidore Kepulauan',   slug: 'tidore',  type: 'kota',       icon: '🏙️' },
  { id: '6bed370a-b2c5-43e4-87cd-aba43758871b', name: 'Sofifi',             slug: 'sofifi',  type: 'kota',       icon: '🏙️' },
  { id: '7f324271-3d2b-4326-b740-adc0bad12383', name: 'Halmahera Utara',    slug: 'halut',   type: 'kabupaten',  icon: '🏝️' },
  { id: 'd53b8ebe-30b7-4f4c-82e4-0cad8166aa67', name: 'Halmahera Barat',    slug: 'halbar',  type: 'kabupaten',  icon: '🏝️' },
  { id: '2e095627-da6b-4f87-a094-f19495d20191', name: 'Halmahera Selatan',  slug: 'halsel',  type: 'kabupaten',  icon: '🏝️' },
  { id: '32dcd330-28d8-453b-808f-144d0f8758f3', name: 'Halmahera Tengah',   slug: 'halteng', type: 'kabupaten',  icon: '🏝️' },
  { id: '21fd28c8-4552-4b55-8898-acb027512ae4', name: 'Halmahera Timur',    slug: 'haltim',  type: 'kabupaten',  icon: '🏝️' },
  { id: '65c75f23-a998-424b-a479-e6278b62230b', name: 'Kepulauan Sula',     slug: 'sula',    type: 'kabupaten',  icon: '🏝️' },
  { id: '45096dd8-0ca1-4f56-9a91-9670ddcf9065', name: 'Pulau Taliabu',      slug: 'taliabu', type: 'kabupaten',  icon: '🏝️' },
  { id: 'c5d91903-429c-4e15-899a-181514e1057f', name: 'Kepulauan Morotai',  slug: 'morotai', type: 'kabupaten',  icon: '🏝️' },
];

// ──────────────────────────────────────────────────────────────
// Markdown — mini parser
// ──────────────────────────────────────────────────────────────
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderMarkdown(text: string): string {
  if (!text) return '';
  let html = escapeHtml(text);

  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm,  '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm,   '<h1>$1</h1>');
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]+?<\/li>)(\n(?!<li>)|$)/g, '<ul>$1</ul>$2');
  html = html.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>');

  // Image syntax HARUS sebelum link karena ![]() contains []()
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, src) => {
    const safeAlt = alt || '';
    if (safeAlt.trim()) {
      return `<figure class="bk-fig"><img src="${src}" alt="${safeAlt}" /><figcaption>${safeAlt}</figcaption></figure>`;
    }
    return `<img class="bk-inline" src="${src}" alt="" />`;
  });

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  const blocks = html.split(/\n\n+/).map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (/^<(h[1-3]|ul|blockquote|figure|img)/.test(trimmed)) return trimmed;
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

export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const articleId = params?.id;
  const LOCAL_DRAFT_KEY = `${EDIT_DRAFT_KEY_PREFIX}${articleId}`;
  const { user, token } = useAuth();
  const themeCtx = useContext(AdminThemeContext);
  const dark = themeCtx?.dark ?? true;
  const t = themeCtx?.t ?? {
    mainBg: '#0D1117', sidebar: '#161B22', sidebarBorder: '#21262D',
    textPrimary: '#F9FAFB', textMuted: '#D1D5DB', textDim: '#9CA3AF',
    navHover: '#21262D', navActive: 'rgba(27,107,74,0.15)',
    accent: '#1B6B4A', accentDim: '#059669',
    topbar: '#161B22', topbarBorder: '#21262D',
    userCard: '#21262D',
  };

  // Derived theme tokens untuk editor-specific styling
  const editorTokens = {
    pageBg:       dark ? '#0D1117' : '#F9FAFB',
    cardBg:       dark ? '#161B22' : '#FFFFFF',
    inputBg:      dark ? '#0D1117' : '#FFFFFF',
    inputBorder:  dark ? '#30363D' : '#E5E7EB',
    toolbarBg:    dark ? 'rgba(22,27,34,0.9)' : 'rgba(255,255,255,0.95)',
    toolbarBorder:dark ? '#21262D' : '#E5E7EB',
    chipBg:       dark ? '#1F2937' : '#F3F4F6',
    chipText:     dark ? '#D1D5DB' : '#374151',
    dimText:      dark ? '#9CA3AF' : '#6B7280',
    previewBg:    dark ? '#0A0D11' : '#F9FAFB',
    previewCard:  dark ? '#161B22' : '#FFFFFF',
    borderSubtle: dark ? '#21262D' : '#E5E7EB',
    hintBg:       dark ? '#1F2937' : '#F9FAFB',
    articleText:  dark ? '#E5E7EB' : '#374151',
    articleHead:  dark ? '#F9FAFB' : '#111827',
    articleStrong:dark ? '#FFFFFF' : '#111827',
    quoteBg:      dark ? 'rgba(27,107,74,0.1)'  : 'rgba(27,107,74,0.04)',
    quoteText:    dark ? '#9CA3AF' : '#4B5563',
    viralBg:      dark ? 'rgba(249,115,22,0.08)' : '#FFF7ED',
    viralBorder:  dark ? 'rgba(251,146,60,0.3)'  : '#FDBA74',
    viralText:    dark ? '#FDBA74' : '#9A3412',
    successText:  '#10B981',
    errorText:    '#EF4444',
  };

  const [title, setTitle]                   = useState('');
  const [body, setBody]                     = useState('');
  const [category, setCategory]             = useState('');
  const [coverImageUrl, setCoverImageUrl]   = useState('');
  const [sourceUrl, setSourceUrl]           = useState('');
  const [sourcePlatform, setSourcePlatform] = useState('');
  const [isBreaking, setIsBreaking]         = useState(false);
  const [isTrending, setIsTrending]         = useState(false);
  const [locationId, setLocationId]         = useState('');

  const [loading, setLoading]               = useState(false);
  const [initialLoading, setInitialLoading] = useState(true); // load artikel dari DB
  const [error, setError]                   = useState('');
  const [savedToast, setSavedToast]         = useState('');

  // Edit-specific state
  const [article, setArticle]               = useState<any>(null);
  const [originalStatus, setOriginalStatus] = useState<string>('draft');
  const [changeNote, setChangeNote]         = useState('');
  const [transitioning, setTransitioning]   = useState<string | null>(null); // status yang lagi di-transition

  // Version history modal
  const [showHistory, setShowHistory]       = useState(false);
  const [versions, setVersions]             = useState<any[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [restoreTarget, setRestoreTarget]   = useState<any>(null);
  const [restoring, setRestoring]           = useState(false);

  const [showPreview, setShowPreview]       = useState(true);
  const [focusMode, setFocusMode]           = useState(false);
  const [lastSaved, setLastSaved]           = useState<Date | null>(null);
  const [, forceRerender]                   = useState(0);

  const [uploadingInline, setUploadingInline] = useState(false);
  const [inlineError, setInlineError]       = useState('');

  const bodyRef   = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load draft
  // Fetch article dari DB saat mount
  useEffect(() => {
    if (!articleId || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/admin/articles/${articleId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          if (!cancelled) setError(data.error?.message || 'Artikel tidak ditemukan');
          return;
        }
        if (cancelled) return;
        const a = data.data;
        setArticle(a);
        setOriginalStatus(a.status);
        setTitle(a.title || '');
        setBody(a.body || '');
        setCategory(a.category ?? '');
        setCoverImageUrl(a.cover_image_url ?? '');
        setSourceUrl(a.source_url ?? '');
        setSourcePlatform(a.source_platform ?? '');
        setIsBreaking(!!a.is_breaking);
        setIsTrending(!!a.is_viral);
        setLocationId(a.location_id ?? '');
      } catch {
        if (!cancelled) setError('Koneksi bermasalah. Refresh halaman.');
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [articleId, token]);

  // Auto-save ke localStorage (untuk recovery kalau browser crash/tab closed accidental)
  // Key per-article supaya tidak bentrok antar artikel
  useEffect(() => {
    if (initialLoading || !articleId) return;
    if (!title && !body) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify({
          title, body, category, coverImageUrl, sourceUrl, sourcePlatform, isBreaking, isTrending, locationId,
          savedAt: new Date().toISOString(),
        }));
        setLastSaved(new Date());
      } catch {}
    }, AUTO_SAVE_DELAY);

    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [title, body, category, coverImageUrl, sourceUrl, sourcePlatform, isBreaking, isTrending, locationId, initialLoading, articleId, LOCAL_DRAFT_KEY]);

  useEffect(() => {
    if (!lastSaved) return;
    const tm = setInterval(() => forceRerender(x => x + 1), 30000);
    return () => clearInterval(tm);
  }, [lastSaved]);

  // Auto-reset source fields saat kategori BUKAN viral
  useEffect(() => {
    if (category !== 'viral') {
      if (sourceUrl)      setSourceUrl('');
      if (sourcePlatform) setSourcePlatform('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // Keyboard shortcuts: Cmd+S save, Esc exit focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (e.key === 'Escape' && focusMode) setFocusMode(false);
      if (meta && e.key === 's') {
        e.preventDefault();
        if (title.trim() && body.trim() && !loading) {
          handleSave();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, category, focusMode, loading]);

  // Markdown toolbar actions
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

  // Upload foto inline ke Supabase Storage → insert markdown image di cursor
  const insertImageInline = () => {
    setInlineError('');
    const fi = document.createElement('input');
    fi.type   = 'file';
    fi.accept = 'image/jpeg,image/png,image/webp';
    fi.onchange = async (e: any) => {
      const file: File | undefined = e.target.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        setInlineError('Ukuran foto inline maksimal 2MB');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setInlineError('Format foto harus JPG, PNG, atau WebP');
        return;
      }

      setUploadingInline(true);
      try {
        const supabase = createClient();
        const ext = file.name.split('.').pop();
        const fileName = `inline-${Date.now()}-${Math.random().toString(36).slice(-6)}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from('articles')
          .upload(fileName, file, { upsert: false });
        if (upErr) throw upErr;

        const { data } = supabase.storage.from('articles').getPublicUrl(fileName);
        const url = data.publicUrl;

        const caption = window.prompt('Caption foto (opsional, dikosongkan juga ok):', '') || '';
        const md = `\n\n![${caption}](${url})\n\n`;

        const ta = bodyRef.current;
        if (!ta) {
          setBody(body + md);
          return;
        }
        const start = ta.selectionStart;
        setBody(body.slice(0, start) + md + body.slice(start));
        setTimeout(() => {
          ta.focus();
          ta.setSelectionRange(start + md.length, start + md.length);
        }, 0);
      } catch (err: any) {
        setInlineError(err.message || 'Gagal upload foto inline');
      } finally {
        setUploadingInline(false);
      }
    };
    fi.click();
  };

  const handleBodyKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key === 'b') { e.preventDefault(); wrapSelection('**'); }
    if (meta && e.key === 'i') { e.preventDefault(); wrapSelection('*');  }
  };

  // Save perubahan ke DB — PUT /admin/articles/:id via endpoint public /content/articles/:id
  // Endpoint PATCH /admin/articles/:id support version tracking + audit
  const handleSave = async (exitAfter: boolean = false) => {
    if (!articleId) return;
    if (!title.trim() || !body.trim()) {
      setError('Judul dan isi artikel wajib diisi.');
      return;
    }
    setLoading(true);
    setError('');
    setSavedToast('');

    try {
      const res = await fetch(`${API}/admin/articles/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          body,
          category: category || null,
          cover_image_url: coverImageUrl || null,
          source_url: sourceUrl || null,
          source_platform: sourcePlatform || null,
          is_breaking: isBreaking,
          is_viral: isTrending,
          location_id: locationId || null,
          change_note: changeNote.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error?.message ?? 'Gagal menyimpan perubahan.');
        return;
      }

      // Clear localStorage draft (tidak perlu recovery lagi)
      localStorage.removeItem(LOCAL_DRAFT_KEY);
      setChangeNote('');

      if (exitAfter) {
        setSavedToast('✓ Tersimpan, kembali ke hub...');
        setTimeout(() => router.push('/office/newsroom/bakabar/hub'), 800);
      } else {
        setSavedToast('✓ Perubahan tersimpan');
        setTimeout(() => setSavedToast(''), 3000);
      }
    } catch {
      setError('Koneksi bermasalah. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // Status transition — Pattern A workflow
  const handleStatusChange = async (newStatus: string, reason?: string) => {
    if (!articleId) return;
    if (newStatus === originalStatus) return;
    setTransitioning(newStatus);
    setError('');

    try {
      const res = await fetch(`${API}/admin/articles/${articleId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus, reason }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error?.message ?? 'Gagal ubah status.');
        return;
      }

      setOriginalStatus(newStatus);
      const statusLabel = STATUS_STYLE[newStatus]?.label || newStatus;
      setSavedToast(`✓ Status diubah ke ${statusLabel}`);
      setTimeout(() => setSavedToast(''), 3000);

      // Kalau archive, redirect ke hub setelah 2 detik
      if (newStatus === 'archived') {
        setTimeout(() => router.push('/office/newsroom/bakabar/hub'), 2000);
      }
    } catch {
      setError('Koneksi bermasalah. Coba lagi.');
    } finally {
      setTransitioning(null);
    }
  };

  // Load versions untuk modal history
  const loadVersions = useCallback(async () => {
    if (!articleId || !token) return;
    setLoadingVersions(true);
    try {
      const res = await fetch(`${API}/admin/articles/${articleId}/versions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVersions(data.data || []);
      }
    } catch {}
    finally {
      setLoadingVersions(false);
    }
  }, [articleId, token]);

  const openHistoryModal = () => {
    setShowHistory(true);
    loadVersions();
  };

  // Restore ke versi tertentu — load content ke editor (belum save, user bisa review)
  const handleRestoreVersion = async () => {
    if (!restoreTarget || !articleId) return;
    setRestoring(true);
    try {
      const res = await fetch(`${API}/admin/articles/${articleId}/versions/${restoreTarget.version_number}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const v = data.data;
        setTitle(v.title || title);
        setBody(v.body || body);
        setChangeNote(`Restore dari v${restoreTarget.version_number}`);
        setSavedToast(`✓ Versi ${restoreTarget.version_number} dimuat. Klik Simpan untuk konfirmasi.`);
        setTimeout(() => setSavedToast(''), 4000);
        setRestoreTarget(null);
        setShowHistory(false);
      } else {
        setError(data.error?.message ?? 'Gagal restore versi.');
      }
    } catch {
      setError('Koneksi bermasalah saat restore.');
    } finally {
      setRestoring(false);
    }
  };

  if (!user || !token) {
    return (
      <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 36, marginBottom: 8 }}>🔒</p>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: t.textPrimary }}>Akses Ditolak</h2>
          <p style={{ fontSize: 13, color: t.textDim, marginTop: 4 }}>Halaman ini hanya untuk admin TeraLoka.</p>
        </div>
      </div>
    );
  }

  if (!['super_admin', 'admin_content'].includes(user.role)) {
    return (
      <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 36, marginBottom: 8 }}>🚫</p>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: t.textPrimary }}>Bukan Admin</h2>
          <p style={{ fontSize: 13, color: t.textDim, marginTop: 4 }}>Kamu tidak punya akses untuk menulis artikel.</p>
        </div>
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center', padding: 16, background: editorTokens.pageBg }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            border: `3px solid ${t.accent}`, borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontSize: 13, color: t.textDim }}>Memuat artikel...</p>
        </div>
      </div>
    );
  }

  if (error && !article) {
    return (
      <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center', padding: 16, background: editorTokens.pageBg }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <p style={{ fontSize: 36, marginBottom: 8 }}>❌</p>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary }}>Gagal Memuat Artikel</h2>
          <p style={{ fontSize: 13, color: t.textDim, marginTop: 6 }}>{error}</p>
          <button
            onClick={() => router.push('/office/newsroom/bakabar/hub')}
            style={{
              marginTop: 16, padding: '8px 16px', borderRadius: 8,
              background: t.accent, color: '#fff', fontSize: 13, fontWeight: 700,
              border: 'none', cursor: 'pointer',
            }}>
            ← Kembali ke Hub
          </button>
        </div>
      </div>
    );
  }

  // Stats
  const wordCount  = body.trim() ? body.trim().split(/\s+/).filter(Boolean).length : 0;
  const readTime   = Math.max(1, Math.ceil(wordCount / 200));
  const charCount  = body.length;
  const isViral    = category === 'viral';
  const canSubmit  = title.trim() && body.trim() && !loading;
  const categoryMeta = CATEGORIES.find(c => c.key === category);

  // Preview styles — adaptive ke theme
  const previewStyles = `
    .bk-preview h1 { font-size: 26px; font-weight: 800; line-height: 1.2; margin: 0 0 14px; color: ${editorTokens.articleHead}; letter-spacing: -0.4px; }
    .bk-preview h2 { font-size: 20px; font-weight: 800; margin: 22px 0 10px; color: ${editorTokens.articleHead}; }
    .bk-preview h3 { font-size: 16px; font-weight: 700; margin: 18px 0 8px; color: ${editorTokens.articleHead}; }
    .bk-preview p  { font-size: 15px; line-height: 1.8; color: ${editorTokens.articleText}; margin: 0 0 14px; }
    .bk-preview strong { color: ${editorTokens.articleStrong}; font-weight: 700; }
    .bk-preview em { color: ${editorTokens.articleText}; font-style: italic; }
    .bk-preview blockquote { border-left: 3px solid #1B6B4A; padding: 6px 14px; margin: 14px 0; color: ${editorTokens.quoteText}; background: ${editorTokens.quoteBg}; font-style: italic; border-radius: 0 6px 6px 0; }
    .bk-preview ul { padding-left: 22px; margin: 0 0 14px; }
    .bk-preview li { font-size: 15px; line-height: 1.8; color: ${editorTokens.articleText}; margin-bottom: 4px; }
    .bk-preview a  { color: #0891B2; text-decoration: underline; }

    .bk-preview figure.bk-fig { margin: 18px 0; text-align: center; }
    .bk-preview figure.bk-fig img {
      width: 100%; height: auto; max-height: 450px; object-fit: contain;
      border-radius: 10px; background: ${dark ? '#0A0D11' : '#F3F4F6'};
      display: block; margin: 0 auto;
    }
    .bk-preview figure.bk-fig figcaption {
      font-size: 12px; color: ${t.textDim}; margin-top: 8px;
      font-style: italic; text-align: center;
    }
    .bk-preview img.bk-inline {
      width: 100%; height: auto; max-height: 450px; object-fit: contain;
      border-radius: 10px; margin: 18px 0; display: block;
      background: ${dark ? '#0A0D11' : '#F3F4F6'};
    }

    .bk-placeholder { color: ${t.textDim} !important; font-style: italic; }
  `;

  const containerStyle: React.CSSProperties = focusMode ? {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999, background: editorTokens.pageBg, overflow: 'auto',
  } : {
    background: editorTokens.pageBg,
    margin: '-20px', // compensate layout padding
    minHeight: 'calc(100vh - 56px)',
  };

  return (
    <div style={containerStyle}>
      <style>{previewStyles}</style>

      {/* Saved Toast (floating) */}
      {savedToast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10000,
          background: dark ? '#065F46' : '#D1FAE5',
          color: dark ? '#D1FAE5' : '#065F46',
          border: `1px solid ${dark ? '#10B981' : '#6EE7B7'}`,
          borderRadius: 10, padding: '10px 18px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          fontSize: 13, fontWeight: 700,
        }}>
          {savedToast}
        </div>
      )}

      {/* Sticky toolbar — edit page */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: editorTokens.toolbarBg,
        backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${editorTokens.toolbarBorder}`,
        padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flex: 1, minWidth: 200, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 16, fontWeight: 800, color: '#1B6B4A', letterSpacing: '-0.3px' }}>
            ✏️ Edit Artikel
          </h1>
          {originalStatus && STATUS_STYLE[originalStatus] && (
            <span style={{
              fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20,
              background: STATUS_STYLE[originalStatus].bg,
              color: STATUS_STYLE[originalStatus].color,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              {STATUS_STYLE[originalStatus].icon} {STATUS_STYLE[originalStatus].label}
            </span>
          )}
          <span style={{ fontSize: 11, color: t.textDim }}>
            {wordCount} kata · ~{readTime} mnt · {charCount} karakter
          </span>
        </div>

        {lastSaved && (
          <span style={{ fontSize: 11, color: editorTokens.successText, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            ✓ Auto-save {timeSince(lastSaved)}
          </span>
        )}

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => setShowPreview(p => !p)} title="Toggle preview"
            style={{ padding: '6px 12px', borderRadius: 8,
              border: `1px solid ${showPreview ? '#0891B2' : editorTokens.inputBorder}`,
              background: showPreview ? 'rgba(8,145,178,0.1)' : editorTokens.cardBg,
              color: showPreview ? '#0891B2' : t.textDim,
              fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            👁️ Preview
          </button>

          <button onClick={() => setFocusMode(f => !f)} title="Focus mode (Esc untuk keluar)"
            style={{ padding: '6px 12px', borderRadius: 8,
              border: `1px solid ${focusMode ? '#7C3AED' : editorTokens.inputBorder}`,
              background: focusMode ? 'rgba(124,58,237,0.12)' : editorTokens.cardBg,
              color: focusMode ? '#A78BFA' : t.textDim,
              fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            🔎 Focus {focusMode ? 'ON' : ''}
          </button>

          <button onClick={openHistoryModal} title="Version History"
            style={{ padding: '6px 12px', borderRadius: 8,
              border: `1px solid ${editorTokens.inputBorder}`, background: editorTokens.cardBg,
              color: t.textMuted, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            📜 History
          </button>

          <button onClick={() => router.push('/office/newsroom/bakabar/hub')}
            style={{ padding: '6px 12px', borderRadius: 8,
              border: `1px solid ${editorTokens.inputBorder}`, background: editorTokens.cardBg,
              color: t.textDim, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            ← Kembali
          </button>

          <button
            onClick={() => handleSave(false)}
            disabled={!canSubmit || loading}
            title="Cmd/Ctrl + S — Simpan dan tetap di halaman"
            style={{ padding: '6px 14px', borderRadius: 8,
              border: `1px solid ${editorTokens.inputBorder}`,
              background: editorTokens.cardBg,
              color: (canSubmit && !loading) ? t.textMuted : t.textDim,
              fontSize: 12, fontWeight: 700,
              cursor: (canSubmit && !loading) ? 'pointer' : 'not-allowed' }}>
            {loading ? 'Menyimpan...' : '💾 Simpan'}
          </button>

          <button
            onClick={() => handleSave(true)}
            disabled={!canSubmit || loading}
            title="Simpan dan kembali ke hub"
            style={{ padding: '6px 16px', borderRadius: 8, border: 'none',
              background: (canSubmit && !loading) ? '#1B6B4A' : (dark ? '#374151' : '#D1D5DB'),
              color: '#fff', fontSize: 12, fontWeight: 700,
              cursor: (canSubmit && !loading) ? 'pointer' : 'not-allowed',
              boxShadow: (canSubmit && !loading) ? '0 4px 10px rgba(27,107,74,0.3)' : 'none' }}>
            {loading ? '...' : '✓ Simpan & Selesai'}
          </button>
        </div>
      </div>

      {/* Status Transitions bar — conditional per role + status */}
      {user && originalStatus && (
        <div style={{
          background: editorTokens.cardBg,
          borderBottom: `1px solid ${editorTokens.toolbarBorder}`,
          padding: '8px 20px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 11, color: t.textDim, fontWeight: 600 }}>⚡ Ubah Status:</span>
          {canTransition(user.role, originalStatus, 'published') && (
            <button
              onClick={() => handleStatusChange('published')}
              disabled={transitioning !== null}
              style={{
                padding: '5px 12px', borderRadius: 7, border: 'none',
                background: '#10B981', color: '#fff',
                fontSize: 11, fontWeight: 700, cursor: transitioning ? 'not-allowed' : 'pointer',
                opacity: transitioning ? 0.6 : 1,
              }}>
              {transitioning === 'published' ? 'Publishing...' : (originalStatus === 'archived' ? '🔄 Pulihkan & Publish' : '✅ Publish')}
            </button>
          )}
          {canTransition(user.role, originalStatus, 'review') && (
            <button
              onClick={() => handleStatusChange('review')}
              disabled={transitioning !== null}
              style={{
                padding: '5px 12px', borderRadius: 7, border: '1px solid #0891B2',
                background: 'rgba(8,145,178,0.1)', color: '#0891B2',
                fontSize: 11, fontWeight: 700, cursor: transitioning ? 'not-allowed' : 'pointer',
                opacity: transitioning ? 0.6 : 1,
              }}>
              {transitioning === 'review' ? '...' : '🔍 Kirim Review'}
            </button>
          )}
          {canTransition(user.role, originalStatus, 'draft') && (
            <button
              onClick={() => handleStatusChange('draft')}
              disabled={transitioning !== null}
              style={{
                padding: '5px 12px', borderRadius: 7, border: `1px solid ${editorTokens.inputBorder}`,
                background: editorTokens.cardBg, color: t.textMuted,
                fontSize: 11, fontWeight: 700, cursor: transitioning ? 'not-allowed' : 'pointer',
                opacity: transitioning ? 0.6 : 1,
              }}>
              {transitioning === 'draft' ? '...' :
                (originalStatus === 'published' ? '↩️ Tarik ke Draft' :
                 originalStatus === 'review' ? '↩️ Kembalikan Draft' :
                 originalStatus === 'archived' ? '🔄 Pulihkan ke Draft' : '📝 Draft')}
            </button>
          )}
          {canTransition(user.role, originalStatus, 'archived') && (
            <button
              onClick={() => {
                if (!confirm('Arsipkan artikel ini? Artikel akan tidak tampil di public.')) return;
                handleStatusChange('archived');
              }}
              disabled={transitioning !== null}
              style={{
                padding: '5px 12px', borderRadius: 7, border: '1px solid #9CA3AF',
                background: 'rgba(107,114,128,0.1)', color: t.textMuted,
                fontSize: 11, fontWeight: 700, cursor: transitioning ? 'not-allowed' : 'pointer',
                opacity: transitioning ? 0.6 : 1,
                marginLeft: 'auto',
              }}>
              {transitioning === 'archived' ? 'Mengarsipkan...' : '🗂️ Archive'}
            </button>
          )}
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 20px', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
          <p style={{ color: editorTokens.errorText, fontSize: 13, fontWeight: 600 }}>✗ {error}</p>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: showPreview && !focusMode ? '1fr 1fr' : '1fr',
        gap: 0, minHeight: 'calc(100vh - 60px)',
      }}>

        {/* ── EDITOR ── */}
        <div style={{
          padding: '20px 28px', borderRight: showPreview && !focusMode ? `1px solid ${editorTokens.borderSubtle}` : 'none',
          maxWidth: showPreview && !focusMode ? 'none' : 820,
          margin: showPreview && !focusMode ? 0 : '0 auto', width: '100%',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Kategori — Opsi A: klik ulang untuk un-pilih (kategori opsional) */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: t.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                Kategori {category && <span style={{ color: t.textDim, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>· terpilih: <span style={{ color: t.textMuted, fontWeight: 600 }}>{CATEGORIES.find(c => c.key === category)?.label}</span></span>}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CATEGORIES.map(cat => {
                  const active = category === cat.key;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setCategory(active ? '' : cat.key)}
                      title={active ? 'Klik lagi untuk un-pilih' : `Pilih kategori ${cat.label}`}
                      style={{
                        padding: '6px 12px', borderRadius: 8, border: 'none',
                        cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        background: active ? cat.color : editorTokens.chipBg,
                        color: active ? '#fff' : editorTokens.chipText,
                        transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                      <span>{cat.icon}</span> {cat.label}
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: 10, color: t.textDim, marginTop: 6, fontStyle: 'italic' }}>
                💡 Kategori opsional — klik ulang kategori yang sama untuk un-pilih. Artikel tanpa kategori tetap muncul di feed "Terbaru".
              </p>
            </div>

            {/* Daerah — independen dari kategori, bisa dipilih keduanya */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: t.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                📍 Daerah {locationId && (
                  <span style={{ color: t.textDim, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                    · terpilih: <span style={{ color: t.textMuted, fontWeight: 600 }}>
                      {LOCATIONS.find(l => l.id === locationId)?.name}
                    </span>
                  </span>
                )}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {LOCATIONS.map(loc => {
                  const active = locationId === loc.id;
                  return (
                    <button
                      key={loc.id}
                      onClick={() => setLocationId(active ? '' : loc.id)}
                      title={active ? 'Klik lagi untuk un-pilih' : `Pilih daerah ${loc.name}`}
                      style={{
                        padding: '6px 12px', borderRadius: 8, border: 'none',
                        cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        background: active ? '#0891B2' : editorTokens.chipBg,
                        color: active ? '#fff' : editorTokens.chipText,
                        transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                      <span>{loc.icon}</span> {loc.name}
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: 10, color: t.textDim, marginTop: 6, fontStyle: 'italic' }}>
                📌 Daerah opsional & independen dari kategori — artikel bisa punya keduanya (misal: Politik + Ternate), salah satu, atau tidak keduanya.
              </p>
            </div>

            {/* Breaking & Trending — flags editorial, independent dari kategori */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 10,
              padding: 12, borderRadius: 10,
              background: editorTokens.cardBg, border: `1px solid ${editorTokens.inputBorder}`,
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: t.textMuted, fontWeight: 600 }}>
                <input type="checkbox" checked={isBreaking} onChange={(e) => setIsBreaking(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#EF4444' }} />
                <span>🔴 Tandai sebagai <span style={{ color: '#EF4444', fontWeight: 700 }}>Breaking News</span></span>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 13, color: t.textMuted, fontWeight: 600 }}>
                <input type="checkbox" checked={isTrending} onChange={(e) => setIsTrending(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#F97316', marginTop: 2 }} />
                <span style={{ flex: 1 }}>
                  🔥 Promote sebagai <span style={{ color: '#F97316', fontWeight: 700 }}>Trending</span>
                  <span style={{ display: 'block', fontSize: 10, color: t.textDim, fontWeight: 400, marginTop: 2, fontStyle: 'italic' }}>
                    Otomatis di-set kalau artikel banyak dibaca. Centang manual untuk promote artikel strategis
                    (breaking news penting, artikel investigasi, konten prioritas).
                  </span>
                </span>
              </label>
            </div>

            {/* Change note — edit-specific untuk version history log */}
            <div style={{ padding: 14, borderRadius: 10, border: `1px solid ${editorTokens.inputBorder}`, background: editorTokens.cardBg, marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                📝 Catatan Perubahan <span style={{ color: t.textDim, fontWeight: 400, textTransform: 'none' }}>(opsional)</span>
              </label>
              <input
                type="text"
                value={changeNote}
                onChange={e => setChangeNote(e.target.value)}
                placeholder="Contoh: Perbaiki typo, update data, koreksi kutipan..."
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: `1px solid ${editorTokens.inputBorder}`,
                  background: editorTokens.inputBg, color: t.textPrimary,
                  fontSize: 12, outline: 'none', boxSizing: 'border-box',
                }}
              />
              <p style={{ fontSize: 10, color: t.textDim, marginTop: 4, fontStyle: 'italic' }}>
                Catatan ini tercatat di version history untuk trace perubahan ke depan.
              </p>
            </div>

            {/* Viral source — soft hint, TIDAK memblokir submit (speed-to-publish) */}
            {isViral && (
              <div style={{ padding: 14, borderRadius: 10, border: `1px solid ${editorTokens.viralBorder}`, background: editorTokens.viralBg }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: editorTokens.viralText, marginBottom: 4 }}>
                  🔥 Kategori Viral — Angkat kejadian medsos ke BAKABAR secara cepat
                </p>
                <p style={{ fontSize: 10, color: editorTokens.viralText, opacity: 0.85, marginBottom: 10, lineHeight: 1.5 }}>
                  Sumber medsos <span style={{ fontWeight: 700 }}>sangat disarankan</span> untuk akuntabilitas jurnalistik.
                  Bisa di-skip kalau memang urgent, tapi idealnya diisi sebelum publish.
                </p>

                <label style={{ fontSize: 11, fontWeight: 700, color: editorTokens.viralText, display: 'block', marginBottom: 6 }}>
                  Platform <span style={{ color: '#DC2626', fontWeight: 700 }} title="Disarankan untuk artikel viral">*</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {PLATFORMS.map(p => (
                    <button key={p.key} onClick={() => setSourcePlatform(p.key)}
                      style={{
                        padding: '4px 10px', borderRadius: 6,
                        border: `1px solid ${editorTokens.viralBorder}`,
                        cursor: 'pointer', fontSize: 11, fontWeight: 600,
                        background: sourcePlatform === p.key ? '#F97316' : editorTokens.cardBg,
                        color: sourcePlatform === p.key ? '#fff' : editorTokens.viralText,
                      }}>
                      {p.label}
                    </button>
                  ))}
                </div>

                <label style={{ fontSize: 11, fontWeight: 700, color: editorTokens.viralText, display: 'block', marginBottom: 6 }}>
                  Link Postingan Asli <span style={{ color: '#DC2626', fontWeight: 700 }} title="Disarankan untuk artikel viral">*</span>
                </label>
                <input type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)}
                  placeholder="https://www.instagram.com/p/... atau link TikTok/Twitter/dll"
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    border: `1px solid ${editorTokens.viralBorder}`,
                    fontSize: 12, outline: 'none', boxSizing: 'border-box',
                    background: editorTokens.inputBg, color: t.textPrimary,
                  }} />
              </div>
            )}

            {/* Title */}
            <div>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Judul artikel..."
                maxLength={150}
                style={{
                  width: '100%', padding: '12px 0', borderWidth: '0 0 2px 0',
                  borderColor: editorTokens.inputBorder, borderStyle: 'solid',
                  fontSize: 24, fontWeight: 800, color: t.textPrimary,
                  outline: 'none', fontFamily: 'inherit', letterSpacing: '-0.5px',
                  background: 'transparent',
                }}
                onFocus={e => e.target.style.borderColor = '#1B6B4A'}
                onBlur={e => e.target.style.borderColor = editorTokens.inputBorder}
              />
              <p style={{ fontSize: 11, color: t.textDim, marginTop: 4, textAlign: 'right' }}>
                {title.length} / 150
              </p>
            </div>

            {/* Cover — ImageUpload pakai tailwind, background card mengikuti */}
            <div style={{
              padding: 14, borderRadius: 10,
              background: editorTokens.cardBg,
              border: `1px solid ${editorTokens.inputBorder}`,
            }}>
              <ImageUpload
                bucket="articles"
                label="Foto Cover"
                onUpload={(urls: string[]) => setCoverImageUrl(urls[0] ?? '')}
                existingUrls={coverImageUrl ? [coverImageUrl] : []}
              />
            </div>

            {/* Markdown toolbar */}
            <div style={{
              display: 'flex', gap: 4, padding: '6px 8px', borderRadius: 8,
              background: editorTokens.hintBg,
              border: `1px solid ${editorTokens.inputBorder}`,
              flexWrap: 'wrap',
            }}>
              {[
                { label: 'B',   title: 'Bold (Cmd+B)',    action: () => wrapSelection('**'),    style: { fontWeight: 800 } as React.CSSProperties },
                { label: 'I',   title: 'Italic (Cmd+I)',  action: () => wrapSelection('*'),     style: { fontStyle: 'italic' } as React.CSSProperties },
                { label: 'H2',  title: 'Heading 2',       action: () => prefixLine('## '),       style: {} },
                { label: 'H3',  title: 'Heading 3',       action: () => prefixLine('### '),      style: {} },
                { label: '❝',   title: 'Blockquote',      action: () => prefixLine('> '),        style: {} },
                { label: '• ',  title: 'List item',       action: () => prefixLine('- '),        style: {} },
                { label: '🔗',  title: 'Link',            action: insertLink,                     style: {} },
              ].map((btn, i) => (
                <button key={i} onClick={btn.action} title={btn.title}
                  style={{ padding: '4px 10px', borderRadius: 6, border: 'none',
                    background: 'transparent', color: t.textMuted,
                    fontSize: 13, cursor: 'pointer', minWidth: 28, ...btn.style,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = editorTokens.chipBg)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  {btn.label}
                </button>
              ))}

              {/* Tombol foto inline — terpisah karena butuh loading state */}
              <button
                onClick={insertImageInline}
                disabled={uploadingInline}
                title="Sisipkan foto di tengah artikel"
                style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none',
                  background: uploadingInline ? 'rgba(27,107,74,0.15)' : 'transparent',
                  color: uploadingInline ? '#1B6B4A' : t.textMuted,
                  fontSize: 13, cursor: uploadingInline ? 'wait' : 'pointer',
                  fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4,
                }}
                onMouseEnter={e => !uploadingInline && (e.currentTarget.style.background = editorTokens.chipBg)}
                onMouseLeave={e => !uploadingInline && (e.currentTarget.style.background = 'transparent')}>
                {uploadingInline ? '⏳ Upload...' : '📷 Foto'}
              </button>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 10, color: t.textDim, alignSelf: 'center', padding: '0 6px' }}>
                **bold** · *italic* · # heading · &gt; quote · - list · ![caption](url)
              </span>
            </div>

            {inlineError && (
              <p style={{ fontSize: 12, color: editorTokens.errorText, fontWeight: 600, marginTop: -10 }}>
                ✗ {inlineError}
              </p>
            )}

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
                border: `1px solid ${editorTokens.inputBorder}`,
                fontSize: 15, lineHeight: 1.75,
                outline: 'none', boxSizing: 'border-box', resize: 'vertical',
                color: t.textPrimary, fontFamily: 'inherit',
                background: editorTokens.inputBg,
                minHeight: focusMode ? 500 : 380,
              }}
              onFocus={e => e.target.style.borderColor = '#1B6B4A'}
              onBlur={e => e.target.style.borderColor = editorTokens.inputBorder}
            />
          </div>
        </div>

        {/* ── PREVIEW ── */}
        {showPreview && !focusMode && (
          <div style={{
            padding: '20px 28px', background: editorTokens.previewBg,
            borderLeft: `1px solid ${editorTokens.borderSubtle}`,
            maxHeight: 'calc(100vh - 60px)', overflowY: 'auto',
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: t.textDim,
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 6 }}>
              👁️ Live Preview <span style={{ color: t.textDim, fontWeight: 400 }}>— tampilan kurang lebih seperti di publik</span>
            </p>

            <article style={{
              background: editorTokens.previewCard,
              borderRadius: 14, padding: 28,
              border: `1px solid ${editorTokens.borderSubtle}`,
              boxShadow: dark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              {coverImageUrl && (
                <div style={{
                  width: '100%', marginBottom: 18, borderRadius: 10, overflow: 'hidden',
                  background: dark ? '#0A0D11' : '#F3F4F6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  maxHeight: 500,
                }}>
                  <img src={coverImageUrl} alt="cover"
                    style={{
                      width: '100%', height: 'auto', maxHeight: 500,
                      objectFit: 'contain', display: 'block',
                    }} />
                </div>
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
                {isTrending && (
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, background: '#F97316',
                    color: '#fff', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  }}>🔥 Trending</span>
                )}
                {locationId && (() => {
                  const loc = LOCATIONS.find(l => l.id === locationId);
                  return loc ? (
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, background: '#0891B2',
                      color: '#fff', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>📍 {loc.name}</span>
                  ) : null;
                })()}
                <span style={{ fontSize: 11, color: t.textDim }}>
                  oleh {user.name || 'Admin'} · {wordCount} kata · ~{readTime} mnt
                </span>
              </div>

              <div className="bk-preview">
                {title ? (
                  <h1>{title}</h1>
                ) : (
                  <h1 className="bk-placeholder">Judul artikel...</h1>
                )}

                {body ? (
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
                ) : (
                  <p className="bk-placeholder">
                    Isi artikel akan tampil di sini saat kamu mengetik...
                  </p>
                )}
              </div>

              {isViral && sourceUrl && (
                <div style={{
                  marginTop: 20, padding: '10px 14px', borderRadius: 8,
                  background: editorTokens.viralBg,
                  border: `1px solid ${editorTokens.viralBorder}`,
                  fontSize: 12, color: editorTokens.viralText,
                }}>
                  📎 Sumber: <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
                    style={{ color: '#F97316', textDecoration: 'underline' }}>
                    {sourcePlatform || 'link'}
                  </a>
                </div>
              )}
            </article>
          </div>
        )}
      </div>

      {/* Focus mode hint */}
      {focusMode && (
        <div style={{
          position: 'fixed', bottom: 12, left: '50%', transform: 'translateX(-50%)',
          background: dark ? '#1F2937' : '#111827',
          color: '#E5E7EB',
          fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 20,
          display: 'flex', gap: 10, zIndex: 10001,
          border: dark ? '1px solid #374151' : 'none',
        }}>
          <span>Cmd+B bold</span><span>·</span>
          <span>Cmd+I italic</span><span>·</span>
          <span>Cmd+S simpan</span><span>·</span>
          <span>Esc keluar focus</span>
        </div>
      )}

      {/* Version History Modal */}
      {showHistory && (
        <div
          onClick={() => setShowHistory(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9998, padding: 20,
          }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: editorTokens.cardBg, borderRadius: 14, padding: 22,
              maxWidth: 560, width: '100%', maxHeight: '80vh', overflowY: 'auto',
              border: `1px solid ${editorTokens.inputBorder}`,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: t.textPrimary }}>📜 Version History</h3>
              <button
                onClick={() => setShowHistory(false)}
                style={{
                  background: 'transparent', border: 'none', fontSize: 18, color: t.textDim, cursor: 'pointer',
                }}>×</button>
            </div>

            {loadingVersions ? (
              <div style={{ padding: 40, textAlign: 'center', color: t.textDim }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  border: `3px solid ${t.accent}`, borderTopColor: 'transparent',
                  animation: 'spin 0.8s linear infinite', margin: '0 auto 8px',
                }} />
                <p style={{ fontSize: 12 }}>Memuat history...</p>
              </div>
            ) : versions.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <p style={{ fontSize: 28, marginBottom: 8 }}>📭</p>
                <p style={{ fontSize: 12, color: t.textDim }}>Belum ada version history.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {versions.map((v, idx) => (
                  <div
                    key={v.id || v.version_number}
                    style={{
                      padding: 12, borderRadius: 10,
                      border: `1px solid ${editorTokens.inputBorder}`,
                      background: idx === 0 ? 'rgba(27,107,74,0.04)' : 'transparent',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
                          background: idx === 0 ? t.accent : 'rgba(107,114,128,0.12)',
                          color: idx === 0 ? '#fff' : t.textDim,
                        }}>
                          v{v.version_number}{idx === 0 ? ' (terbaru)' : ''}
                        </span>
                        <span style={{ fontSize: 11, color: t.textDim }}>
                          {v.edited_by_name || 'Unknown'} · {timeSince(new Date(v.created_at))}
                        </span>
                      </div>
                      {idx !== 0 && (
                        <button
                          onClick={() => setRestoreTarget(v)}
                          style={{
                            padding: '4px 10px', borderRadius: 6, border: 'none',
                            background: '#1B6B4A', color: '#fff', fontSize: 11, fontWeight: 700,
                            cursor: 'pointer',
                          }}>
                          Restore
                        </button>
                      )}
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 2 }}>
                      {v.title}
                    </p>
                    {v.change_note && (
                      <p style={{ fontSize: 11, color: t.textDim, fontStyle: 'italic' }}>
                        "{v.change_note}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Restore Version Confirm Modal */}
      {restoreTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 20,
        }}>
          <div style={{
            background: editorTokens.cardBg, borderRadius: 14, padding: 22,
            maxWidth: 440, width: '100%',
            border: `1px solid ${editorTokens.inputBorder}`,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 22 }}>↻</span>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: t.textPrimary }}>
                Restore Versi {restoreTarget.version_number}?
              </h3>
            </div>
            <p style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.6, marginBottom: 14 }}>
              Konten editor akan diganti dengan versi <strong>v{restoreTarget.version_number}</strong>.
              Perubahan yang belum disimpan akan hilang. Kamu masih harus klik <strong>Simpan</strong>
              untuk konfirmasi restore.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setRestoreTarget(null)}
                disabled={restoring}
                style={{
                  flex: 1, padding: '9px', borderRadius: 8,
                  border: `1px solid ${editorTokens.inputBorder}`,
                  background: editorTokens.cardBg, color: t.textMuted,
                  fontSize: 12, fontWeight: 600, cursor: restoring ? 'not-allowed' : 'pointer',
                }}>
                Batal
              </button>
              <button
                onClick={handleRestoreVersion}
                disabled={restoring}
                style={{
                  flex: 1, padding: '9px', borderRadius: 8, border: 'none',
                  background: restoring ? '#9CA3AF' : '#1B6B4A', color: '#fff',
                  fontSize: 12, fontWeight: 700, cursor: restoring ? 'not-allowed' : 'pointer',
                }}>
                {restoring ? 'Memuat...' : 'Ya, Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
