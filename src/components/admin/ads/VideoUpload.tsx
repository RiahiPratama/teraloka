'use client';

// ════════════════════════════════════════════════════════════════
// VIDEO UPLOAD — Per-Position MP4 + WebM + Poster
// PATH: src/components/admin/ads/VideoUpload.tsx
// ────────────────────────────────────────────────────────────────
// SESI 10 (24 Mei 2026) — Phase 1 Video Ads
//
// Output: AdVideoSource { mp4, webm, poster }
//   - mp4:    WAJIB (primary, universal device support) — no compress
//   - webm:   OPTIONAL (bandwidth hemat koneksi Ternate)  — no compress
//   - poster: WAJIB (fallback + first-paint sebelum video load)
//             → manual upload ATAU auto-capture frame dari MP4
//
// ⚠️ Supabase bucket 'ads' WAJIB allow video/mp4 + video/webm di
//    allowed_mime_types + file_size_limit >= 5MB (set di Dashboard).
//
// Design notes:
//   - Video TIDAK di-compress (canvas destroy video). Upload as-is.
//   - Poster bisa di-compress (static image, page speed discipline).
//   - Preview pakai <video controls muted> per source.
// ════════════════════════════════════════════════════════════════

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Film, X, Loader2, Upload, Camera, ImageIcon } from 'lucide-react';
import { compressImage, triggerHaptic, formatFileSize } from '@/utils/pwa-utils';
import { useToast } from '@/components/ui/Toast';

// Mirror shared/types.ts AdVideoSource (SESI 10 lock)
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
const POSTER_MAX_MB = 0.5;
const VIDEO_MP4_MIME = 'video/mp4';
const VIDEO_WEBM_MIME = 'video/webm';

type SlotKey = 'mp4' | 'webm' | 'poster';

