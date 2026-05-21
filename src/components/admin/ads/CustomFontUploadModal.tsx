'use client';

// ════════════════════════════════════════════════════════════════
// TeraLoka Ads — Custom Font Upload Modal (Banner Studio V2)
// PATH: src/components/admin/ads/CustomFontUploadModal.tsx
// ────────────────────────────────────────────────────────────────
// SESI 6 Sub-Phase 6B (22 Mei 2026) — TD-ANIM-101 NEW.
//
// WHAT:
//   Modal upload font file (.ttf/.woff/.woff2/.otf max 200KB) untuk
//   advertiser tertentu. Setelah submit:
//     1. Validate client-side (size, ext, license required)
//     2. Upload binary ke Supabase Storage bucket 'ad-fonts'
//        path: {advertiserId}/{slug}-{timestamp}.{ext}
//     3. POST /admin/ads/fonts dengan metadata (storage_path, public_url, dll)
//     4. Callback onUploaded(font) → parent refresh list
//     5. Close modal
//
// PERSONA: Admin power user (founder solo). Workflow target <60 detik.
//
// FONT IMPORT PATH (Pattern AAS):
//   Import supabase client dari '@/lib/supabase' (assumed existing —
//   sama pattern dengan ImageUpload). Kalau path beda, founder adjust.
// ════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Upload, AlertCircle, CheckCircle, Loader2, FileType2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useApi, ApiError } from '@/lib/api/client';

// Module-level Supabase browser client (singleton).
// Pattern existing: createClient() per call cheap, tapi instantiate sekali
// untuk modal lifetime cukup.
const supabase = createClient();

// ────────────────────────────────────────────────────────────────
// Types (mirror backend custom-fonts-engine.ts)
// ────────────────────────────────────────────────────────────────

export type CustomFontFormat = 'ttf' | 'woff' | 'woff2' | 'otf';

export interface CustomFontRecord {
  id:              string;
  advertiser_id:   string;
  slug:            string;
  display_name:    string;
  storage_path:    string;
  public_url:      string;
  file_format:     CustomFontFormat;
  file_size_bytes: number;
  license_owned:   boolean;
  license_proof:   string | null;
  uploaded_by:     string | null;
  uploaded_at:     string;
}

// ────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────

const STORAGE_BUCKET = 'ad-fonts';
const MAX_FONT_SIZE_BYTES = 200 * 1024;
const ALLOWED_EXTS: readonly string[] = ['ttf', 'woff', 'woff2', 'otf'] as const;
const SLUG_REGEX = /^[a-z0-9-]+$/;
const ALLOWED_MIME_PREFIXES = ['font/', 'application/font', 'application/x-font', 'application/octet-stream'];

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

