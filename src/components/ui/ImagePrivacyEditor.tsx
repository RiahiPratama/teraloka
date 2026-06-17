'use client';

// [FOTO-PRIVACY-EDITOR] Editor privasi foto PUBLIK (cover + proof) — pure Canvas 2D, nol lib,
// client-side. Owner drag kotak di area sensitif → blur / mosaic / kotak hitam / crop, lalu
// "Pakai" (upload hasil) atau "Lewati" (upload asli). HANYA untuk bucket publik 'campaigns';
// KTP penerima (kyc) TIDAK pakai editor (wajib tajam buat verifikasi admin).
//
// Caveat ditangani: EXIF (createImageBitmap imageOrientation), touch (Pointer Events),
// export resolusi ASLI (canvas internal = dimensi gambar), blur radius skala ke ukuran gambar,
// memory (bitmap.close() saat unmount).

import { useEffect, useRef, useState } from 'react';
import { X, Droplet, Grid3x3, SquareDashedBottom, Crop, Undo2, RotateCcw, Check } from 'lucide-react';

type Mode = 'blur' | 'mosaic' | 'redact' | 'crop';
interface Rect { x: number; y: number; w: number; h: number }
interface Op { type: 'blur' | 'mosaic' | 'redact'; rect: Rect }

const MODES: { key: Mode; label: string; Icon: any }[] = [
  { key: 'blur',   label: 'Blur',        Icon: Droplet },
  { key: 'mosaic', label: 'Mosaic',      Icon: Grid3x3 },
  { key: 'redact', label: 'Kotak Hitam', Icon: SquareDashedBottom },
  { key: 'crop',   label: 'Crop',        Icon: Crop },
];

function normRect(a: { x: number; y: number }, b: { x: number; y: number }): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

function applyOp(ctx: CanvasRenderingContext2D, bmp: ImageBitmap, op: Op) {
  const { x, y, w, h } = op.rect;
  if (op.type === 'redact') {
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y, w, h);
    return;
  }
  if (op.type === 'blur') {
    // radius skala ke ukuran region + gambar (bukan fixed)
    const r = Math.max(8, Math.round(Math.min(w, h) * 0.03 + Math.min(bmp.width, bmp.height) * 0.012));
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.filter = `blur(${r}px)`;
    ctx.drawImage(bmp, 0, 0);
    ctx.filter = 'none';
    ctx.restore();
    return;
  }
  // mosaic: downscale → upscale tanpa smoothing
  const f = Math.max(8, Math.round(Math.min(w, h) / 12));
  const tw = Math.max(1, Math.round(w / f));
  const th = Math.max(1, Math.round(h / f));
  const tmp = document.createElement('canvas');
  tmp.width = tw; tmp.height = th;
  const tctx = tmp.getContext('2d')!;
  tctx.imageSmoothingEnabled = false;
  tctx.drawImage(bmp, x, y, w, h, 0, 0, tw, th);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, tw, th, x, y, w, h);
  ctx.restore();
}