export default function VideoUpload({ value, onChange, positionLabel }: VideoUploadProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<SlotKey | null>(null);

  const mp4InputRef = useRef<HTMLInputElement>(null);
  const webmInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const src: AdVideoSource = value ?? { mp4: '', webm: null, poster: '' };

  // ─── Helper: emit perubahan ────────────────────────────────────
  function patch(next: Partial<AdVideoSource>) {
    const merged: AdVideoSource = { ...src, ...next };
    // Kalau semua kosong → emit null (clear)
    if (!merged.mp4 && !merged.webm && !merged.poster) {
      onChange(null);
    } else {
      onChange(merged);
    }
  }

  // ─── Core: upload satu file ke Supabase ───────────────────────
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

  // ─── Handler: video (mp4/webm) — NO compress ──────────────────
  async function handleVideo(slot: 'mp4' | 'webm', file: File | null) {
    if (!file) return;

    const expectedMime = slot === 'mp4' ? VIDEO_MP4_MIME : VIDEO_WEBM_MIME;
    if (file.type !== expectedMime) {
      toast.error(`Slot ${slot.toUpperCase()} hanya menerima ${expectedMime}. File: ${file.type || 'unknown'}`);
      triggerHaptic('error');
      return;
    }

    if (file.size > VIDEO_MAX_MB * 1024 * 1024) {
      toast.error(`Video terlalu besar (${formatFileSize(file.size)}). Maks ${VIDEO_MAX_MB}MB.`);
      triggerHaptic('error');
      return;
    }

    setBusy(slot);
    try {
      const url = await uploadToSupabase(file);
      if (url) {
        patch({ [slot]: url } as Partial<AdVideoSource>);
        triggerHaptic('success');
        toast.success(`${slot.toUpperCase()} berhasil diupload`);
      }
    } finally {
      setBusy(null);
    }
  }

  // ─── Handler: poster — compress OK (static image) ─────────────
  async function handlePoster(file: File | null) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Poster harus berupa gambar (JPG/PNG/WebP).');
      triggerHaptic('error');
      return;
    }

    setBusy('poster');
    try {
      // Compress poster (static image — aman, beda dari video)
      let processed = file;
      if (file.type !== 'image/gif') {
        processed = await compressImage(file);
      }

      if (processed.size > POSTER_MAX_MB * 1024 * 1024) {
        toast.error(`Poster terlalu besar (${formatFileSize(processed.size)}). Maks ${POSTER_MAX_MB}MB.`);
        triggerHaptic('error');
        return;
      }

      const url = await uploadToSupabase(processed);
      if (url) {
        patch({ poster: url });
        triggerHaptic('success');
        toast.success('Poster berhasil diupload');
      }
    } finally {
      setBusy(null);
    }
  }

  // ─── Auto-capture poster dari MP4 (frame pertama) ─────────────
  async function captureFromVideo() {
    const videoEl = videoPreviewRef.current;
    if (!videoEl || !src.mp4) {
      toast.error('Upload MP4 dulu sebelum capture poster.');
      return;
    }

    setBusy('poster');
    try {
      // Pastikan video ke-seek ke frame awal + metadata loaded
      await new Promise<void>((resolve, reject) => {
        const onReady = () => resolve();
        if (videoEl.readyState >= 2) {
          resolve();
        } else {
          videoEl.addEventListener('loadeddata', onReady, { once: true });
          videoEl.addEventListener('error', () => reject(new Error('Video load gagal')), { once: true });
        }
      });

      videoEl.currentTime = 0.1; // sedikit offset biar gak black frame
      await new Promise<void>((resolve) => {
        videoEl.addEventListener('seeked', () => resolve(), { once: true });
      });

      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context gagal');
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85),
      );
      if (!blob) throw new Error('Capture frame gagal');

      const posterFile = new File([blob], `poster-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const compressed = await compressImage(posterFile);
      const url = await uploadToSupabase(compressed);
      if (url) {
        patch({ poster: url });
        triggerHaptic('success');
        toast.success('Poster di-capture dari video');
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Auto-capture gagal. Upload poster manual.');
      triggerHaptic('error');
    } finally {
      setBusy(null);
    }
  }

  // ─── Render slot uploader ──────────────────────────────────────
  function renderSlot(
    slot: SlotKey,
    label: string,
    required: boolean,
    hint: string,
    inputRef: React.RefObject<HTMLInputElement | null>,
    accept: string,
    currentUrl: string,
  ) {
    const isBusy = busy === slot;
    return (
      <div style={{
        border: `1px solid ${currentUrl ? '#1B6B4A' : required ? '#E8963A' : '#D1D5DB'}`,
        borderRadius: 10,
        padding: 12,
        background: currentUrl ? '#F0FDF4' : '#FFFFFF',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>
            {label}{required && <span style={{ color: '#E8963A' }}> *</span>}
            {!required && <span style={{ color: '#9CA3AF', fontWeight: 400 }}> (opsional)</span>}
          </span>
          {currentUrl && (
            <button
              type="button"
              onClick={() => patch({ [slot]: slot === 'webm' ? null : '' } as Partial<AdVideoSource>)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center' }}
              aria-label={`Hapus ${label}`}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Preview */}
        {currentUrl && slot !== 'poster' && (
          <video
            ref={slot === 'mp4' ? videoPreviewRef : undefined}
            src={currentUrl}
            controls
            muted
            playsInline
            crossOrigin="anonymous"
            style={{ width: '100%', borderRadius: 6, marginBottom: 8, maxHeight: 160, background: '#000' }}
          />
        )}
        {currentUrl && slot === 'poster' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt="poster" style={{ width: '100%', borderRadius: 6, marginBottom: 8, maxHeight: 160, objectFit: 'contain', background: '#000' }} />
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (slot === 'poster') handlePoster(f);
            else handleVideo(slot, f);
            e.target.value = ''; // reset biar bisa re-pick file sama
          }}
        />

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => inputRef.current?.click()}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB',
              background: isBusy ? '#F3F4F6' : '#FFFFFF', cursor: isBusy ? 'wait' : 'pointer',
              fontSize: 13, fontWeight: 500, color: '#374151',
            }}
          >
            {isBusy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {currentUrl ? 'Ganti' : 'Upload'}
          </button>

          {/* Auto-capture button khusus poster */}
          {slot === 'poster' && src.mp4 && (
            <button
              type="button"
              disabled={isBusy}
              onClick={captureFromVideo}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 8, border: '1px solid #0891B2',
                background: '#ECFEFF', cursor: isBusy ? 'wait' : 'pointer',
                fontSize: 13, fontWeight: 500, color: '#0891B2',
              }}
            >
              <Camera size={15} />
              Capture dari MP4
            </button>
          )}
        </div>

        <p style={{ fontSize: 11, color: '#6B7280', marginTop: 6, marginBottom: 0 }}>{hint}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Film size={18} color="#0891B2" />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#003526' }}>
          Video Creative{positionLabel ? ` — ${positionLabel}` : ''}
        </span>
      </div>

      {renderSlot('mp4', 'File MP4', true,
        `Primary. Export dari Canva (H.264). Maks ${VIDEO_MAX_MB}MB. Universal device support.`,
        mp4InputRef, VIDEO_MP4_MIME, src.mp4)}

      {renderSlot('webm', 'File WebM', false,
        `Optional. Hemat bandwidth (koneksi Ternate). Convert dari MP4 via ffmpeg. Maks ${VIDEO_MAX_MB}MB.`,
        webmInputRef, VIDEO_WEBM_MIME, src.webm ?? '')}

      {renderSlot('poster', 'Poster (Thumbnail)', true,
        `Wajib. Tampil sebelum video load + fallback device lama. Maks ${POSTER_MAX_MB}MB. Bisa auto-capture dari MP4.`,
        posterInputRef, 'image/jpeg,image/png,image/webp', src.poster)}

      <div style={{
        fontSize: 11, color: '#92400E', background: '#FFFBEB',
        border: '1px solid #FDE68A', borderRadius: 8, padding: '8px 10px',
      }}>
        💡 Browser otomatis pilih source pertama yang didukung (MP4 → WebM). Kalau dua-duanya gagal, poster tampil sebagai fallback. Autoplay selalu muted (aturan browser).
      </div>
    </div>
  );
}
