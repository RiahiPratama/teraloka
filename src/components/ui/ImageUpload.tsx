'use client';

// ════════════════════════════════════════════════════════════════
// IMAGE UPLOAD v3 — PWA Mobile-First + GIF Support
// ────────────────────────────────────────────────────────────────
// SESI 10 (24 Mei 2026) — Phase 1 Sub-Phase B
//
// Upgrade dari v2:
//   ✅ GIF support untuk bucket 'ads' (animasi banner Kumparan-style)
//   ✅ Skip canvas compression untuk GIF (preserve animation frames)
//   ✅ Per-MIME size limit: GIF 2MB, static 500KB di bucket ads
//   ✅ Per-bucket MIME accept map (selective GIF allowance)
//   ✅ UI hint adaptive per bucket
//
// Backward compat:
//   ✅ Existing buckets (listings, articles, etc) tetap static-only
//   ✅ Existing maxSizeMB prop override masih honored
//   ✅ Camera capture tetap static (kamera HP gak capture GIF)
// ════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileText, X, Camera, Image as ImageIcon, Loader2, ChevronDown, RefreshCw, Upload } from 'lucide-react';
import { compressImage, triggerHaptic, isMobile, formatFileSize } from '@/utils/pwa-utils';
import { useToast } from '@/components/ui/Toast';

type BucketName =
  | 'listings'
  | 'articles'
  | 'campaigns'
  | 'avatars'
  | 'reports'
  | 'ads'
  | 'ad-content'
  | 'donations'
  | 'kyc';

interface ImageUploadProps {
  bucket: BucketName;
  onUpload: (urls: string[]) => void;
  existingUrls?: string[];
  label?: string;
  maxFiles?: number;
  maxSizeMB?: number;
}

interface BucketConfig {
  maxFiles: number;
  maxSizeMB: number;          // bucket cap (untuk GIF / file terbesar yang allowed)
  staticMaxSizeMB?: number;   // override khusus untuk static image (kalau bucket support GIF)
}

const BUCKET_LIMITS: Record<BucketName, BucketConfig> = {
  listings:    { maxFiles: 5, maxSizeMB: 3 },
  articles:    { maxFiles: 1, maxSizeMB: 2 },
  campaigns:   { maxFiles: 1, maxSizeMB: 2 },
  avatars:     { maxFiles: 1, maxSizeMB: 1 },
  reports:     { maxFiles: 3, maxSizeMB: 3 },
  // SESI 10 Sub-Phase B (24 Mei 2026):
  // GIF up to 2MB untuk banner dinamis; static tetap 500KB strict (page speed discipline).
  ads:         { maxFiles: 1, maxSizeMB: 2, staticMaxSizeMB: 0.5 },
  // SESI 7 (22 Mei 2026) — Advertorial cover + inline images.
  // 2MB limit untuk quality hero image + multiple inline images.
  // Cover = photographic content, GIF tidak relevan.
  'ad-content':{ maxFiles: 1, maxSizeMB: 2 },
  donations:   { maxFiles: 1, maxSizeMB: 5 },
  kyc:         { maxFiles: 3, maxSizeMB: 5 },
};

// ────────────────────────────────────────────────────────────────
// MIME accept per bucket — SELECTIVE GIF allowance.
// Hanya bucket 'ads' yang accept GIF (banner dinamis).
// Bucket lain static-only untuk discipline & photographic context.
// ────────────────────────────────────────────────────────────────
const STATIC_MIMES = 'image/jpeg,image/png,image/webp';
const GIF_MIMES    = 'image/jpeg,image/png,image/webp,image/gif';

const MIME_BY_BUCKET: Record<BucketName, string> = {
  listings:    STATIC_MIMES,
  articles:    STATIC_MIMES,
  campaigns:   STATIC_MIMES,
  avatars:     STATIC_MIMES,
  reports:     STATIC_MIMES,
  ads:         GIF_MIMES,      // ✅ GIF allowed di bucket ads
  'ad-content':STATIC_MIMES,
  donations:   STATIC_MIMES,
  kyc:         STATIC_MIMES,
};

const supportsPdf = (bucket: string) => bucket === 'donations';

