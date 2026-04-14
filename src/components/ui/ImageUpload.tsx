'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ImageUploadProps {
  bucket: 'listings' | 'articles' | 'campaigns' | 'avatars' | 'reports';
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
};

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

  const [urls, setUrls] = useState<string[]>(existingUrls);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<string | null> => {
    if (file.size > _maxSizeMB * 1024 * 1024) {
      setError(`Ukuran foto maksimal ${_maxSizeMB}MB`);
      return null;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Format foto harus JPG, PNG, atau WebP');
      return null;
    }

    const supabase = createClient();
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(-6)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, { upsert: false });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleFiles = async (files: FileList) => {
    setError('');
    const remaining = _maxFiles - urls.length;
    if (remaining <= 0) {
      setError(`Maksimal ${_maxFiles} foto`);
      return;
    }

    const selected = Array.from(files).slice(0, remaining);
    setUploading(true);

    try {
      const results = await Promise.all(selected.map(uploadFile));
      const newUrls = results.filter(Boolean) as string[];
      const updated = [...urls, ...newUrls];
      setUrls(updated);
      onUpload(updated);
    } catch (err: any) {
      setError(err.message ?? 'Gagal upload foto. Coba lagi.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (idx: number) => {
    const updated = urls.filter((_, i) => i !== idx);
    setUrls(updated);
    onUpload(updated);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const canAddMore = urls.length < _maxFiles;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-xs text-gray-400">
          {urls.length}/{_maxFiles} foto · maks {_maxSizeMB}MB per foto
        </span>
      </div>

      {/* Grid foto yang sudah diupload */}
      {urls.length > 0 && (
        <div className={`mb-2 grid gap-2 ${urls.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
          {urls.map((url, idx) => (
            <div key={url} className="relative group">
              <img
                src={url}
                alt={`Foto ${idx + 1}`}
                className="h-24 w-full rounded-xl object-cover border border-gray-200"
              />
              {idx === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-md bg-[#1B6B4A] px-1.5 py-0.5 text-xs font-medium text-white">
                  Cover
                </span>
              )}
              <button
                onClick={() => handleRemove(idx)}
                className="absolute right-1.5 top-1.5 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                title="Hapus foto"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Area upload */}
      {canAddMore && (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
            uploading
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-gray-200 bg-gray-50 cursor-pointer hover:border-[#1B6B4A] hover:bg-green-50'
          } ${urls.length > 0 ? 'h-16' : 'h-32'}`}
        >
          {uploading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#1B6B4A]" />
              <span className="text-xs">Mengupload...</span>
            </div>
          ) : (
            <>
              <svg className={`text-gray-400 ${urls.length > 0 ? 'h-5 w-5' : 'h-8 w-8 mb-2'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {urls.length === 0 && (
                <>
                  <p className="text-xs font-medium text-gray-500">Klik atau drag foto ke sini</p>
                  <p className="text-xs text-gray-400">JPG, PNG, WebP · maks {_maxSizeMB}MB</p>
                </>
              )}
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={_maxFiles > 1}
        onChange={e => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
