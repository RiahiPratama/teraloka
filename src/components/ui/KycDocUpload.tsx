'use client';

// ════════════════════════════════════════════════════════════════
// KYC DOC UPLOAD — single typed document → bucket 'kyc'
// ────────────────────────────────────────────────────────────────
// BALAJU Driver Apply (8 Jun 2026)
//
// Kenapa komponen BARU (bukan ImageUpload):
//   1. ImageUpload balikin URL (getPublicUrl); backend `file_path` minta PATH MURNI.
//      Nyimpen URL di kolom path = akar TD-OPS-001 ("Object not found").
//   2. ImageUpload galeri flat (string[]) — gak tau mana KTP/SIM/STNK.
//      Apply butuh slot BER-TIPE (1 instance = 1 doc_type).
//   → ImageUpload battle-tested utk 8 bucket lain. JANGAN disentuh.
//
// Kontrak komponen:
//   - Upload 1 dokumen ke bucket 'kyc', path per-user:
//       `${userId}/${docType}-${timestamp}.${ext}`
//   - Emit RAW PATH (bukan URL) lewat onChange(path | null).
//   - Preview dari file LOKAL (URL.createObjectURL) → user cek keterbacaan
//     tanpa akses bucket private (kyc = private; getPublicUrl gak render).
//   - Replace/remove → hapus file lama dari storage (kyc gak ikut
//     orphan-sweep yang scope bucket 'ads' → bersihin manual di sini).
//
// 🛡️ Catatan keamanan (TD-CYBER-KYC-RLS, HIGH pre-launch):
//   Policy 'kyc' saat ini cmd=ALL roles=public — kemungkinan belum scope
//   per-user (auth.uid()). Path per-user di sini menyiapkan RLS folder-scoped
//   `(storage.foldername(name))[1] = auth.uid()::text` saat policy diperbaiki.
// ════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import { FileText, X, Camera, Image as ImageIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { compressImage, triggerHaptic, isMobile, formatFileSize } from '@/utils/pwa-utils';
import { useToast } from '@/components/ui/Toast';

// Sinkron dgn VALID_DOC_TYPES di backend domains/balaju/driver/driver-types.ts.
// Didefinisikan ulang di sini karena frontend & backend = repo terpisah.
export type KycDocType = 'ktp' | 'sim_c' | 'stnk' | 'selfie' | 'vehicle_photo';

// [KYC-UPLOAD-OPSI-A] Upload lewat backend service-role (FE gak punya sesi Supabase →
// auth.uid() null → FE-direct ke bucket privat 'kyc' ditolak RLS). docType jadi context.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';
const MAX_SIZE_MB = 5; // mirror BUCKET_LIMITS.kyc di ImageUpload
const ACCEPT_MIMES = 'image/jpeg,image/png,image/webp'; // dokumen = foto statis (no PDF/GIF utk MVP)

const BRAND = '#003526'; // hijau gelap, konsisten dgn ImageUpload

type Status = 'idle' | 'compressing' | 'uploading' | 'error';

interface KycDocUploadProps {
  docType: KycDocType;
  userId: string;
  label: string;
  required?: boolean;
  /** Path tersimpan (restore draft). Opsional. */
  value?: string;
  /** Emit raw path saat sukses, atau null saat dihapus. */
  onChange: (path: string | null) => void;
  /** Hint kecil di bawah tombol (mis. "Foto jelas, nomor terbaca"). */
  hint?: string;
}

function basename(p: string): string {
  const parts = p.split('/');
  return parts[parts.length - 1] || p;
}