/** Generate kebab-case slug from display name. */
function generateSlug(displayName: string): string {
  return displayName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

/** Detect format dari file extension. */
function detectFormat(fileName: string): CustomFontFormat | null {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (!ext) return null;
  return ALLOWED_EXTS.includes(ext) ? (ext as CustomFontFormat) : null;
}

/** Format bytes → readable string. */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// ────────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────────

export interface CustomFontUploadModalProps {
  open:           boolean;
  advertiserId:   string;
  onClose:        () => void;
  onUploaded:     (font: CustomFontRecord) => void;
}

// ────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────

export default function CustomFontUploadModal({
  open,
  advertiserId,
  onClose,
  onUploaded,
}: CustomFontUploadModalProps) {
  const api = useApi();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file,          setFile]          = useState<File | null>(null);
  const [displayName,   setDisplayName]   = useState('');
  const [licenseOwned,  setLicenseOwned]  = useState(false);
  const [licenseProof,  setLicenseProof]  = useState('');
  const [uploading,     setUploading]     = useState(false);
  const [errorMsg,      setErrorMsg]      = useState<string | null>(null);
  const [stepMsg,       setStepMsg]       = useState<string | null>(null);

  // Auto-derive slug from display name (admin can see preview)
  const slug = useMemo(() => generateSlug(displayName), [displayName]);

  // Detect format dari file (read-only display)
  const fileFormat = useMemo(
    () => (file ? detectFormat(file.name) : null),
    [file]
  );

  // ── Reset state on close/open ──
  useEffect(() => {
    if (!open) {
      // small delay supaya animation close gak flicker
      const t = setTimeout(() => {
        setFile(null);
        setDisplayName('');
        setLicenseOwned(false);
        setLicenseProof('');
        setUploading(false);
        setErrorMsg(null);
        setStepMsg(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ── ESC to close ──
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !uploading) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, uploading, onClose]);

  if (!open) return null;

  // ── File select handler ──
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      return;
    }
    // Validate format
    const fmt = detectFormat(f.name);
    if (!fmt) {
      setErrorMsg(`File ekstensi gak didukung. Pakai: ${ALLOWED_EXTS.join(', ')}`);
      setFile(null);
      return;
    }
    // Validate size
    if (f.size > MAX_FONT_SIZE_BYTES) {
      setErrorMsg(`File terlalu besar (${formatSize(f.size)}). Max 200 KB. Kompres pakai font subsetter (e.g. transfonter.org).`);
      setFile(null);
      return;
    }
    setFile(f);
    // Auto-fill display name dari filename kalau masih kosong
    if (!displayName) {
      const baseName = f.name.replace(/\.[^.]+$/, '');
      setDisplayName(baseName);
    }
  };

  // ── Submit ──
  const handleSubmit = async () => {
    setErrorMsg(null);

    // Validation
    if (!file) {
      setErrorMsg('Pilih file font dulu');
      return;
    }
    if (!displayName.trim() || displayName.trim().length < 2) {
      setErrorMsg('Nama font minimal 2 karakter');
      return;
    }
    if (!slug || !SLUG_REGEX.test(slug) || slug.length < 2) {
      setErrorMsg('Slug auto-generated invalid. Coba nama font tanpa karakter aneh.');
      return;
    }
    if (!licenseOwned) {
      setErrorMsg('Centang konfirmasi license dulu (WAJIB)');
      return;
    }
    if (!fileFormat) {
      setErrorMsg('Format file gak terdeteksi');
      return;
    }

    setUploading(true);

    try {
      // Step 1: Upload ke Supabase Storage
      setStepMsg('Upload file ke Storage...');
      const timestamp   = Date.now();
      const storagePath = `${advertiserId}/${slug}-${timestamp}.${fileFormat}`;

      const { error: uploadErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: '31536000', // 1 year — fonts gak berubah
          upsert:       false,       // beda timestamp jadi unique
          contentType:  file.type || `font/${fileFormat}`,
        });

      if (uploadErr) {
        throw new Error(`Storage upload gagal: ${uploadErr.message}`);
      }

      // Step 2: Get public URL
      setStepMsg('Resolve public URL...');
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;
      if (!publicUrl) {
        throw new Error('Gagal dapat public URL');
      }

      // Step 3: POST metadata ke backend
      setStepMsg('Simpan metadata ke server...');
      const res = await api.post<CustomFontRecord>('/admin/ads/fonts', {
        advertiser_id:   advertiserId,
        slug,
        display_name:    displayName.trim(),
        storage_path:    storagePath,
        public_url:      publicUrl,
        file_format:     fileFormat,
        file_size_bytes: file.size,
        license_owned:   true,
        license_proof:   licenseProof.trim() || null,
      });

      // Step 4: Success
      setStepMsg('✅ Berhasil!');
      onUploaded(res);
      // small delay supaya user lihat success message
      setTimeout(() => onClose(), 400);
    } catch (err: any) {
      // Rollback: kalau metadata POST fail tapi Storage udah upload, ada
      // orphan file. Backend retry / cleanup nanti (TD-MINOR-001 untuk later).
      let msg: string;
      if (err instanceof ApiError) {
        msg = err.message || `Server error (${err.code ?? 'unknown'})`;
      } else {
        msg = err?.message ?? String(err);
      }
      setErrorMsg(msg);
      setStepMsg(null);
      setUploading(false);
    }
  };

  const canSubmit = !!file && !!displayName.trim() && licenseOwned && !uploading;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !uploading) onClose();
      }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div className="flex items-center gap-2">
            <FileType2 className="w-5 h-5 text-purple-600" />
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Upload Custom Font
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* File picker */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
              File Font <span className="text-red-500">*</span>
              <span className="ml-2 text-[10px] font-normal text-gray-500">
                .ttf / .woff / .woff2 / .otf · max 200 KB
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".ttf,.woff,.woff2,.otf,font/*,application/font-woff,application/font-woff2,application/x-font-ttf,application/x-font-otf,application/octet-stream"
                onChange={handleFileSelect}
                disabled={uploading}
                className="block w-full text-xs text-gray-700 dark:text-gray-200
                           file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0
                           file:text-xs file:font-bold file:bg-purple-600 file:text-white
                           hover:file:bg-purple-700 file:cursor-pointer
                           disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            {file && (
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-purple-700 dark:text-purple-300">
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="font-mono">{file.name}</span>
                <span className="text-gray-500">·</span>
                <span>{formatSize(file.size)}</span>
                <span className="text-gray-500">·</span>
                <span className="uppercase">{fileFormat}</span>
              </div>
            )}
          </div>

          {/* Display name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
              Nama Tampilan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={uploading}
              maxLength={80}
              placeholder="Contoh: Brand Helvetica"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600
                         rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-purple-500
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {slug && (
              <p className="mt-1 text-[10px] text-gray-500 font-mono">
                slug: <span className="text-purple-600 dark:text-purple-400">{slug}</span>
                {' · '}
                CSS family: <span className="text-purple-600 dark:text-purple-400">tlk-font-{slug}</span>
              </p>
            )}
          </div>

          {/* License confirmation — REQUIRED */}
          <div className="p-3 rounded border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={licenseOwned}
                onChange={(e) => setLicenseOwned(e.target.checked)}
                disabled={uploading}
                className="mt-0.5 w-4 h-4 text-purple-600 border-gray-300 rounded
                           focus:ring-purple-500 focus:ring-2
                           disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="text-xs text-gray-800 dark:text-gray-100">
                <span className="font-bold">Saya konfirmasi punya license untuk pakai font ini</span>
                <span className="text-red-500"> *</span>
                <br />
                <span className="text-[10px] text-gray-600 dark:text-gray-400 italic">
                  Klien tanggung jawab penuh atas legality. TeraLoka bebas dari klaim copyright pihak ketiga.
                </span>
              </span>
            </label>
          </div>

          {/* License proof — OPTIONAL */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
              License Proof URL <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <input
              type="url"
              value={licenseProof}
              onChange={(e) => setLicenseProof(e.target.value)}
              disabled={uploading}
              placeholder="https://fontfoundry.com/license/..."
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600
                         rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-purple-500
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-[10px] text-gray-500">
              URL ke receipt, license PDF, atau halaman pembelian. Untuk audit trail.
            </p>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="flex items-start gap-2 p-2.5 rounded bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-300">{errorMsg}</p>
            </div>
          )}

          {/* Step progress */}
          {stepMsg && !errorMsg && (
            <div className="flex items-center gap-2 p-2.5 rounded bg-purple-50 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-700">
              {uploading ? (
                <Loader2 className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              )}
              <p className="text-xs text-purple-700 dark:text-purple-300">{stepMsg}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-900">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="px-3 py-1.5 text-xs font-bold rounded border border-gray-300 dark:border-gray-600
                       text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-3 py-1.5 text-xs font-bold rounded bg-purple-600 text-white
                       hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed
                       flex items-center gap-1.5"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                Upload Font
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
