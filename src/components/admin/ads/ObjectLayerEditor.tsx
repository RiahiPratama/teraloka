// ════════════════════════════════════════════════════════════════
// TeraLoka Ads — ObjectLayerEditor (Banner Studio Phase 6F + 6H)
// PATH: src/components/admin/ads/ObjectLayerEditor.tsx
// ────────────────────────────────────────────────────────────────
// SESI 6 Sub-Phase 6F (22 Mei 2026) — initial Object upload.
// SESI 6 Sub-Phase 6H (22 Mei 2026) — DEFER UPLOAD pattern.
//   File TIDAK langsung di-upload ke Storage. Disimpan di module-level
//   registry (PENDING_OBJECT_FILES Map) + blob: URL untuk preview.
//   Saat AdFormProvider submit dipanggil, helper commitPendingObjectUploads()
//   scan timeline → upload semua file → replace blob: URL dengan public URL.
//   Bucket Supabase TIDAK kepenuhan kalau admin batal save iklan.
//
// WHAT:
//   Editor untuk Object illustration layers per variant. Admin pilih file
//   .gif/.png/.webp (mascot, badge, dekorasi), atur posisi via PositionCanvas
//   reuse, pilih animation mode. File baru di-upload ke Storage saat
//   Save Iklan.
//
// Patterns: AAS, KEKE-2, CCC (defer expensive operation til commit),
//           AAU (state separate dari Storage commit, race-safe).
// ════════════════════════════════════════════════════════════════

import React, { useState, useMemo, useId, useRef } from 'react';
import {
  Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff,
  AlertCircle, CheckCircle, RotateCcw, Image as ImageIcon, Clock, Edit2, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type ObjectLayer,
  type ObjectLayerAnimation,
  type AbsolutePosition,
  type AnimationVariant,
  DEFAULT_ABSOLUTE_POSITION,
} from '@/components/public/ads/AdAnimatedBanner';
import { createClient } from '@/lib/supabase/client';
import PositionCanvas from './PositionCanvas';

// ─── Constants ──────────────────────────────────────────────────

const STORAGE_BUCKET = 'ad-objects';
const MAX_GIF_BYTES    = 2 * 1024 * 1024;   // 2 MB
const MAX_STATIC_BYTES = 500 * 1024;        // 500 KB (PNG/WebP)
const MAX_LAYERS_PER_VARIANT = 5;

const ALLOWED_MIMES = ['image/png', 'image/gif', 'image/webp'] as const;
const ALLOWED_EXTS  = ['png', 'gif', 'webp']                  as const;

const ANIMATION_OPTIONS: { value: ObjectLayerAnimation; label: string; emoji: string }[] = [
  { value: 'none',     label: 'None',     emoji: '⊘'  },
  { value: 'fade_in',  label: 'Fade In',  emoji: '🌫️' },
  { value: 'scale_in', label: 'Scale In', emoji: '🔍' },
];

// ════════════════════════════════════════════════════════════════
// SESI 6 Sub-Phase 6H — DEFER UPLOAD: module-level pending registry
// ════════════════════════════════════════════════════════════════

/**
 * Module-level Map: layer.id → File (raw, belum upload).
 *
 * Lifecycle:
 * 1. Admin pilih file di AddObjectForm → File disimpan di Map dengan key layer.id
 * 2. Layer.image_url = blob: URL (untuk live preview lokal)
 * 3. Saat AdFormProvider submit → call commitPendingObjectUploads()
 *    yang upload semua File di Map ke Storage, replace blob: URL → public URL,
 *    bersihkan Map entry yang udah committed.
 * 4. Admin delete layer → also delete dari Map (cleanup).
 *
 * SCOPE: module singleton (lifetime = page session). Hilang saat page reload.
 * Acceptable: admin reload = lose pending, harus re-upload (rare flow).
 */
const PENDING_OBJECT_FILES: Map<string, File> = new Map();

/**
 * Check if image_url is a blob: URL (file belum committed).
 */
function isBlobUrl(url: string): boolean {
  return url.startsWith('blob:');
}

