'use client';

// ════════════════════════════════════════════════════════════════
// IMAGE UPLOAD v2 — PWA Mobile-First
// ────────────────────────────────────────────────────────────────
// Upgrade dari v1:
//   ✅ Camera capture (capture="environment") — langsung snap dari HP
//   ✅ Tombol Galeri terpisah — clear UX untuk gaptek user
//   ✅ Client-side compression (Balanced: 1920px / 85%)
//   ✅ PDF di-tucked ke "Lainnya" expandable (donations bucket only)
//   ✅ Per-file progress + retry
//   ✅ Haptic feedback on success/error
//   ✅ Toast notifications (replace alert)
//   ✅ Drag-drop di desktop, button-based di mobile
//   ✅ Smart hint: "📸 Snap langsung dari HP-mu"
// ════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileText, X, Camera, Image as ImageIcon, Loader2, ChevronDown, RefreshCw, Upload } from 'lucide-react';
import { compressImage, triggerHaptic, isMobile, formatFileSize } from '@/utils/pwa-utils';
import { useToast } from '@/components/ui/Toast';

interface ImageUploadProps {
  bucket: 'listings' | 'articles' | 'campaigns' | 'avatars' | 'reports' | 'ads' | 'donations' | 'kyc';
  onUpload: (urls: string[]) => void;
  existingUrls?: string[];
  label?: string;
  maxFiles?: number;
  maxSizeMB?: number;
}

const BUCKET_LIMITS: Record<string, { maxFiles: number; maxSizeMB: number }> = {
  listings:  { maxFiles: 5, maxSizeMB: 3 },
  articles:  { maxFiles: 1, maxSizeMB: 2 },
  campaigns: { maxFiles: 1, maxSizeMB: 2 },
  avatars:   { maxFiles: 1, maxSizeMB: 1 },
  reports:   { maxFiles: 3, maxSizeMB: 3 },
  ads:       { maxFiles: 1, maxSizeMB: 0.5 },
  donations: { maxFiles: 1, maxSizeMB: 5 },
  kyc:       { maxFiles: 3, maxSizeMB: 5 },
};

const supportsPdf = (bucket: string) => bucket === 'donations';

const isPdfUrl = (url: string) => url.toLowerCase().endsWith('.pdf');

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
  existingUrls = [],
  label = '',
  maxFiles,
  maxSizeMB,
}: ImageUploadProps) {
  const limits = BUCKET_LIMITS[bucket];
  const _maxFiles  = maxFiles  ?? limits.maxFiles;
  const _maxSizeMB = maxSizeMB ?? limits.maxSizeMB;
  const _supportsPdf = supportsPdf(bucket);

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
  useEffect(() => {
    setUrls(existingUrls);
  }, [existingUrls]);

  const canAddMore = urls.length + uploading.length < _maxFiles;

  // ─── Core upload logic ────────────────────────────────────────

  async function processFile(file: File): Promise<string | null> {
    const id = Math.random().toString(36).slice(2);

    // Validate type
    const isPdf = file.type === 'application/pdf';
    const isImg = file.type.startsWith('image/');
    if (!isImg && !(_supportsPdf && isPdf)) {
      toast.error(`Format tidak didukung: ${file.name}`);
      triggerHaptic('error');
      return null;
    }

    // Add to uploading state
    setUploading(prev => [...prev, { id, name: file.name, status: 'compressing', progress: 0, file }]);

    try {
      // 1. Compress (skip for PDF)
      let processedFile = file;
      if (isImg) {
        processedFile = await compressImage(file);
      }

      // Validate size AFTER compression
      if (processedFile.size > _maxSizeMB * 1024 * 1024) {
        const sizeStr = formatFileSize(processedFile.size);
        const msg = `File terlalu besar (${sizeStr}). Maks ${_maxSizeMB}MB.`;
        setUploading(prev => prev.map(u => u.id === id ? { ...u, status: 'error', error: msg } : u));
        toast.error(msg);
        triggerHaptic('error');
        return null;
      }

      // PDF size warning (non-blocking)
      if (isPdf && processedFile.size > 1024 * 1024) {
        toast.warning('File PDF cukup besar, upload mungkin agak lama di koneksi lambat');
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
    triggerHaptic('tap');
  }

  function handleRetry(uploadingFile: UploadingFile) {
    if (!uploadingFile.file) return;
    setUploading(prev => prev.filter(u => u.id !== uploadingFile.id));
    processFile(uploadingFile.file).then(url => {
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

  // ─── Drag-drop (desktop only) ─────────────────────────────────

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
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
                <p className="text-xs text-gray-400">
                  JPG, PNG, atau WebP · maks {_maxSizeMB}MB
                  {_maxFiles > 1 && ` · hingga ${_maxFiles} file`}
                </p>
              </div>
            </div>
          )}

          {/* Helper hint untuk mobile */}
          {mobile && (
            <p className="text-xs text-gray-500 text-center mt-2">
              📸 Snap langsung pakai kamera HP-mu, atau pilih foto yang ada di galeri
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
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
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
