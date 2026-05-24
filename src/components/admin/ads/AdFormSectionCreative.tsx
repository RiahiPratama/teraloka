'use client';

/**
 * TeraLoka — AdFormSectionCreative
 * Mission 8 Sub-Phase 8-B (α / Batch 1)
 * ------------------------------------------------------------
 * Section 2 form: Konten Kreatif.
 * Fields:
 *   - ad_format (radio: image / text)
 *   - title (required)
 *   - body (textarea, required kalau ad_format=text)
 *   - image_url (ImageUpload, required kalau ad_format=image)
 *   - link_url (required)
 *   - disclaimer_text (required kalau advertiser_type=politisi & ad_format=text)
 *   - slug (auto-generate dari title, editable manual)
 */

import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Check,
  Image as ImageIcon,
  FileText,
  AlertTriangle,
  Link as LinkIcon,
  Sparkles,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
// SESI 5E Phase 3b: ImageUpload removed — Default upload UI hidden, per-posisi via Modal
// SESI 7 (22 Mei 2026): Re-introduce ImageUpload untuk Advertorial cover image
import ImageUpload from '@/components/ui/ImageUpload';
// SESI 7 — Rich text editor untuk Advertorial body (BAKABAR-style markdown)
import MarkdownEditor from '@/components/admin/ads/MarkdownEditor';
import { useAdForm } from './AdFormProvider';
// SESI 5E Phase 3b: getPositionMetadata removed — MultiImageSection eliminated
// SESI 5H Phase 5A.7 (21 Mei 2026): AdFormSectionAnimation DEPRECATED.
// Animation config moved to PositionCreativeModal (per-position tab "Animated").