/**
 * Commit semua pending object files ke Supabase Storage.
 * Iterate timeline.variants[].object_layers[], upload File yang ada di
 * PENDING_OBJECT_FILES Map, replace blob: URL dengan public URL.
 *
 * Return updated `variants` array (immutable — gak mutate input).
 *
 * @param variants - Variant array dari animation_timeline
 * @param advertiserId - Untuk Storage folder prefix (optional)
 * @returns Updated variants dengan public URLs (atau throw kalau upload gagal)
 */
export async function commitPendingObjectUploads(
  variants: AnimationVariant[],
  advertiserId?: string | null,
): Promise<AnimationVariant[]> {
  if (PENDING_OBJECT_FILES.size === 0) return variants;

  const supabase = createClient();
  const folder   = advertiserId ?? 'misc';
  const committedIds = new Set<string>();

  const nextVariants = await Promise.all(
    variants.map(async (variant) => {
      if (!variant.object_layers || variant.object_layers.length === 0) return variant;

      const nextLayers = await Promise.all(
        variant.object_layers.map(async (layer) => {
          // Skip kalau bukan blob: URL (sudah committed atau loaded dari DB)
          if (!isBlobUrl(layer.image_url)) return layer;

          const file = PENDING_OBJECT_FILES.get(layer.id);
          if (!file) {
            // Edge case: blob URL tapi file gak di Map (lost reference)
            console.warn(`[commitPendingObjectUploads] No File ditemukan untuk layer ${layer.id}`);
            return layer;
          }

          const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
          const safeName  = layer.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30) || 'object';
          const timestamp = Date.now();
          const storagePath = `${folder}/${safeName}-${timestamp}-${layer.id.slice(-6)}.${ext}`;

          const { error: uploadErr } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, file, {
              cacheControl: '31536000',
              upsert:       false,
              contentType:  file.type,
            });
          if (uploadErr) {
            throw new Error(`Upload object "${layer.name}" gagal: ${uploadErr.message}`);
          }

          const { data: urlData } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(storagePath);

          // Revoke blob URL setelah upload sukses (free memory)
          try { URL.revokeObjectURL(layer.image_url); } catch {}
          committedIds.add(layer.id);

          return { ...layer, image_url: urlData.publicUrl };
        }),
      );

      return { ...variant, object_layers: nextLayers };
    }),
  );

  // Cleanup committed entries dari Map
  for (const id of committedIds) {
    PENDING_OBJECT_FILES.delete(id);
  }

  return nextVariants;
}

// ─── Helpers ────────────────────────────────────────────────────

