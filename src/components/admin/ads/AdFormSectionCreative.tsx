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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ImageUpload from '@/components/ui/ImageUpload';
import { useAdForm } from './AdFormProvider';

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
  const imageError       = errorFor('image_url');
  const linkError        = errorFor('link_url');
  const disclaimerError  = errorFor('disclaimer_text');

  const isComplete =
    state.title.trim().length > 0 &&
    state.link_url.trim().length > 0 &&
    (state.ad_format === 'image'
      ? state.image_url.trim().length > 0
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
            <div className="grid grid-cols-2 gap-2">
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

          {/* Body (advertorial only) */}
          {state.ad_format === 'text' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-1.5">
                Body Advertorial <span className="text-status-critical">*</span>
              </label>
              <textarea
                value={state.body}
                onChange={(e) => setField('body', e.target.value)}
                rows={8}
                placeholder="Tulis artikel sponsored di sini. Min 100 karakter, max 5000."
                className={cn(
                  'w-full px-3 py-2 rounded-lg bg-surface border text-[13px] text-text leading-relaxed',
                  'placeholder:text-text-subtle resize-y',
                  'focus:outline-none focus:ring-2 focus:ring-ads/20 transition-all',
                  bodyError
                    ? 'border-status-critical/40 focus:border-status-critical/60'
                    : 'border-border focus:border-ads/50'
                )}
              />
              <div className="flex items-center justify-between mt-1">
                {bodyError ? (
                  <p className="text-[10px] text-status-critical">{bodyError}</p>
                ) : (
                  <span className="text-[10px] text-text-subtle">Min 100 chars</span>
                )}
                <p
                  className={cn(
                    'text-[10px] tabular-nums',
                    state.body.length < 100 || state.body.length > 5000
                      ? 'text-status-critical'
                      : 'text-text-subtle'
                  )}
                >
                  {state.body.length}/5000
                </p>
              </div>
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

          {/* Image upload (image format) */}
          {state.ad_format === 'image' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-1.5">
                Gambar Iklan <span className="text-status-critical">*</span>
              </label>
              <ImageUpload
                bucket="ads"
                maxFiles={1}
                maxSizeMB={0.5}
                existingUrls={state.image_url ? [state.image_url] : []}
                onUpload={(urls) => setField('image_url', urls[0] ?? '')}
                label="Upload gambar iklan (max 500KB)"
              />
              {imageError && (
                <p className="text-[10px] text-status-critical mt-1">{imageError}</p>
              )}
              <p className="text-[10px] text-text-subtle mt-1">
                Rekomendasi: 1200×630px untuk hero, 1600×200px untuk inline banner
              </p>
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
        </div>
      )}
    </section>
  );
}
