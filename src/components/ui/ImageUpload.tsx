'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileText, X, Upload, Loader2 } from 'lucide-react';

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
  kyc:       { maxFiles: 3, maxSizeMB: 5 },  // ← FIX-E: KTP penggalang (1-3 docs)
};

// Bucket 'donations' accepts PDF (bukti transfer dari e-banking export).
// Other buckets: image-only (jpeg/png/webp).
function getAllowedMimes(bucket: string): string[] {
  if (bucket === 'donations') {
    return ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  }
  return ['image/jpeg', 'image/png', 'image/webp'];
}

function getAcceptAttr(bucket: string): string {
  if (bucket === 'donations') {
    return 'image/jpeg,image/png,image/webp,application/pdf';
  }
  return 'image/jpeg,image/png,image/webp';
}

function getFormatLabel(bucket: string): string {
  if (bucket === 'donations') return 'JPG, PNG, WebP, atau PDF';
  return 'JPG, PNG, atau WebP';
}

// Check if URL is a PDF (simple extension check)
function isPdfUrl(url: string): boolean {
  return url.toLowerCase().endsWith('.pdf');
}

export default function ImageUpload({
  bucket,
  onUpload,
  existingUrls = [],
  label = 'Upload Foto',
  maxFiles,
  maxSizeMB,
}: ImageUploadProps) {
  const limits = BUCKET_LIMITS[bucket];
  const _maxFiles  = maxFiles  ?? limits.maxFiles;
  const _maxSizeMB = maxSizeMB ?? limits.maxSizeMB;
  const allowedMimes = getAllowedMimes(bucket);

  const [urls, setUrls] = useState<string[]>(existingUrls);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<string | null> => {
    if (file.size > _maxSizeMB * 1024 * 1024) {
      setError(`Ukuran file maksimal ${_maxSizeMB}MB`);
      return null;
    }
    if (!allowedMimes.includes(file.type)) {
      setError(`Format harus ${getFormatLabel(bucket)}`);
      return null;
    }

    const supabase = createClient();
    const ext = file.name.split('.').pop() || 'bin';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      setError(`Upload gagal: ${uploadError.message}`);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError('');
    setUploading(true);

    const remaining = _maxFiles - urls.length;
    const toUpload = Array.from(files).slice(0, remaining);

    const newUrls: string[] = [];
    for (const file of toUpload) {
      const url = await uploadFile(file);
      if (url) newUrls.push(url);
    }

    const updated = [...urls, ...newUrls];
    setUrls(updated);
    onUpload(updated);
    setUploading(false);

    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleRemove = (url: string) => {
    const updated = urls.filter(u => u !== url);
    setUrls(updated);
    onUpload(updated);
  };

  const canAddMore = urls.length < _maxFiles;

  return (
    <div>
      {label && <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>}

      {/* Existing files preview */}
      {urls.length > 0 && (
        <div className={`mt-2 grid gap-2 ${_maxFiles === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
          {urls.map((url, i) => (
            <div key={i} className="relative group rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
              {isPdfUrl(url) ? (
                <div className="flex items-center gap-3 p-4">
                  <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                    <FileText size={24} className="text-red-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-700 truncate">Bukti Transfer (PDF)</p>
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-[#003526] underline">Lihat file</a>
                  </div>
                </div>
              ) : (
                <img src={url} alt={`Upload ${i + 1}`} className="w-full h-32 object-cover" />
              )}
              <button type="button" onClick={() => handleRemove(url)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {canAddMore && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="mt-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-6 text-center cursor-pointer hover:border-[#003526] hover:bg-gray-50 transition-colors"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={24} className="animate-spin text-[#003526]" />
              <p className="text-xs text-gray-500">Mengupload...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload size={22} className="text-gray-400" />
              <p className="text-xs text-gray-600 font-semibold">
                Klik atau drag file ke sini
              </p>
              <p className="text-xs text-gray-400">
                {getFormatLabel(bucket)} · maks {_maxSizeMB}MB
                {_maxFiles > 1 && ` · hingga ${_maxFiles} file`}
              </p>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={getAcceptAttr(bucket)}
            multiple={_maxFiles > 1}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