export default function ImagePrivacyEditor({
  file,
  onApply,
  onSkip,
  onCancel,
}: {
  file: File;
  onApply: (edited: File) => void;
  onSkip: () => void;
  onCancel: () => void;
}) {
  const baseRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const bmpRef = useRef<ImageBitmap | null>(null);
  const dragRef = useRef<{ start: { x: number; y: number }; cur: { x: number; y: number } } | null>(null);

  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>('blur');
  const [ops, setOps] = useState<Op[]>([]);
  const [crop, setCrop] = useState<Rect | null>(null);
  const [exporting, setExporting] = useState(false);

  // ── Load bitmap (EXIF-safe) + size canvas ke resolusi asli ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let bmp: ImageBitmap;
      try {
        bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch {
        bmp = await createImageBitmap(file);
      }
      if (cancelled) { bmp.close?.(); return; }
      bmpRef.current = bmp;
      const c = baseRef.current, o = overlayRef.current;
      if (c && o) {
        c.width = bmp.width; c.height = bmp.height;
        o.width = bmp.width; o.height = bmp.height;
      }
      setReady(true);
    })();
    return () => { cancelled = true; bmpRef.current?.close?.(); bmpRef.current = null; };
  }, [file]);

  // ── Redraw base (gambar + efek ter-bake) ──
  function redrawBase() {
    const bmp = bmpRef.current, c = baseRef.current;
    if (!bmp || !c) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0);
    for (const op of ops) applyOp(ctx, bmp, op);
  }

  // ── Redraw overlay (outline region + crop dim + live drag) ──
  function redrawOverlay() {
    const o = overlayRef.current;
    if (!o) return;
    const ctx = o.getContext('2d')!;
    ctx.clearRect(0, 0, o.width, o.height);
    const lw = Math.max(2, Math.round(o.width * 0.003));

    ctx.setLineDash([]);
    ctx.lineWidth = lw;
    ctx.strokeStyle = 'rgba(74,222,128,0.9)';
    for (const op of ops) ctx.strokeRect(op.rect.x, op.rect.y, op.rect.w, op.rect.h);

    if (crop) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, o.width, o.height);
      ctx.clearRect(crop.x, crop.y, crop.w, crop.h);
      ctx.strokeStyle = '#fff';
      ctx.setLineDash([8, 5]);
      ctx.lineWidth = lw;
      ctx.strokeRect(crop.x, crop.y, crop.w, crop.h);
      ctx.restore();
    }

    const d = dragRef.current;
    if (d) {
      const r = normRect(d.start, d.cur);
      ctx.save();
      ctx.setLineDash([8, 5]);
      ctx.lineWidth = lw;
      ctx.strokeStyle = mode === 'redact' ? '#111827' : mode === 'crop' ? '#fff' : '#4ADE80';
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      if (mode !== 'crop') {
        ctx.fillStyle = 'rgba(74,222,128,0.15)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
      }
      ctx.restore();
    }
  }

  // Re-bake + overlay saat state berubah
  useEffect(() => {
    if (!ready) return;
    redrawBase();
    redrawOverlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, ops, crop, mode]);

  // ── Pointer (mouse + touch) ──
  function toImg(e: React.PointerEvent) {
    const o = overlayRef.current!;
    const r = o.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (o.width / r.width),
      y: (e.clientY - r.top) * (o.height / r.height),
    };
  }
  function onDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = toImg(e);
    dragRef.current = { start: p, cur: p };
    redrawOverlay();
  }
  function onMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    dragRef.current.cur = toImg(e);
    redrawOverlay();
  }
  function onUp() {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    const r = normRect(d.start, d.cur);
    if (r.w < 6 || r.h < 6) { redrawOverlay(); return; } // abaikan klik/region mini
    if (mode === 'crop') setCrop(r);
    else setOps(prev => [...prev, { type: mode, rect: r }]);
  }

  function undo() {
    if (ops.length) setOps(p => p.slice(0, -1));
    else if (crop) setCrop(null);
  }
  function reset() { setOps([]); setCrop(null); }

  const hasEdits = ops.length > 0 || !!crop;

  async function apply() {
    const c = baseRef.current;
    if (!c) return;
    setExporting(true);
    let out: HTMLCanvasElement = c;
    if (crop) {
      const t = document.createElement('canvas');
      t.width = Math.max(1, Math.round(crop.w));
      t.height = Math.max(1, Math.round(crop.h));
      t.getContext('2d')!.drawImage(c, crop.x, crop.y, crop.w, crop.h, 0, 0, t.width, t.height);
      out = t;
    }
    const type = file.type || 'image/jpeg';
    out.toBlob(
      (blob) => {
        if (!blob) { setExporting(false); return; }
        onApply(new File([blob], file.name, { type }));
      },
      type,
      0.92,
    );
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.75)', display: 'flex', flexDirection: 'column' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: '#0D1117', borderBottom: '1px solid #1F2937' }}>
        <p className="text-sm font-bold text-white">Sembunyikan area sensitif</p>
        <button type="button" onClick={onCancel} aria-label="Tutup"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:bg-white/10">
          <X size={16} />
        </button>
      </div>

      {/* Toolbar mode */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto shrink-0" style={{ background: '#111827' }}>
        {MODES.map(({ key, label, Icon }) => {
          const active = mode === key;
          return (
            <button key={key} type="button" onClick={() => setMode(key)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors"
              style={{
                background: active ? '#4ADE80' : 'transparent',
                color: active ? '#06231A' : '#9CA3AF',
                border: `1px solid ${active ? '#4ADE80' : '#1F2937'}`,
              }}>
              <Icon size={14} /> {label}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={undo} disabled={!hasEdits}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
            style={{ color: '#9CA3AF', border: '1px solid #1F2937' }}>
            <Undo2 size={14} /> Undo
          </button>
          <button type="button" onClick={reset} disabled={!hasEdits}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
            style={{ color: '#9CA3AF', border: '1px solid #1F2937' }}>
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4" style={{ minHeight: 0 }}>
        <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', lineHeight: 0 }}>
          <canvas ref={baseRef} style={{ display: 'block', maxWidth: '100%', maxHeight: '70vh', height: 'auto', borderRadius: 8 }} />
          <canvas
            ref={overlayRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              touchAction: 'none', cursor: 'crosshair', borderRadius: 8,
            }}
          />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-300">Memuat foto…</div>
          )}
        </div>
      </div>

      {/* Hint */}
      <p className="text-center text-[11px] px-4 pb-1 shrink-0" style={{ color: '#9CA3AF' }}>
        Drag kotak di wajah / plat / dokumen. Bisa beberapa area. {crop ? 'Crop aktif.' : ''}
      </p>

      {/* Footer */}
      <div className="flex gap-3 px-4 py-3 shrink-0" style={{ background: '#0D1117', borderTop: '1px solid #1F2937' }}>
        <button type="button" onClick={onSkip} disabled={exporting}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
          style={{ background: 'transparent', border: '1px solid #1F2937', color: '#9CA3AF' }}>
          Lewati (pakai asli)
        </button>
        <button type="button" onClick={apply} disabled={exporting || !ready}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
          style={{ background: '#4ADE80', color: '#06231A' }}>
          <Check size={16} /> {exporting ? 'Memproses…' : hasEdits ? 'Pakai (hasil edit)' : 'Pakai'}
        </button>
      </div>
    </div>
  );
}