// Simple slugify (mirror slugifyTitle backend pattern)
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export default function AdFormSectionCreative() {
  const { state, setField, errorFor } = useAdForm();
  const [expanded, setExpanded] = useState(true);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Auto-generate slug dari title (kalau slug belum di-edit manual)
  useEffect(() => {
    if (state.ad_format === 'text' && !slugManuallyEdited && state.title) {
      const auto = slugify(state.title);
      if (state.slug !== auto) {
        setField('slug', auto);
      }
    }
  }, [state.title, state.ad_format, slugManuallyEdited, state.slug, setField]);

  const titleError       = errorFor('title');
  const bodyError        = errorFor('body');
  // SESI 5E Phase 3b: imageError removed — image_url upload UI hidden
  const linkError        = errorFor('link_url');
  const disclaimerError  = errorFor('disclaimer_text');

  const isComplete =
    state.title.trim().length > 0 &&
    state.link_url.trim().length > 0 &&
    (state.ad_format === 'image'
      ? true  // SESI 5E Phase 3b: per-position validation di AdFormProvider, section dianggap complete
      : state.body.trim().length >= 100);

  const isPolitisi = state.advertiser_type === 'politisi';
  const needsDisclaimer = isPolitisi && state.ad_format === 'text';

  return (
    <section className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-surface-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-bakabar/12 text-bakabar shrink-0">
            <FileText size={16} />
          </div>
          <div className="min-w-0 text-left">
            <h3 className="text-[13px] font-bold text-text uppercase tracking-wider">
              2. Konten Kreatif
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              Apa yang ditampilkan + di mana link-nya menuju
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isComplete && (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-status-healthy/12 text-status-healthy">
              <Check size={12} />
            </span>
          )}
          {expanded ? (
            <ChevronUp size={16} className="text-text-muted" />
          ) : (
            <ChevronDown size={16} className="text-text-muted" />
          )}
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-4 border-t border-border">
          {/* Ad format picker */}
          <div className="pt-4">
            <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
              Format Iklan <span className="text-status-critical">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label
                className={cn(
                  'flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors',
                  state.ad_format === 'image'
                    ? 'bg-bakabar/8 border-bakabar/40'
                    : 'bg-surface border-border hover:bg-surface-muted'
                )}
              >
                <input
                  type="radio"
                  name="ad_format"
                  checked={state.ad_format === 'image'}
                  onChange={() => setField('ad_format', 'image')}
                  className="accent-bakabar mt-0.5 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon size={12} className="text-bakabar" />
                    <span className="text-[12px] font-bold text-text">Image</span>
                  </div>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    Banner/native dengan gambar — paling umum
                  </p>
                </div>
              </label>

              <label
                className={cn(
                  'flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors',
                  state.ad_format === 'text'
                    ? 'bg-bakabar/8 border-bakabar/40'
                    : 'bg-surface border-border hover:bg-surface-muted'
                )}
              >
                <input
                  type="radio"
                  name="ad_format"
                  checked={state.ad_format === 'text'}
                  onChange={() => setField('ad_format', 'text')}
                  className="accent-bakabar mt-0.5 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <FileText size={12} className="text-bakabar" />
                    <span className="text-[12px] font-bold text-text">Advertorial</span>
                  </div>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    Artikel sponsored 100-5000 karakter
                  </p>
                </div>
              </label>

              {/* SESI 5H Phase 5A.7: 3rd radio — Animated Banner (GSAP per-position) */}
              <label
                className={cn(
                  'flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors',
                  state.ad_format === 'animated'
                    ? 'bg-purple-100 border-purple-400 dark:bg-purple-900/30 dark:border-purple-700'
                    : 'bg-surface border-border hover:bg-surface-muted'
                )}
              >
                <input
                  type="radio"
                  name="ad_format"
                  checked={state.ad_format === 'animated'}
                  onChange={() => setField('ad_format', 'animated')}
                  className="accent-purple-600 mt-0.5 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={12} className="text-purple-600 dark:text-purple-400" />
                    <span className="text-[12px] font-bold text-text">Animated</span>
                  </div>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    GSAP per-posisi — premium tier
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-1.5">
              Judul Iklan <span className="text-status-critical">*</span>
            </label>
            <input
              type="text"
              value={state.title}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="Contoh: KPR Ringan Bunga 4.75% per Tahun"
              maxLength={120}
              className={cn(
                'w-full px-3 py-2 rounded-lg bg-surface border text-[13px] text-text',
                'placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-ads/20 transition-all',
                titleError
                  ? 'border-status-critical/40 focus:border-status-critical/60'
                  : 'border-border focus:border-ads/50'
              )}
            />
            <div className="flex items-center justify-between mt-1">
              {titleError ? (
                <p className="text-[10px] text-status-critical">{titleError}</p>
              ) : (
                <span />
              )}
              <p className="text-[10px] text-text-subtle">{state.title.length}/120</p>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════
              SESI 7 (22 Mei 2026) — Advertorial Cover Image + Caption
              Cover photo di atas headline saat artikel di-render publik.
              image_url field di-reuse (existing kolom, no migration).
              ════════════════════════════════════════════════════════ */}
          {state.ad_format === 'text' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-1.5">
                Foto Depan (Cover) <span className="text-text-subtle">— tampil di atas artikel</span>
              </label>
              <ImageUpload
                bucket="ad-content"
                onUpload={(urls: string[]) => setField('image_url', urls[0] ?? '')}
                existingUrls={state.image_url ? [state.image_url] : []}
                maxFiles={1}
              />
              {state.image_url && (
                <div className="mt-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-text-muted mb-1">
                    Caption Foto <span className="text-text-subtle font-normal">(opsional — credit photographer, sumber, dll)</span>
                  </label>
                  <input
                    type="text"
                    value={state.cover_image_caption ?? ''}
                    onChange={(e) => setField('cover_image_caption', e.target.value.slice(0, 200))}
                    maxLength={200}
                    placeholder="contoh: Dok. Pemda Ternate · Foto: Antara/Andika"
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-[12px] text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-ads/20 focus:border-ads/50 transition-all"
                  />
                  <p className="text-[10px] text-text-subtle mt-0.5 text-right">
                    {(state.cover_image_caption ?? '').length}/200
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Body (advertorial only) */}
          {state.ad_format === 'text' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-1.5">
                Body Advertorial <span className="text-status-critical">*</span>
              </label>
              {/* SESI 7 (22 Mei 2026): Replace plain textarea dengan MarkdownEditor.
                  Markdown support: # H1-H3, **bold**, *italic*, > quote, - list,
                  [link](url), ![alt](url) gambar. Inline image upload via toolbar
                  langsung ke bucket 'ad-content'. */}
              <MarkdownEditor
                value={state.body}
                onChange={(v) => setField('body', v)}
                bucket="ad-content"
                folderPrefix={state.advertiser_account_id ?? 'misc'}
                placeholder="Tulis artikel sponsored di sini. Gunakan toolbar untuk format teks atau tambah gambar inline.

# Judul Bagian
Paragraf pembuka yang menarik perhatian pembaca...

## Subjudul
Konten utama dengan **bold** dan *italic*.

- Poin penting 1
- Poin penting 2

> Kutipan testimoni atau quote menarik.

![alt text gambar](otomatis-terisi-saat-upload)"
                minLength={100}
                maxLength={15000}
                minRows={14}
                errorMessage={bodyError}
              />
            </div>
          )}

          {/* Slug (advertorial only, auto-generated) */}
          {state.ad_format === 'text' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-1.5">
                URL Slug <span className="text-text-subtle">(auto-generate)</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-text-muted shrink-0 font-mono">
                  /sponsored/
                </span>
                <input
                  type="text"
                  value={state.slug}
                  onChange={(e) => {
                    setSlugManuallyEdited(true);
                    setField('slug', slugify(e.target.value));
                  }}
                  placeholder="contoh-slug-iklan"
                  className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-[12px] text-text font-mono focus:outline-none focus:ring-2 focus:ring-ads/20 focus:border-ads/50 transition-all"
                />
              </div>
              <p className="text-[10px] text-text-subtle mt-1">
                Otomatis dari judul. Edit kalau perlu URL custom.
              </p>
            </div>
          )}

          {/* SESI 5E Phase 3b: Default Image Upload UI HIDDEN.
              Per-position upload udah dihandle di Modal Targeting cards.
              state.image_url tetap ada di state untuk backward compat (legacy ads).
              Info banner inform admin untuk upload via Targeting modal. */}
          {state.ad_format === 'image' && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-ads/5 border border-ads/30">
              <ImageIcon size={14} className="text-ads shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-text">
                  Banner Iklan di-upload per posisi
                </p>
                <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">
                  Centang posisi tayang di section <strong>Targeting</strong> di bawah,
                  lalu klik <strong>+ Upload Banner</strong> di posisi yang dipilih.
                  Setiap posisi bisa punya banner sendiri (static atau DCA rotate).
                </p>
              </div>
            </div>
          )}

          {/* Link URL */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-1.5">
              Link Tujuan <span className="text-status-critical">*</span>
            </label>
            <div className="relative">
              <LinkIcon
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
              <input
                type="url"
                value={state.link_url}
                onChange={(e) => setField('link_url', e.target.value)}
                placeholder="https://contoh.com/halaman-tujuan"
                className={cn(
                  'w-full pl-9 pr-3 py-2 rounded-lg bg-surface border text-[12px] text-text',
                  'placeholder:text-text-subtle font-mono',
                  'focus:outline-none focus:ring-2 focus:ring-ads/20 transition-all',
                  linkError
                    ? 'border-status-critical/40 focus:border-status-critical/60'
                    : 'border-border focus:border-ads/50'
                )}
              />
            </div>
            {linkError && (
              <p className="text-[10px] text-status-critical mt-1">{linkError}</p>
            )}
            <p className="text-[10px] text-text-subtle mt-1">
              URL yang dibuka saat pembaca klik iklan
            </p>
          </div>

          {/* KPU Disclaimer (politisi + text) */}
          {needsDisclaimer && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-1.5">
                Disclaimer KPU <span className="text-status-critical">*</span>
              </label>
              <div className="mb-2 flex items-start gap-2 p-2.5 rounded-lg bg-status-warning/8 border border-status-warning/30">
                <AlertTriangle
                  size={12}
                  className="text-status-warning shrink-0 mt-0.5"
                />
                <p className="text-[10px] text-status-warning leading-relaxed">
                  Wajib untuk iklan politisi (UU Pemilu). Contoh: <em>&quot;Iklan ini
                  didanai oleh tim kampanye [Nama Caleg]&quot;</em>
                </p>
              </div>
              <textarea
                value={state.disclaimer_text}
                onChange={(e) => setField('disclaimer_text', e.target.value)}
                rows={2}
                placeholder="Tulis disclaimer KPU di sini"
                className={cn(
                  'w-full px-3 py-2 rounded-lg bg-surface border text-[12px] text-text',
                  'placeholder:text-text-subtle resize-y',
                  'focus:outline-none focus:ring-2 focus:ring-status-warning/20 transition-all',
                  disclaimerError
                    ? 'border-status-critical/40 focus:border-status-critical/60'
                    : 'border-border focus:border-status-warning/50'
                )}
              />
              {disclaimerError && (
                <p className="text-[10px] text-status-critical mt-1">
                  {disclaimerError}
                </p>
              )}
            </div>
          )}

          {/* SESI 5H Phase 5A.7: Animation builder moved ke PositionCreativeModal */}
          {state.ad_format === 'animated' && (
            <div className="rounded-xl border-2 border-purple-300 bg-purple-50/40 dark:border-purple-800 dark:bg-purple-950/20 p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40 shrink-0">
                  <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[13px] font-bold text-purple-900 dark:text-purple-100">
                    Animasi GSAP Dikonfigurasi Per-Posisi
                  </h4>
                  <p className="text-[11px] text-purple-800/80 dark:text-purple-200/80 mt-1 leading-relaxed">
                    Setiap posisi banner punya dimensi beda (Top Billboard 888×220,
                    Sidebar 300×250, dll). Animasi GSAP dikonfigurasi <strong>per posisi</strong>
                    {' '}supaya optimal untuk setiap dimensi.
                  </p>
                  <div className="flex items-start gap-2 mt-3 p-2.5 rounded-md bg-white/60 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700">
                    <Info size={12} className="text-purple-700 dark:text-purple-300 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-purple-800 dark:text-purple-200 leading-relaxed">
                      <strong>Langkah:</strong> Scroll ke section <em>Targeting</em> →
                      pilih posisi → klik <em>"Edit Creative"</em> → pilih tab <strong>Animated GSAP</strong>.
                      Bisa pilih preset siap-pakai atau craft step manual.
                    </p>
                  </div>
                  {state.positions.length > 0 && (
                    <p className="text-[10px] text-purple-700/80 dark:text-purple-300/80 mt-2">
                      Posisi aktif: <code className="font-mono bg-purple-100 dark:bg-purple-900/50 px-1 rounded text-purple-900 dark:text-purple-200">
                        {state.positions.join(', ')}
                      </code>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ════════════════════════════════════════════════════════════════
// SESI 5E Phase 3b (19 Mei 2026): MultiImageSection ELIMINATED.
// ────────────────────────────────────────────────────────────────
// Per-position image upload moved ke PositionCreativeModal di section
// Targeting. Default image_url tetap berfungsi sebagai fallback global.
// Klik posisi di section Targeting → modal popup untuk upload per posisi
// + DCA variants per posisi.
// ════════════════════════════════════════════════════════════════
