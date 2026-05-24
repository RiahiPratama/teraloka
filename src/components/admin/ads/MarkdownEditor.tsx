'use client';

// ════════════════════════════════════════════════════════════════
// TeraLoka — MarkdownEditor (Shared)
// PATH: src/components/ui/MarkdownEditor.tsx
// ────────────────────────────────────────────────────────────────
// SESI 7 (22 Mei 2026) — Extract dari BAKABAR editor pattern, reusable
// untuk BAKABAR + Advertorial + future writing surfaces.
//
// FEATURES:
//   ✅ Toolbar: H1/H2/H3, Bold, Italic, Quote, List, Link, Image upload
//   ✅ Inline image upload langsung ke Supabase Storage (custom bucket)
//   ✅ Insert markdown syntax di posisi cursor (wrapSelection/prefixLine)
//   ✅ Live preview toggle (Tulis / Preview tab)
//   ✅ Character counter + min/max validation visual
//   ✅ Keyboard shortcuts (Cmd+B bold, Cmd+I italic, Cmd+K link)
//   ✅ Disabled state untuk loading/read-only
//
// USAGE:
//   <MarkdownEditor
//     value={state.body}
//     onChange={(v) => setField('body', v)}
//     bucket="ad-content"
//     placeholder="Tulis artikel di sini..."
//     minLength={100}
//     maxLength={15000}
//     minRows={12}
//   />
//
// Patterns: DRY (BAKABAR + Advertorial share), KEKE-2 (admin power user
//           toolbar), defense in depth (MIME + size + ext validate stacked).
// ════════════════════════════════════════════════════════════════

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Bold, Italic, Heading1, Heading2, Heading3,
  Quote, List, Link as LinkIcon, ImagePlus, Eye, Pencil,
  Loader2, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { renderMarkdown } from '@/lib/ads/markdown';
import { createClient } from '@/lib/supabase/client';

// ─── Constants ──────────────────────────────────────────────────

const INLINE_IMAGE_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const INLINE_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const INLINE_IMAGE_EXTS  = ['jpg', 'jpeg', 'png', 'webp'] as const;

// ─── Props ──────────────────────────────────────────────────────

export interface MarkdownEditorProps {
  value:          string;
  onChange:       (value: string) => void;
  /** Supabase Storage bucket name untuk inline image upload */
  bucket:         string;
  placeholder?:   string;
  minLength?:     number;
  maxLength?:     number;
  minRows?:       number;
  disabled?:      boolean;
  /** Error message dari parent untuk display */
  errorMessage?:  string | null;
  /** Folder prefix di bucket untuk organize uploads (e.g. advertiserId, articleId) */
  folderPrefix?:  string;
}

// ─── Component ──────────────────────────────────────────────────