function generateLayerId(): string {
  return `obj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function detectExt(fileName: string): string | null {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (!ext) return null;
  return (ALLOWED_EXTS as readonly string[]).includes(ext) ? ext : null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getMaxSize(ext: string): number {
  return ext === 'gif' ? MAX_GIF_BYTES : MAX_STATIC_BYTES;
}

// ─── Read image dimensions (for default width/height) ──────────

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth || 100, height: img.naturalHeight || 100 });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 100, height: 100 });
    };
    img.src = url;
  });
}

// ─── Props ──────────────────────────────────────────────────────

export interface ObjectLayerEditorProps {
  layers:       ObjectLayer[];
  onChange:     (layers: ObjectLayer[]) => void;
  bannerWidth:  number;
  bannerHeight: number;
  /** Advertiser ID untuk Storage path prefix (folder per advertiser).
   *  Optional — kalau null, upload pakai path 'misc/' */
  advertiserId?: string | null;
}

// ─── Main Component ─────────────────────────────────────────────

export default function ObjectLayerEditor({
  layers,
  onChange,
  bannerWidth,
  bannerHeight,
  advertiserId,
}: ObjectLayerEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  // SESI 6 UX polish — auto-expand layer baru setelah add
  // Supaya admin gak perlu klik "Atur" lagi, PositionCanvas langsung visible.
  const [autoExpandId, setAutoExpandId] = useState<string | null>(null);

  const atLimit = layers.length >= MAX_LAYERS_PER_VARIANT;

  const addLayer = (layer: ObjectLayer) => {
    onChange([...layers, layer]);
    setAutoExpandId(layer.id);   // Mark for auto-expand
  };

  const updateLayer = (id: string, patch: Partial<ObjectLayer>) => {
    onChange(layers.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const deleteLayer = (id: string) => {
    if (!window.confirm('Hapus object ini?')) return;
    // SESI 6H: cleanup pending file + revoke blob URL kalau ada
    const layer = layers.find((l) => l.id === id);
    if (layer && isBlobUrl(layer.image_url)) {
      try { URL.revokeObjectURL(layer.image_url); } catch {}
    }
    PENDING_OBJECT_FILES.delete(id);
    onChange(layers.filter((l) => l.id !== id));
  };

  const moveLayer = (id: string, direction: 'up' | 'down') => {
    const idx = layers.findIndex((l) => l.id === id);
    if (idx < 0) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= layers.length) return;
    const next = [...layers];
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wide">
          <ImageIcon className="w-3 h-3" />
          Object Layers (PNG / GIF / WebP)
          {layers.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-orange-600 text-white text-[9px] font-bold">
              {layers.length}/{MAX_LAYERS_PER_VARIANT}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          disabled={atLimit && !showAddForm}
          className={cn(
            'flex items-center gap-1 px-2 py-1 text-[10px] rounded font-bold transition',
            atLimit && !showAddForm
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              : showAddForm
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                : 'bg-orange-600 text-white hover:bg-orange-700'
          )}
          title={atLimit ? `Max ${MAX_LAYERS_PER_VARIANT} object per variant` : ''}
        >
          <Plus className="w-3 h-3" />
          {showAddForm ? 'Tutup' : atLimit ? 'Max tercapai' : 'Tambah Object'}
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <AddObjectForm
          onAdd={(layer) => {
            addLayer(layer);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
          advertiserId={advertiserId}
        />
      )}

      {/* Empty state */}
      {layers.length === 0 && !showAddForm && (
        <div className="p-3 rounded-md border-2 border-dashed border-gray-300 dark:border-gray-600 text-center">
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Belum ada object. Klik <span className="font-bold text-orange-600">+ Tambah Object</span> untuk upload mascot/badge/logo/dekorasi.
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
            Support: .png .gif .webp · max 500 KB (static) / 2 MB (GIF animated)
          </p>
        </div>
      )}

      {/* Layer cards */}
      {layers.length > 0 && (
        <div className="space-y-2">
          {layers.map((layer, idx) => (
            <ObjectCard
              key={layer.id}
              layer={layer}
              index={idx}
              total={layers.length}
              onUpdate={(patch) => updateLayer(layer.id, patch)}
              onDelete={() => deleteLayer(layer.id)}
              onMove={(dir) => moveLayer(layer.id, dir)}
              bannerWidth={bannerWidth}
              bannerHeight={bannerHeight}
              defaultExpanded={autoExpandId === layer.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENT: AddObjectForm (upload + metadata)
// ════════════════════════════════════════════════════════════════

interface AddObjectFormProps {
  onAdd:        (layer: ObjectLayer) => void;
  onCancel:     () => void;
  advertiserId?: string | null;
}

function AddObjectForm({ onAdd, onCancel, advertiserId }: AddObjectFormProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const ext = useMemo(() => (file ? detectExt(file.name) : null), [file]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      setPreviewUrl(null);
      setDimensions(null);
      return;
    }

    // Validate ext
    const fileExt = detectExt(f.name);
    if (!fileExt) {
      setErrorMsg(`Format gak didukung. Pakai: ${ALLOWED_EXTS.join(', ')}`);
      setFile(null);
      return;
    }

    // Validate MIME (defense in depth — ext bisa di-rename, MIME lebih reliable)
    if (!(ALLOWED_MIMES as readonly string[]).includes(f.type)) {
      setErrorMsg(`MIME type gak didukung: ${f.type}. Pakai PNG, GIF, atau WebP.`);
      setFile(null);
      return;
    }

    // Validate size
    const maxSize = getMaxSize(fileExt);
    if (f.size > maxSize) {
      setErrorMsg(
        `File terlalu besar (${formatSize(f.size)}). Max ${formatSize(maxSize)} untuk .${fileExt}. ` +
        `Coba kompres via TinyPNG / Squoosh.`
      );
      setFile(null);
      return;
    }

    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));

    // Auto-detect dimensions
    const dims = await readImageDimensions(f);
    setDimensions(dims);

    // Auto-fill name kalau masih kosong
    if (!name) {
      const baseName = f.name.replace(/\.[^.]+$/, '').slice(0, 50);
      setName(baseName);
    }
  };

  const handleSubmit = () => {
    setErrorMsg(null);

    if (!file || !ext || !dimensions) {
      setErrorMsg('Pilih file dulu');
      return;
    }
    if (!name.trim() || name.trim().length < 2) {
      setErrorMsg('Nama object minimal 2 karakter');
      return;
    }

    // SESI 6 Sub-Phase 6H — DEFER UPLOAD pattern:
    // 1. Create blob: URL untuk preview lokal (live render via engine)
    // 2. Register File di PENDING_OBJECT_FILES Map dengan layer.id key
    // 3. Saat AdFormProvider submit → commitPendingObjectUploads()
    //    upload semua file ke Storage + replace URLs
    const layerId  = generateLayerId();
    const blobUrl  = URL.createObjectURL(file);

    PENDING_OBJECT_FILES.set(layerId, file);

    const newLayer: ObjectLayer = {
      id:          layerId,
      name:        name.trim(),
      image_url:   blobUrl,                   // blob: URL — replaced saat Save Iklan
      position:    { ...DEFAULT_ABSOLUTE_POSITION },
      // Auto-scale dimensions kalau kebesaran (max default 120px)
      width:       Math.min(dimensions.width,  120),
      height:      Math.min(dimensions.height, 120),
      animation:   'fade_in',
      delay_ms:    0,
      duration_ms: 800,
      z_index:     5,
      visible:     true,
    };

    onAdd(newLayer);
  };

  const canSubmit = !!file && !!name.trim() && !!dimensions;

  return (
    <div className="p-3 rounded-md border-2 border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-900/15 space-y-2">
      {/* File picker */}
      <div>
        <label className="block text-[10px] font-bold text-orange-700 dark:text-orange-300 mb-0.5">
          File Object <span className="text-red-500">*</span>
          <span className="ml-2 font-normal text-gray-500">
            .png / .gif / .webp · max 500 KB static, 2 MB GIF
          </span>
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="block w-full text-[11px] text-gray-700 dark:text-gray-200
                     file:mr-2 file:py-1 file:px-2 file:rounded file:border-0
                     file:text-[10px] file:font-bold file:bg-orange-600 file:text-white
                     hover:file:bg-orange-700 file:cursor-pointer
                     disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {file && previewUrl && (
          <div className="mt-2 flex items-center gap-2">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-16 h-16 object-contain rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            />
            <div className="text-[10px] text-orange-700 dark:text-orange-300 space-y-0.5">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span className="font-mono">{file.name}</span>
              </div>
              <div className="text-gray-500 dark:text-gray-400">
                {formatSize(file.size)} · {dimensions ? `${dimensions.width}×${dimensions.height}px` : 'reading...'} · {ext?.toUpperCase()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Name input */}
      <div>
        <label className="block text-[10px] font-bold text-orange-700 dark:text-orange-300 mb-0.5">
          Nama Object
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          placeholder="contoh: Mascot Lebaran, Badge Promo"
          className="w-full px-2 py-1 text-[11px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-orange-500 focus:outline-none disabled:opacity-50"
        />
      </div>

      {/* Error / Step messages */}
      {errorMsg && (
        <div className="flex items-start gap-1.5 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700">
          <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-red-700 dark:text-red-300">{errorMsg}</p>
        </div>
      )}
      {/* SESI 6H — Info defer-upload: file di-upload saat Save Iklan */}
      {file && !errorMsg && (
        <div className="flex items-start gap-2 p-2 rounded bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-700">
          <Clock className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-orange-700 dark:text-orange-300 leading-snug">
            File akan di-upload ke Storage <span className="font-bold">saat kamu klik "Simpan Iklan"</span>.
            Saat ini preview pakai memori browser.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1 border-t border-orange-200 dark:border-orange-800">
        <button
          type="button"
          onClick={onCancel}
          className="px-2.5 py-1 text-[10px] font-bold rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="px-3 py-1 text-[10px] font-bold rounded bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Tambah Object
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENT: ObjectCard (per-layer edit)
// ════════════════════════════════════════════════════════════════

interface ObjectCardProps {
  layer:        ObjectLayer;
  index:        number;
  total:        number;
  onUpdate:     (patch: Partial<ObjectLayer>) => void;
  onDelete:     () => void;
  onMove:       (direction: 'up' | 'down') => void;
  bannerWidth:  number;
  bannerHeight: number;
  /** SESI 6 UX polish: auto-expand new layer langsung supaya PositionCanvas visible */
  defaultExpanded?: boolean;
}

function ObjectCard({
  layer, index, total, onUpdate, onDelete, onMove,
  bannerWidth, bannerHeight, defaultExpanded,
}: ObjectCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const reactId = useId();
  const visible = layer.visible !== false;

  return (
    <div className={cn(
      'rounded-md border-2 p-2 transition',
      visible
        ? 'border-orange-300 dark:border-orange-700 bg-orange-50/30 dark:bg-orange-900/10'
        : 'border-gray-300 dark:border-gray-600 bg-gray-50/30 dark:bg-gray-800/30 opacity-70'
    )}>
      {/* Card header */}
      <div className="flex items-center gap-2">
        {/* Thumbnail */}
        <img
          src={layer.image_url}
          alt={layer.name}
          className="flex-shrink-0 w-10 h-10 object-contain rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
        />

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={layer.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            maxLength={50}
            className="w-full px-1.5 py-0.5 text-[11px] rounded border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-orange-500 bg-transparent text-gray-900 dark:text-gray-100 font-bold focus:outline-none"
          />
          <div className="flex items-center gap-1.5 px-1.5 text-[9px] text-gray-500 dark:text-gray-400 font-mono">
            <span>{layer.width}×{layer.height}px</span>
            <span>·</span>
            <span>posisi ({layer.position.x}, {layer.position.y})</span>
            <span>·</span>
            <span>{layer.animation} {layer.delay_ms}+{layer.duration_ms}ms</span>
          </div>
          {!expanded && (
            <p className="px-1.5 mt-0.5 text-[9px] text-orange-600/80 dark:text-orange-400/80 italic">
              💡 Klik <span className="font-bold not-italic">Atur</span> untuk geser posisi, resize, ganti animasi
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onUpdate({ visible: !visible })}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title={visible ? 'Hide layer' : 'Show layer'}
          >
            {visible
              ? <Eye  className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
              : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
          </button>
          <button
            type="button"
            onClick={() => onMove('up')}
            disabled={index === 0}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Z-index lebih rendah"
          >
            <ChevronUp className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            type="button"
            onClick={() => onMove('down')}
            disabled={index === total - 1}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Z-index lebih tinggi"
          >
            <ChevronDown className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={cn(
              'flex items-center gap-1 px-2 py-1 text-[10px] rounded font-bold transition',
              expanded
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                : 'bg-orange-600 text-white hover:bg-orange-700'
            )}
            title={expanded ? 'Tutup pengaturan' : 'Atur posisi, ukuran, animasi'}
          >
            {expanded ? (
              <>
                <X className="w-3 h-3" />
                Tutup
              </>
            ) : (
              <>
                <Edit2 className="w-3 h-3" />
                Atur
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
            title="Hapus layer"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
          </button>
        </div>
      </div>

      {/* Expanded controls */}
      {expanded && (
        <div className="mt-2.5 pt-2.5 border-t border-orange-200 dark:border-orange-800 space-y-2.5">
          {/* Position canvas */}
          <div>
            <label className="block text-[10px] font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wide mb-1">
              📍 Geser Posisi Object (drag titik biru)
            </label>
            <PositionCanvas
              bannerWidth={bannerWidth}
              bannerHeight={bannerHeight}
              position={layer.position}
              elementLabel="OBJ"
              elementSize={{ width: layer.width, height: layer.height }}
              onChange={(pos) => onUpdate({ position: pos })}
              snapGrid={5}
            />
          </div>

          {/* W/H/Z */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor={`${reactId}-w`} className="block text-[9px] font-bold text-orange-700 dark:text-orange-300 mb-0.5">
                Width (px)
              </label>
              <input
                id={`${reactId}-w`}
                type="number"
                value={layer.width}
                onChange={(e) => {
                  const w = parseInt(e.target.value, 10);
                  if (!Number.isNaN(w) && w > 0) onUpdate({ width: w });
                }}
                min={1}
                step={5}
                className="w-full px-2 py-1 text-[11px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-orange-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label htmlFor={`${reactId}-h`} className="block text-[9px] font-bold text-orange-700 dark:text-orange-300 mb-0.5">
                Height (px)
              </label>
              <input
                id={`${reactId}-h`}
                type="number"
                value={layer.height}
                onChange={(e) => {
                  const h = parseInt(e.target.value, 10);
                  if (!Number.isNaN(h) && h > 0) onUpdate({ height: h });
                }}
                min={1}
                step={5}
                className="w-full px-2 py-1 text-[11px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-orange-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label htmlFor={`${reactId}-z`} className="block text-[9px] font-bold text-orange-700 dark:text-orange-300 mb-0.5">
                Z-index (1-30)
              </label>
              <input
                id={`${reactId}-z`}
                type="number"
                value={layer.z_index ?? 5}
                onChange={(e) => {
                  const z = parseInt(e.target.value, 10);
                  if (!Number.isNaN(z) && z >= 1 && z <= 30) onUpdate({ z_index: z });
                }}
                min={1}
                max={30}
                step={1}
                className="w-full px-2 py-1 text-[11px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-orange-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Animation/Delay/Duration */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor={`${reactId}-anim`} className="block text-[9px] font-bold text-orange-700 dark:text-orange-300 mb-0.5">
                Animation
              </label>
              <select
                id={`${reactId}-anim`}
                value={layer.animation}
                onChange={(e) => onUpdate({ animation: e.target.value as ObjectLayerAnimation })}
                className="w-full px-2 py-1 text-[11px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-orange-500 focus:outline-none"
              >
                {ANIMATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.emoji} {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${reactId}-delay`} className="block text-[9px] font-bold text-orange-700 dark:text-orange-300 mb-0.5">
                Delay (ms)
              </label>
              <input
                id={`${reactId}-delay`}
                type="number"
                value={layer.delay_ms}
                onChange={(e) => {
                  const d = parseInt(e.target.value, 10);
                  if (!Number.isNaN(d) && d >= 0) onUpdate({ delay_ms: d });
                }}
                min={0}
                step={100}
                disabled={layer.animation === 'none'}
                className="w-full px-2 py-1 text-[11px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-orange-500 focus:outline-none font-mono disabled:opacity-50"
              />
            </div>
            <div>
              <label htmlFor={`${reactId}-dur`} className="block text-[9px] font-bold text-orange-700 dark:text-orange-300 mb-0.5">
                Duration (ms)
              </label>
              <input
                id={`${reactId}-dur`}
                type="number"
                value={layer.duration_ms}
                onChange={(e) => {
                  const d = parseInt(e.target.value, 10);
                  if (!Number.isNaN(d) && d >= 100) onUpdate({ duration_ms: d });
                }}
                min={100}
                step={100}
                disabled={layer.animation === 'none'}
                className="w-full px-2 py-1 text-[11px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-orange-500 focus:outline-none font-mono disabled:opacity-50"
              />
            </div>
          </div>

          {/* Reset position */}
          <button
            type="button"
            onClick={() => onUpdate({ position: { ...DEFAULT_ABSOLUTE_POSITION } })}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/30 font-bold"
          >
            <RotateCcw className="w-3 h-3" />
            Reset position
          </button>
        </div>
      )}
    </div>
  );
}
