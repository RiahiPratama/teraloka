'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ImageUploadProps {
  bucket: 'listings' | 'articles' | 'campaigns' | 'avatars';
  onUpload: (url: string) => void;
  existingUrl?: string;
  label?: string;
  maxSizeMB?: number;
}

export default function ImageUpload({
  bucket,
  onUpload,
  existingUrl,
  label = 'Upload Foto',
  maxSizeMB = 5,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string>(existingUrl ?? '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError('');

    // Validasi ukuran
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Ukuran foto maksimal ${maxSizeMB}MB`);
      return;
    }

    // Validasi tipe
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Format foto harus JPG, PNG, atau WebP');
      return;
    }

    // Preview lokal dulu
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);

    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(-6)}.${ext}`;
      const path = `${bucket}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
      setPreview(data.publicUrl);
      onUpload(data.publicUrl);
    } catch (err: any) {
      setError(err.message ?? 'Gagal upload foto. Coba lagi.');
      setPreview(existingUrl ?? '');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    setPreview('');
    onUpload('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>

      {preview ? (
        <div className="relative mt-1.5">
          <img
            src={preview}
            alt="Preview"
            className="h-40 w-full rounded-xl object-cover border border-gray-200"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40">
              <div className="text-center text-white">
                <div className="mx-auto mb-1 h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <p className="text-xs">Mengupload...</p>
              </div>
            </div>
          )}
          {!uploading && (
            <button
              onClick={handleRemove}
              className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
              title="Hapus foto"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="mt-1.5 flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 transition-colors hover:border-[#1B6B4A] hover:bg-green-50"
        >
          <svg className="mb-2 h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-xs font-medium text-gray-500">Klik atau drag foto ke sini</p>
          <p className="text-xs text-gray-400">JPG, PNG, WebP — maks {maxSizeMB}MB</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
      />

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