export default function KycDocUpload({
  docType,
  userId,
  label,
  required = false,
  value,
  onChange,
  hint,
}: KycDocUploadProps) {
  const { toast } = useToast();

  const [path, setPath] = useState<string | null>(value ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>(value ? basename(value) : '');
  const [mobile, setMobile] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMobile(isMobile());
  }, []);

  // Sync restore draft (parent kirim path baru)
  useEffect(() => {
    const next = value ?? null;
    setPath(prev => (prev !== next ? next : prev));
    if (next && !displayName) setDisplayName(basename(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Revoke object URL saat ganti/unmount (cegah memory leak)
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const busy = status === 'compressing' || status === 'uploading';
  const uploaded = path !== null && status === 'idle';

  async function handleFile(file: File | undefined) {
    if (!file || busy) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Format tidak didukung. Gunakan foto JPG, PNG, atau WebP.');
      triggerHaptic('error');
      return;
    }

    // Preview lokal dari browser memory (gak butuh bucket private)
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return localUrl;
    });

    setStatus('compressing');
    setErrorMsg('');

    try {
      const processed = await compressImage(file);

      // Validasi ukuran SETELAH kompresi
      if (processed.size > MAX_SIZE_MB * 1024 * 1024) {
        const msg = `File terlalu besar (${formatFileSize(processed.size)}). Maks ${MAX_SIZE_MB}MB.`;
        setStatus('error');
        setErrorMsg(msg);
        toast.error(msg);
        triggerHaptic('error');
        return;
      }

      setStatus('uploading');

      // [KYC-UPLOAD-OPSI-A] POST ke backend (service role) → terima raw path ${userId}/${docType}-ts.ext.
      const token = typeof window !== 'undefined' ? localStorage.getItem('tl_token') : null;
      if (!token) {
        const msg = 'Sesi login tidak ditemukan. Login ulang lalu coba lagi.';
        setStatus('error'); setErrorMsg(msg); toast.error(msg); triggerHaptic('error'); return;
      }
      const fd = new FormData();
      fd.append('file', processed);
      fd.append('context', docType);

      const res = await fetch(`${API_URL}/me/kyc-docs/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success || !json?.data?.path) {
        const msg = `Upload gagal: ${json?.error?.message ?? 'HTTP ' + res.status}`;
        setStatus('error'); setErrorMsg(msg); toast.error(msg); triggerHaptic('error'); return;
      }
      const newPath = json.data.path as string;

      setPath(newPath);
      setDisplayName(processed.name);
      setStatus('idle');
      triggerHaptic('success');
      onChange(newPath); // ← RAW PATH dari backend, bukan URL
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal memproses file';
      setStatus('error');
      setErrorMsg(msg);
      toast.error(msg);
      triggerHaptic('error');
    }
  }

  async function handleRemove() {
    if (busy) return;
    // [KYC-UPLOAD-OPSI-A] File lama jadi orphan di bucket (hapus storage via FE anon mustahil —
    // RLS; jadi tanggung jawab backend nanti). FE cukup dereference path dari record.
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPath(null);
    setDisplayName('');
    setStatus('idle');
    setErrorMsg('');
    onChange(null);
    triggerHaptic('tap');
  }

  function onPick(files: FileList | null) {
    handleFile(files?.[0]);
  }

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* TERUPLOAD — chip dgn preview lokal + tombol hapus */}
      {uploaded && (
        <div className="relative rounded-xl border border-emerald-200 bg-emerald-50 overflow-hidden">
          <div className="flex items-center gap-3 p-3">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={label}
                className="w-14 h-14 rounded-lg object-cover border border-emerald-200 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <FileText size={22} className="text-emerald-600" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <p className="text-xs font-bold text-emerald-800">Terupload</p>
              </div>
              <p className="text-xs text-gray-500 truncate mt-0.5">{displayName}</p>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="w-8 h-8 rounded-full bg-white/80 border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-white hover:text-red-600 active:scale-90 transition-all shrink-0"
              aria-label="Hapus dokumen"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* SEDANG PROSES */}
      {busy && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50">
          <Loader2 size={16} className="animate-spin shrink-0" style={{ color: BRAND }} />
          <p className="text-xs font-semibold text-gray-600">
            {status === 'compressing' ? 'Memperkecil ukuran foto...' : 'Mengupload...'}
          </p>
        </div>
      )}

      {/* ERROR */}
      {status === 'error' && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-red-200 bg-red-50">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
            <X size={16} className="text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-700">Gagal upload</p>
            <p className="text-xs text-red-600 truncate">{errorMsg}</p>
          </div>
          <button
            type="button"
            onClick={() => setStatus('idle')}
            className="text-xs font-bold text-gray-600 px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 active:scale-95 transition-all shrink-0"
          >
            Ulangi
          </button>
        </div>
      )}

      {/* AREA UPLOAD (kalau belum ada / lagi error) */}
      {!uploaded && !busy && (
        <>
          {mobile ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  cameraRef.current?.click();
                }}
                className="flex flex-col items-center justify-center gap-1.5 py-4 px-3 rounded-xl border-2 text-white active:scale-95 transition-all"
                style={{ backgroundColor: BRAND, borderColor: BRAND }}
              >
                <Camera size={22} />
                <span className="text-xs font-bold">Kamera</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  galleryRef.current?.click();
                }}
                className="flex flex-col items-center justify-center gap-1.5 py-4 px-3 rounded-xl border-2 border-gray-200 bg-white text-gray-700 hover:border-[#003526] active:scale-95 transition-all"
              >
                <ImageIcon size={22} />
                <span className="text-xs font-bold">Galeri</span>
              </button>
            </div>
          ) : (
            <div
              onClick={() => galleryRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl px-4 py-6 text-center cursor-pointer hover:border-[#003526] hover:bg-gray-50 transition-colors"
            >
              <div className="flex flex-col items-center gap-2">
                <ImageIcon size={22} className="text-gray-400" />
                <p className="text-xs text-gray-600 font-semibold">Klik untuk pilih foto</p>
                <p className="text-xs text-gray-400">JPG, PNG, atau WebP · maks {MAX_SIZE_MB}MB</p>
              </div>
            </div>
          )}

          {(hint || mobile) && (
            <p className="text-xs text-gray-500 text-center mt-2">
              {hint ?? '📸 Pastikan foto jelas dan semua tulisan terbaca'}
            </p>
          )}
        </>
      )}

      {/* Hidden inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept={ACCEPT_MIMES}
        capture="environment"
        onChange={(e) => onPick(e.target.files)}
        className="hidden"
      />
      <input
        ref={galleryRef}
        type="file"
        accept={ACCEPT_MIMES}
        onChange={(e) => onPick(e.target.files)}
        className="hidden"
      />
    </div>
  );
}
