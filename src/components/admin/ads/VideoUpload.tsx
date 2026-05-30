'use client';

// ════════════════════════════════════════════════════════════════
// VIDEO UPLOAD — Banner Motion (1 file cerdas)
// PATH: src/components/admin/ads/VideoUpload.tsx
// ────────────────────────────────────────────────────────────────
// SESI 11 Batch 4 (30 Mei 2026) — Banner Motion
//
// GANTI total pola lama (3 field: mp4 wajib + webm opsional + poster wajib).
// Sekarang: 1 DROPZONE (gaya sama ImageUpload/Static), admin upload SATU file:
//   - terima .webM (disarankan, ringan) ATAU .mp4 (universal)
//   - poster di-AUTO-CAPTURE diam-diam dari frame pertama (object URL lokal,
//     gak kena CORS taint) → admin gak perlu mikirin poster
//   - opsi ganti poster manual tetap ada (subtle), buat jaga-jaga capture gagal
//
// Output tetap AdVideoSource { mp4, webm, poster } (kompatibel backend):
//   - upload webM → { mp4:'',  webm:url, poster:auto }
//   - upload mp4  → { mp4:url, webm:null, poster:auto }
//   Backend validateVideoAdFields (Batch 4) sekarang nerima salah satu sumber.
//
// ⚠️ Bucket 'ads' wajib allow video/mp4 + video/webm + file_size >= 5MB.
// ════════════════════════════════════════════════════════════════

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Film, X, Loader2, UploadCloud, Check, ImageIcon } from 'lucide-react';
import { compressImage, triggerHaptic, formatFileSize } from '@/utils/pwa-utils';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

// Mirror shared/types.ts AdVideoSource (SESI 10 lock — shape tetap)
export interface AdVideoSource {
  mp4:    string;
  webm:   string | null;
  poster: string;
}

interface VideoUploadProps {
  /** Current source untuk posisi ini (null = belum ada). */
  value:    AdVideoSource | null;
  /** Dipanggil tiap source berubah. null = clear semua. */
  onChange: (source: AdVideoSource | null) => void;
  /** Label posisi (untuk UI hint). */
  positionLabel?: string;
}

const BUCKET = 'ads';
const VIDEO_MAX_MB = 5;
const VIDEO_ACCEPT = 'video/webm,video/mp4';