// Stable empty array reference — prevents infinite re-render in parent
// when 'existingUrls' prop is not passed (default value would create new
// array reference every render, triggering the useEffect sync below).
const EMPTY_URLS: string[] = [];

const isPdfUrl = (url: string) => url.toLowerCase().endsWith('.pdf');
const isGifFile = (file: File) => file.type === 'image/gif';

interface UploadingFile {
  id: string;
  name: string;
  status: 'compressing' | 'uploading' | 'error';
  progress: number;
  error?: string;
  file?: File;
}

export default function ImageUpload({
  bucket,
  onUpload,
  existingUrls = EMPTY_URLS,
  label = '',
  maxFiles,
  maxSizeMB,
}: ImageUploadProps) {
  const limits = BUCKET_LIMITS[bucket];
  const _maxFiles  = maxFiles  ?? limits.maxFiles;
  const _maxSizeMB = maxSizeMB ?? limits.maxSizeMB;
  const _supportsPdf = supportsPdf(bucket);
  const _supportsGif = MIME_BY_BUCKET[bucket].includes('image/gif');
  const _galleryAccept = MIME_BY_BUCKET[bucket];

  const { toast } = useToast();
  const [urls, setUrls] = useState<string[]>(existingUrls);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [mobile, setMobile] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMobile(isMobile());
  }, []);

  // Sync external changes
  // Compare by content (length + items) to avoid infinite loop when
  // parent passes a new array reference every render with same content.
  useEffect(() => {
    setUrls(prev => {
      if (prev.length !== existingUrls.length) return existingUrls;
      const changed = existingUrls.some((url, i) => url !== prev[i]);
      return changed ? existingUrls : prev;
    });
  }, [existingUrls]);

  const canAddMore = urls.length + uploading.length < _maxFiles;

  // ─── Compute per-file effective size limit ────────────────────
  // Priority:
  //   1. User-provided maxSizeMB prop (explicit override) — wins for both GIF & static
  //   2. GIF: gunakan bucket maxSizeMB (cap besar)
  //   3. Static: gunakan staticMaxSizeMB kalau ada, else maxSizeMB
  function getEffectiveLimit(file: File): number {
    if (maxSizeMB !== undefined) return maxSizeMB;
    if (isGifFile(file)) return limits.maxSizeMB;
    return limits.staticMaxSizeMB ?? limits.maxSizeMB;
  }

  // ─── Core upload logic ────────────────────────────────────────

  async function processFile(file: File): Promise<string | null> {
    const id = Math.random().toString(36).slice(2);

    // Validate type
    const isPdf = file.type === 'application/pdf';
    const isImg = file.type.startsWith('image/');
    const isGif = isGifFile(file);

    if (!isImg && !(_supportsPdf && isPdf)) {
      toast.error(`Format tidak didukung: ${file.name}`);
      triggerHaptic('error');
      return null;
    }

    // ⛔ GIF di bucket non-ads → reject explicit (defense in depth, walaupun accept attr seharusnya filter)
    if (isGif && !_supportsGif) {
      toast.error(`GIF tidak didukung di bucket "${bucket}". Gunakan JPG/PNG/WebP.`);
      triggerHaptic('error');
      return null;
    }

    // Add to uploading state
    setUploading(prev => [...prev, { id, name: file.name, status: 'compressing', progress: 0, file }]);

    try {
      // 1. Compress (skip for PDF + skip for GIF)
      // ⚠️ KRITIS: GIF tidak boleh di-compress via canvas — animasi akan hilang
      //           (canvas render = frame pertama only).
      let processedFile = file;
      if (isImg && !isGif) {
        processedFile = await compressImage(file);
      }

      // Validate size AFTER compression
      const effectiveLimit = getEffectiveLimit(processedFile);
      if (processedFile.size > effectiveLimit * 1024 * 1024) {
        const sizeStr = formatFileSize(processedFile.size);
        const formatLabel = isGif ? 'GIF animasi' : 'gambar statis';
        const msg = `File terlalu besar (${sizeStr}). Maks ${effectiveLimit}MB untuk ${formatLabel}.`;
        setUploading(prev => prev.map(u => u.id === id ? { ...u, status: 'error', error: msg } : u));
        toast.error(msg);
        triggerHaptic('error');
        return null;
      }

      // PDF size warning (non-blocking)
      if (isPdf && processedFile.size > 1024 * 1024) {
        toast.warning('File PDF cukup besar, upload mungkin agak lama di koneksi lambat');
      }

      // GIF size warning (non-blocking, untuk awareness page speed)
      if (isGif && processedFile.size > 1024 * 1024) {
        toast.warning('GIF >1MB akan lebih lambat dimuat di koneksi lambat. Optimalkan kalau perlu.');
      }

      // 2. Upload to Supabase
      setUploading(prev => prev.map(u => u.id === id ? { ...u, status: 'uploading', progress: 50 } : u));

      const supabase = createClient();
      const ext = processedFile.name.split('.').pop() || 'bin';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, processedFile, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        const msg = `Upload gagal: ${uploadError.message}`;
        setUploading(prev => prev.map(u => u.id === id ? { ...u, status: 'error', error: msg } : u));
        toast.error(msg);
        triggerHaptic('error');
        return null;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);

      // Remove from uploading
      setUploading(prev => prev.filter(u => u.id !== id));
      triggerHaptic('success');
      return data.publicUrl;

    } catch (err: any) {
      const msg = err?.message || 'Gagal memproses file';
      setUploading(prev => prev.map(u => u.id === id ? { ...u, status: 'error', error: msg } : u));
      toast.error(msg);
      triggerHaptic('error');
      return null;
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const remaining = _maxFiles - urls.length;
    const toUpload = Array.from(files).slice(0, remaining);

    if (files.length > remaining) {
      toast.warning(`Hanya ${remaining} file pertama yang akan diupload (maks ${_maxFiles})`);
    }

    const results = await Promise.all(toUpload.map(processFile));
    const newUrls = results.filter((u): u is string => u !== null);

    if (newUrls.length > 0) {
      const updated = [...urls, ...newUrls];
      setUrls(updated);
      onUpload(updated);
    }
  }

  function handleRemove(url: string) {
    const updated = urls.filter(u => u !== url);
    setUrls(updated);
    onUpload(updated);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  function handleRetry(u: UploadingFile) {
    if (!u.file) return;
    setUploading(prev => prev.filter(item => item.id !== u.id));
    processFile(u.file).then(url => {
      if (url) {
        const updated = [...urls, url];
        setUrls(updated);
        onUpload(updated);
      }
    });
  }

  function dismissError(id: string) {
    setUploading(prev => prev.filter(u => u.id !== id));
  }

  // ─── Helper text formatter ─────────────────────────────────────
  // Bucket dengan GIF support: tampilkan 2-line hint (static + GIF)
  // Bucket static-only: tampilkan 1-line hint (existing pattern)
  function renderFormatHint() {
    if (_supportsGif) {
      const staticCap = limits.staticMaxSizeMB ?? limits.maxSizeMB;
      const gifCap = limits.maxSizeMB;
      return (
        <>
          <p className="text-xs text-gray-400">
            JPG/PNG/WebP <strong>{staticCap}MB</strong> · GIF animasi <strong>{gifCap}MB</strong>
            {_maxFiles > 1 && ` · hingga ${_maxFiles} file`}
          </p>
        </>
      );
    }
    return (
      <p className="text-xs text-gray-400">
        JPG, PNG, atau WebP · maks {_maxSizeMB}MB
        {_maxFiles > 1 && ` · hingga ${_maxFiles} file`}
      </p>
    );
  }

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div>
      {label && <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">{label}</label>}

      {/* Existing files preview */}
      {urls.length > 0 && (
        <div className={`mb-3 grid gap-2 ${_maxFiles === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
          {urls.map((url, i) => (
            <div key={i} className="relative group rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
              {isPdfUrl(url) ? (
                <div className="flex items-center gap-3 p-4">
                  <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                    <FileText size={24} className="text-red-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-700 truncate">Bukti PDF</p>
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-[#003526] underline">Lihat file</a>
                  </div>
                </div>
              ) : (
                <img src={url} alt={`Upload ${i + 1}`} className="w-full h-32 object-cover" />
              )}
              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black active:scale-90 transition-all"
                aria-label="Hapus"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Uploading & Error states */}
      {uploading.length > 0 && (
        <div className="mb-3 space-y-2">
          {uploading.map(u => (
            <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50">
              {u.status === 'error' ? (
                <>
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <X size={16} className="text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-700 truncate">{u.name}</p>
                    <p className="text-xs text-red-600 truncate">{u.error}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {u.file && (
                      <button
                        onClick={() => handleRetry(u)}
                        className="p-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 active:scale-90 transition-all"
                        aria-label="Coba lagi"
                      >
                        <RefreshCw size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => dismissError(u.id)}
                      className="p-1.5 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 active:scale-90 transition-all"
                      aria-label="Tutup"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Loader2 size={16} className="text-[#003526] animate-spin flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-700 truncate">{u.name}</p>
                    <p className="text-xs text-gray-500">
                      {u.status === 'compressing' ? 'Memperkecil ukuran...' : 'Mengupload...'}
                    </p>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload area (only show if can add more) */}
      {canAddMore && (
        <>
          {/* Mobile: 2 button stack (Camera + Gallery) */}
          {mobile ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { triggerHaptic('tap'); cameraInputRef.current?.click(); }}
                className="flex flex-col items-center justify-center gap-1.5 py-4 px-3 rounded-xl border-2 border-[#003526] bg-[#003526] text-white active:scale-95 transition-all"
              >
                <Camera size={22} />
                <span className="text-xs font-bold">Kamera</span>
              </button>
              <button
                type="button"
                onClick={() => { triggerHaptic('tap'); galleryInputRef.current?.click(); }}
                className="flex flex-col items-center justify-center gap-1.5 py-4 px-3 rounded-xl border-2 border-gray-200 bg-white text-gray-700 hover:border-[#003526] active:scale-95 transition-all"
              >
                <ImageIcon size={22} />
                <span className="text-xs font-bold">Galeri</span>
              </button>
            </div>
          ) : (
            // Desktop: drag-drop area
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => galleryInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl px-4 py-6 text-center cursor-pointer hover:border-[#003526] hover:bg-gray-50 transition-colors"
            >
              <div className="flex flex-col items-center gap-2">
                <Upload size={22} className="text-gray-400" />
                <p className="text-xs text-gray-600 font-semibold">
                  Klik atau drag file ke sini
                </p>
                {renderFormatHint()}
              </div>
            </div>
          )}

          {/* Helper hint untuk mobile */}
          {mobile && (
            <p className="text-xs text-gray-500 text-center mt-2">
              📸 Snap langsung pakai kamera HP-mu, atau pilih foto yang ada di galeri
              {_supportsGif && ' · GIF animasi dari galeri'}
            </p>
          )}

          {/* Advanced: PDF upload (donations bucket only) */}
          {_supportsPdf && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 active:opacity-70 transition-colors"
              >
                <ChevronDown size={12} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                Lainnya (advanced)
              </button>
              {showAdvanced && (
                <div className="mt-2 p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <p className="text-xs text-blue-900 font-medium mb-2">
                    Upload file PDF (export dari mobile banking, dll)
                  </p>
                  <button
                    type="button"
                    onClick={() => { triggerHaptic('tap'); pdfInputRef.current?.click(); }}
                    className="flex items-center gap-2 text-xs font-bold text-blue-700 bg-white border border-blue-200 px-3 py-2 rounded-lg hover:bg-blue-50 active:scale-95 transition-all"
                  >
                    <FileText size={14} />
                    Pilih file PDF
                  </button>
                  <p className="text-[10px] text-blue-700 mt-2 leading-relaxed">
                    💡 Tips: kalau bingung, lebih mudah <strong>foto langsung</strong> bukti transfer dari layar HP-mu pakai kamera di atas.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Hidden inputs */}
      {/* Camera: static only — kamera HP tidak capture GIF */}
      <input
        ref={cameraInputRef}
        type="file"
        accept={STATIC_MIMES}
        capture="environment"
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
      {/* Gallery: per-bucket MIME — bucket ads include GIF */}
      <input
        ref={galleryInputRef}
        type="file"
        accept={_galleryAccept}
        multiple={_maxFiles > 1}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
      {_supportsPdf && (
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      )}
    </div>
  );
}