export default function MarkdownEditor({
  value,
  onChange,
  bucket,
  placeholder = 'Tulis di sini... Gunakan toolbar atau markdown:\n\n# Judul\n## Subjudul\n**tebal** *miring*\n- list item\n> kutipan\n[link](url)\n![alt](url) untuk gambar',
  minLength,
  maxLength,
  minRows = 10,
  disabled = false,
  errorMessage,
  folderPrefix,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [uploadingInline, setUploadingInline] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Length validation states
  const length = value.length;
  const tooShort = minLength !== undefined && length < minLength;
  const tooLong  = maxLength !== undefined && length > maxLength;

  // ─── Markdown insertion helpers ───────────────────────────────

  const wrapSelection = useCallback((before: string, after: string = before) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const selected = value.slice(start, end);
    const newText = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  }, [value, onChange]);

  const prefixLine = useCallback((prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const newText = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  }, [value, onChange]);

  const insertLink = useCallback(() => {
    const url = window.prompt('URL link:');
    if (!url) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const start    = ta.selectionStart;
    const end      = ta.selectionEnd;
    const selected = value.slice(start, end) || 'teks link';
    const md = `[${selected}](${url})`;
    onChange(value.slice(0, start) + md + value.slice(end));
    setTimeout(() => ta.focus(), 0);
  }, [value, onChange]);

  // ─── Inline image upload ──────────────────────────────────────

  const insertImageInline = useCallback(() => {
    setInlineError(null);
    const fi = document.createElement('input');
    fi.type   = 'file';
    fi.accept = INLINE_IMAGE_MIMES.join(',');
    fi.onchange = async (e: any) => {
      const file: File | undefined = e.target.files?.[0];
      if (!file) return;

      // Validation: MIME
      if (!(INLINE_IMAGE_MIMES as readonly string[]).includes(file.type)) {
        setInlineError('Format foto harus JPG, PNG, atau WebP');
        return;
      }
      // Validation: ext (defense in depth)
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !(INLINE_IMAGE_EXTS as readonly string[]).includes(ext)) {
        setInlineError(`Extension tidak didukung. Pakai: ${INLINE_IMAGE_EXTS.join(', ')}`);
        return;
      }
      // Validation: size
      if (file.size > INLINE_IMAGE_MAX_BYTES) {
        const mb = (file.size / 1024 / 1024).toFixed(2);
        setInlineError(`Ukuran foto inline maksimal 2MB (file ${mb}MB)`);
        return;
      }

      setUploadingInline(true);
      try {
        const supabase = createClient();
        const folder   = folderPrefix ?? 'inline';
        const fileName = `${folder}/inline-${Date.now()}-${Math.random().toString(36).slice(-6)}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, {
            cacheControl: '31536000',
            upsert:       false,
            contentType:  file.type,
          });
        if (uploadErr) {
          throw new Error(`Upload gagal: ${uploadErr.message}`);
        }

        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
        const publicUrl = urlData.publicUrl;
        if (!publicUrl) throw new Error('Gagal dapat public URL');

        // Insert markdown ke posisi cursor — ![](url) (no alt by default, admin bisa edit)
        const ta = textareaRef.current;
        const md = `\n\n![](${publicUrl})\n\n`;
        if (ta) {
          const start = ta.selectionStart;
          const newText = value.slice(0, start) + md + value.slice(start);
          onChange(newText);
          setTimeout(() => {
            ta.focus();
            // Posisikan cursor di antara [ ] untuk admin langsung type alt text
            const altPos = start + 3; // setelah "\n\n!["
            ta.setSelectionRange(altPos, altPos);
          }, 0);
        } else {
          onChange(value + md);
        }
      } catch (err: any) {
        setInlineError(err?.message ?? String(err));
      } finally {
        setUploadingInline(false);
      }
    };
    fi.click();
  }, [bucket, folderPrefix, value, onChange]);

  // ─── Keyboard shortcuts ───────────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    if (e.key === 'b' || e.key === 'B') {
      e.preventDefault();
      wrapSelection('**');
    } else if (e.key === 'i' || e.key === 'I') {
      e.preventDefault();
      wrapSelection('*');
    } else if (e.key === 'k' || e.key === 'K') {
      e.preventDefault();
      insertLink();
    }
  }, [wrapSelection, insertLink]);

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className={cn(
      'rounded-lg border overflow-hidden bg-surface',
      tooShort || tooLong || errorMessage
        ? 'border-status-critical/40'
        : 'border-border'
    )}>
      {/* ── Phase 7 Markdown Preview Scoped Styling ── */}
      <style jsx>{`
        :global(.markdown-preview h1) {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 1rem 0 0.75rem;
          line-height: 1.3;
        }
        :global(.markdown-preview h2) {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0.875rem 0 0.625rem;
          line-height: 1.35;
        }
        :global(.markdown-preview h3) {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0.75rem 0 0.5rem;
          line-height: 1.4;
        }
        :global(.markdown-preview p) {
          margin: 0.5rem 0;
        }
        :global(.markdown-preview strong) {
          font-weight: 700;
        }
        :global(.markdown-preview em) {
          font-style: italic;
        }
        :global(.markdown-preview blockquote) {
          border-left: 3px solid var(--color-ads, #f59e0b);
          padding-left: 0.875rem;
          margin: 0.75rem 0;
          font-style: italic;
          opacity: 0.85;
        }
        :global(.markdown-preview ul) {
          list-style: disc;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        :global(.markdown-preview ol) {
          list-style: decimal;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        :global(.markdown-preview li) {
          margin: 0.25rem 0;
        }
        :global(.markdown-preview a) {
          color: var(--color-ads, #f59e0b);
          text-decoration: underline;
        }
        :global(.markdown-preview img) {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 0.75rem 0;
          display: block;
        }
        :global(.markdown-preview figure) {
          margin: 1rem 0;
        }
        :global(.markdown-preview figcaption) {
          font-size: 0.75rem;
          text-align: center;
          opacity: 0.7;
          margin-top: 0.25rem;
          font-style: italic;
        }
      `}</style>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-surface-soft">
        {/* Mode toggle */}
        <div className="flex items-center gap-0.5 mr-2 border-r border-border pr-2">
          <button
            type="button"
            onClick={() => setMode('edit')}
            disabled={disabled}
            className={cn(
              'flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded transition',
              mode === 'edit'
                ? 'bg-ads/15 text-ads'
                : 'text-text-muted hover:bg-surface-hover'
            )}
          >
            <Pencil className="w-3 h-3" />
            Tulis
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            disabled={disabled}
            className={cn(
              'flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded transition',
              mode === 'preview'
                ? 'bg-ads/15 text-ads'
                : 'text-text-muted hover:bg-surface-hover'
            )}
          >
            <Eye className="w-3 h-3" />
            Preview
          </button>
        </div>

        {/* Format buttons */}
        <ToolbarBtn onClick={() => prefixLine('# ')}  title="Heading 1"     disabled={disabled || mode === 'preview'}>
          <Heading1 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => prefixLine('## ')} title="Heading 2"     disabled={disabled || mode === 'preview'}>
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => prefixLine('### ')} title="Heading 3"    disabled={disabled || mode === 'preview'}>
          <Heading3 className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <div className="w-px h-4 bg-border mx-0.5" />

        <ToolbarBtn onClick={() => wrapSelection('**')} title="Bold (Cmd+B)"   disabled={disabled || mode === 'preview'}>
          <Bold className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => wrapSelection('*')}  title="Italic (Cmd+I)" disabled={disabled || mode === 'preview'}>
          <Italic className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <div className="w-px h-4 bg-border mx-0.5" />

        <ToolbarBtn onClick={() => prefixLine('> ')} title="Kutipan"      disabled={disabled || mode === 'preview'}>
          <Quote className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => prefixLine('- ')} title="List"         disabled={disabled || mode === 'preview'}>
          <List className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={insertLink}             title="Link (Cmd+K)" disabled={disabled || mode === 'preview'}>
          <LinkIcon className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <div className="w-px h-4 bg-border mx-0.5" />

        <ToolbarBtn
          onClick={insertImageInline}
          title="Tambah gambar inline"
          disabled={disabled || mode === 'preview' || uploadingInline}
          variant="primary"
        >
          {uploadingInline ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ImagePlus className="w-3.5 h-3.5" />
          )}
          <span className="text-[10px] font-bold ml-1">
            {uploadingInline ? 'Upload...' : 'Gambar'}
          </span>
        </ToolbarBtn>
      </div>

      {/* ── Editor area ── */}
      {mode === 'edit' ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={minRows}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            'w-full px-3 py-3 bg-surface text-[13px] text-text leading-relaxed',
            'placeholder:text-text-subtle resize-y',
            'focus:outline-none transition-all font-mono',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        />
      ) : (
        <div
          className="px-4 py-3 min-h-[200px] bg-surface text-[13px] leading-relaxed text-text overflow-y-auto"
          style={{
            // Phase 7 markdown preview styling
            // Explicit color biar visible di dark mode tanpa rely Tailwind Typography
          }}
        >
          {value.trim() ? (
            <div
              className="markdown-preview"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
            />
          ) : (
            <p className="italic" style={{ color: 'var(--color-text-subtle, #9ca3af)' }}>
              Belum ada konten. Klik tab Tulis untuk mulai.
            </p>
          )}
        </div>
      )}

      {/* ── Error inline (upload image) ── */}
      {inlineError && (
        <div className="flex items-start gap-1.5 px-3 py-2 bg-status-critical/10 border-t border-status-critical/30">
          <AlertCircle className="w-3.5 h-3.5 text-status-critical flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-status-critical">{inlineError}</p>
        </div>
      )}

      {/* ── Footer: counter + hint ── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-surface-soft">
        <p className="text-[10px] text-text-subtle">
          Markdown: <code className="bg-surface px-1 rounded">**bold**</code>{' '}
          <code className="bg-surface px-1 rounded">*italic*</code>{' '}
          <code className="bg-surface px-1 rounded"># judul</code>{' '}
          atau pakai toolbar
        </p>
        {(minLength !== undefined || maxLength !== undefined) && (
          <p className={cn(
            'text-[10px] tabular-nums font-mono',
            tooShort || tooLong ? 'text-status-critical font-bold' : 'text-text-subtle'
          )}>
            {length}
            {maxLength !== undefined && ` / ${maxLength}`}
            {tooShort && minLength !== undefined && (
              <span className="ml-1">(min {minLength})</span>
            )}
          </p>
        )}
      </div>

      {/* ── External error from parent ── */}
      {errorMessage && (
        <div className="flex items-start gap-1.5 px-3 py-2 bg-status-critical/10 border-t border-status-critical/30">
          <AlertCircle className="w-3.5 h-3.5 text-status-critical flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-status-critical">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}

// ─── Sub-component: Toolbar button ────────────────────────────────

function ToolbarBtn({
  onClick, title, disabled, children, variant,
}: {
  onClick:    () => void;
  title:      string;
  disabled?:  boolean;
  children:   React.ReactNode;
  variant?:   'default' | 'primary';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn(
        'flex items-center px-1.5 py-1 rounded transition',
        variant === 'primary'
          ? 'bg-ads text-white hover:bg-ads/90 disabled:bg-ads/40 disabled:cursor-not-allowed'
          : 'text-text-muted hover:bg-surface-hover hover:text-text disabled:opacity-30 disabled:cursor-not-allowed'
      )}
    >
      {children}
    </button>
  );
}