export default function VideoUpload({ value, onChange, positionLabel }: VideoUploadProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  const src: AdVideoSource = value ?? { mp4: '', webm: null, poster: '' };
  const videoUrl  = src.webm || src.mp4 || '';
  const videoKind: 'webm' | 'mp4' | null = src.webm ? 'webm' : src.mp4 ? 'mp4' : null;

  // ─── Emit perubahan (clear kalau semua kosong) ─────────────────
  function emit(next: Partial<AdVideoSource>) {
    const merged: AdVideoSource = { ...src, ...next };
    if (!merged.mp4 && !merged.webm && !merged.poster) onChange(null);
    else onChange(merged);
  }

  // ─── Core upload ke Supabase ───────────────────────────────────
  async function uploadToSupabase(file: File): Promise<string | null> {
    const supabase = createClient();
    const ext = file.name.split('.').pop() || 'bin';
    const fileName = `video/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (error) {
      toast.error(`Upload gagal: ${error.message}`);
      triggerHaptic('error');
      return null;
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
    return data.publicUrl;
  }

  // ─── Auto-capture poster dari File LOKAL (object URL, no CORS) ──
  // Pakai <video> detached + canvas. Best-effort: gagal → resolve(null),
  // poster jadi opsional (backend Batch 4 izinin kosong).
  function capturePosterFromFile(file: File): Promise<File | null> {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (result: File | null) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };
      try {
        const url = URL.createObjectURL(file);
        const v = document.createElement('video');
        v.muted = true;
        v.playsInline = true;
        v.preload = 'metadata';
        v.src = url;
        // Hidden di DOM biar decode/seek reliable lintas-browser
        v.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;';
        document.body.appendChild(v);

        const cleanup = () => {
          URL.revokeObjectURL(url);
          v.remove();
        };

        // Timeout jaga-jaga (5s) — kalau decode nyangkut, jangan ngegantung
        const timer = setTimeout(() => { cleanup(); finish(null); }, 5000);

        v.addEventListener('error', () => { clearTimeout(timer); cleanup(); finish(null); }, { once: true });
        v.addEventListener('loadeddata', () => {
          try { v.currentTime = 0.1; } catch { /* fallback ke frame 0 */ }
        }, { once: true });
        v.addEventListener('seeked', () => {
          try {
            if (!v.videoWidth || !v.videoHeight) { clearTimeout(timer); cleanup(); finish(null); return; }
            const canvas = document.createElement('canvas');
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) { clearTimeout(timer); cleanup(); finish(null); return; }
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((b) => {
              clearTimeout(timer);
              cleanup();
              if (!b) { finish(null); return; }
              finish(new File([b], `poster-${Date.now()}.jpg`, { type: 'image/jpeg' }));
            }, 'image/jpeg', 0.85);
          } catch {
            clearTimeout(timer); cleanup(); finish(null);
          }
        }, { once: true });
      } catch {
        finish(null);
      }
    });
  }

  // ─── Handler: 1 file video (webM/mp4) + auto poster ────────────
  async function handleVideoFile(file: File | null) {
    if (!file) return;

    const kind: 'webm' | 'mp4' | null =
      file.type === 'video/webm' ? 'webm' : file.type === 'video/mp4' ? 'mp4' : null;
    if (!kind) {
      toast.error(`Format harus .webM atau .mp4. File: ${file.type || 'unknown'}`);
      triggerHaptic('error');
      return;
    }
    if (file.size > VIDEO_MAX_MB * 1024 * 1024) {
      toast.error(`Video kegedean (${formatFileSize(file.size)}). Maks ${VIDEO_MAX_MB}MB.`);
      triggerHaptic('error');
      return;
    }

    setBusy(true);
    try {
      // 1. Upload video
      const uploadedUrl = await uploadToSupabase(file);
      if (!uploadedUrl) return; // toast sudah di uploadToSupabase

      // 2. Auto-capture poster (best-effort, dari file lokal)
      let posterUrl = '';
      const posterFile = await capturePosterFromFile(file);
      if (posterFile) {
        const compressed = await compressImage(posterFile).catch(() => posterFile);
        const pUrl = await uploadToSupabase(compressed);
        if (pUrl) posterUrl = pUrl;
      }

      // 3. Emit — simpan di slot sesuai tipe, slot lain di-clear (1 file)
      emit({
        mp4:    kind === 'mp4' ? uploadedUrl : '',
        webm:   kind === 'webm' ? uploadedUrl : null,
        poster: posterUrl || src.poster, // pertahankan poster lama kalau capture gagal
      });
      triggerHaptic('success');
      toast.success(
        posterUrl
          ? `${kind.toUpperCase()} ke-upload + poster otomatis ✓`
          : `${kind.toUpperCase()} ke-upload (poster auto gagal — bisa tambah manual)`,
      );
    } finally {
      setBusy(false);
    }
  }

  // ─── Handler: poster manual (jaga-jaga capture gagal) ──────────
  async function handlePosterManual(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Poster harus gambar (JPG/PNG/WebP).');
      triggerHaptic('error');
      return;
    }
    setBusy(true);
    try {
      let processed = file;
      if (file.type !== 'image/gif') processed = await compressImage(file).catch(() => file);
      const url = await uploadToSupabase(processed);
      if (url) {
        emit({ poster: url });
        triggerHaptic('success');
        toast.success('Poster di-set');
      }
    } finally {
      setBusy(false);
    }
  }

  function clearAll() {
    onChange(null);
  }

  // ─── Drag & drop ───────────────────────────────────────────────
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (busy) return;
    const f = e.dataTransfer.files?.[0] ?? null;
    handleVideoFile(f);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Film size={16} className="text-ads" />
        <span className="text-[13px] font-bold text-text">
          Banner Motion{positionLabel ? ` — ${positionLabel}` : ''}
        </span>
      </div>

      {/* Hidden inputs */}
      <input
        ref={videoInputRef}
        type="file"
        accept={VIDEO_ACCEPT}
        className="hidden"
        onChange={(e) => {
          handleVideoFile(e.target.files?.[0] ?? null);
          e.target.value = '';
        }}
      />
      <input
        ref={posterInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          handlePosterManual(e.target.files?.[0] ?? null);
          e.target.value = '';
        }}
      />

      {!videoUrl ? (
        /* ── DROPZONE (gaya Static) ── */
        <button
          type="button"
          disabled={busy}
          onClick={() => videoInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            'w-full flex flex-col items-center justify-center gap-2 px-6 py-10 rounded-xl border-2 border-dashed transition-colors text-center',
            dragOver
              ? 'border-ads/60 bg-ads/8'
              : 'border-border hover:border-ads/50 hover:bg-ads/5',
            busy && 'opacity-60 cursor-wait',
          )}
        >
          {busy ? (
            <Loader2 size={22} className="text-ads animate-spin" />
          ) : (
            <UploadCloud size={22} className="text-text-muted" />
          )}
          <span className="text-[12px] font-medium text-text-muted">
            {busy ? 'Mengupload…' : 'Klik atau drag file ke sini'}
          </span>
          <span className="text-[10px] text-text-subtle leading-relaxed">
            <strong className="text-text">.webM</strong> (disarankan — ringan) atau{' '}
            <strong className="text-text">.mp4</strong> · maks {VIDEO_MAX_MB}MB · poster otomatis
          </span>
        </button>
      ) : (
        /* ── PREVIEW (sesudah upload) ── */
        <div className="rounded-xl border border-status-healthy/40 bg-status-healthy/5 p-3 flex flex-col gap-2">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src={videoUrl}
            controls
            muted
            playsInline
            className="w-full rounded-lg max-h-44 bg-black"
          />

          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-status-healthy">
              <Check size={13} />
              {videoKind?.toUpperCase()}
              {src.poster && <span className="text-text-muted font-normal">· poster otomatis ✓</span>}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => videoInputRef.current?.click()}
                className="text-[11px] font-bold text-ads hover:underline"
              >
                Ganti
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={clearAll}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-status-critical hover:underline"
              >
                <X size={12} /> Hapus
              </button>
            </div>
          </div>

          {/* Poster row — subtle, fallback kalau auto gagal / mau ganti */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
            <span className="inline-flex items-center gap-1.5 text-[10px] text-text-subtle">
              <ImageIcon size={11} />
              {src.poster ? 'Poster tampil sebelum video load' : 'Poster belum ada (opsional)'}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => posterInputRef.current?.click()}
              className="text-[10px] font-bold text-text-muted hover:text-ads hover:underline"
            >
              {src.poster ? 'Ganti poster' : 'Tambah poster manual'}
            </button>
          </div>
        </div>
      )}

      {/* Info note */}
      <div className="flex items-start gap-1.5 px-3 py-2 rounded-lg bg-ads/5 border border-ads/20">
        <span className="text-[12px]">💡</span>
        <p className="text-[10px] text-text-muted leading-relaxed">
          Cukup 1 file. <strong className="text-text">webM</strong> jauh lebih ringan dari GIF —
          hemat kuota pembaca Ternate. Browser yang gak dukung webM otomatis pakai poster sebagai
          fallback. Autoplay selalu muted &amp; loop (aturan browser).
        </p>
      </div>
    </div>
  );
}
