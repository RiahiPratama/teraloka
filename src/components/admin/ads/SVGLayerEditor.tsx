'use client';

// ════════════════════════════════════════════════════════════════
// TeraLoka Ads — SVGLayerEditor (Banner Studio V2)
// PATH: src/components/admin/ads/SVGLayerEditor.tsx
// ────────────────────────────────────────────────────────────────
// SESI 6 Sub-Phase 6D Batch 6D.2 (22 Mei 2026) — TD-ANIM-102 NEW.
//
// WHAT:
//   Editor untuk SVG illustration layers per variant. Admin power user paste
//   SVG markup dari Inkscape/Figma/Illustrator, atur posisi via PositionCanvas
//   reuse, pilih animation mode, dan preview live sanitized.
//
// FEATURES (Batch 6D.2 MVP — paste-only):
//   ✅ Add new layer (paste textarea → sanitize → auto-extract dimensions)
//   ✅ List existing layers dengan reorder (up/down) + delete
//   ✅ Per-layer card: name, position (PositionCanvas reuse), size, animation, delay/duration
//   ✅ Live sanitized preview thumbnail
//   ✅ 3 animation mode: none / fade_in / scale_in
//   ✅ Z-index control (1-30)
//   ✅ Visible toggle
//
// DEFER Phase 6E / 7:
//   ⏸ File upload + Storage bucket
//   ⏸ draw_on path animation
//   ⏸ Cross-variant SVG library
//   ⏸ Symbol picker (built-in clipart)
//
// PERSONA: Admin power user — paste workflow OK (Inkscape File→Save As Plain SVG → paste).
//
// Patterns: AAS (admin folder), KEKE-2 (power user), TTT (React 19 native typed),
//           Defense in Depth (sanitize on save → trust on render).
// ════════════════════════════════════════════════════════════════

import React, { useState, useMemo, useId } from 'react';
import {
  Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff,
  AlertCircle, CheckCircle, FileCode2, RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type SVGLayer,
  type SVGLayerAnimation,
  type AbsolutePosition,
  DEFAULT_ABSOLUTE_POSITION,
} from '@/components/public/ads/AdAnimatedBanner';
import { processSvg, MAX_SVG_BYTES } from '@/lib/ads/svg-parser';
import PositionCanvas from './PositionCanvas';

// ─── Constants ──────────────────────────────────────────────────

const ANIMATION_OPTIONS: { value: SVGLayerAnimation; label: string; emoji: string }[] = [
  { value: 'none',     label: 'None',     emoji: '⊘'  },
  { value: 'fade_in',  label: 'Fade In',  emoji: '🌫️' },
  { value: 'scale_in', label: 'Scale In', emoji: '🔍' },
];

const DEFAULT_NEW_LAYER_NAME = 'Layer baru';

// ─── Helper: generate stable layer id ───────────────────────────

function generateLayerId(): string {
  return `svg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Props ──────────────────────────────────────────────────────

export interface SVGLayerEditorProps {
  /** Current layers array (from variant.svg_layers) */
  layers: SVGLayer[];
  /** Replace layers callback */
  onChange: (layers: SVGLayer[]) => void;
  /** Banner dims untuk PositionCanvas reuse */
  bannerWidth:  number;
  bannerHeight: number;
}

// ─── Main component ─────────────────────────────────────────────

export default function SVGLayerEditor({
  layers,
  onChange,
  bannerWidth,
  bannerHeight,
}: SVGLayerEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  // ── CRUD helpers ──────────────────────────────────────────────
  const addLayer = (layer: SVGLayer) => {
    onChange([...layers, layer]);
  };

  const updateLayer = (id: string, patch: Partial<SVGLayer>) => {
    onChange(layers.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const deleteLayer = (id: string) => {
    if (!window.confirm('Hapus layer ini?')) return;
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
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
          <FileCode2 className="w-3 h-3" />
          SVG Illustration Layers
          {layers.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold">
              {layers.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className={cn(
            'flex items-center gap-1 px-2 py-1 text-[10px] rounded font-bold transition',
            showAddForm
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          )}
        >
          <Plus className="w-3 h-3" />
          {showAddForm ? 'Tutup' : 'Tambah Layer'}
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <>
          {/* SESI 6F: Curated free SVG sources untuk admin discovery */}
          <details className="rounded border border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-900/10 px-2.5 py-1.5">
            <summary className="cursor-pointer text-[10px] font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100">
              💡 Sumber SVG gratis (quality bagus)
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
              <a href="https://heroicons.com/" target="_blank" rel="noreferrer" className="px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                🎨 <span className="font-bold">Heroicons</span> · UI icons · MIT
              </a>
              <a href="https://lucide.dev/" target="_blank" rel="noreferrer" className="px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                ✨ <span className="font-bold">Lucide</span> · 5800+ icons · ISC
              </a>
              <a href="https://tabler.io/icons" target="_blank" rel="noreferrer" className="px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                🔷 <span className="font-bold">Tabler Icons</span> · 5400+ · MIT
              </a>
              <a href="https://undraw.co/illustrations" target="_blank" rel="noreferrer" className="px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                🖼️ <span className="font-bold">unDraw</span> · illustrations · gratis
              </a>
              <a href="https://www.svgrepo.com/" target="_blank" rel="noreferrer" className="px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                📦 <span className="font-bold">SVG Repo</span> · 500K+ · mix MIT/CC0
              </a>
              <a href="https://phosphoricons.com/" target="_blank" rel="noreferrer" className="px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                ⚡ <span className="font-bold">Phosphor</span> · icons + shapes · MIT
              </a>
            </div>
            <p className="mt-2 text-[9px] text-emerald-700/70 dark:text-emerald-300/70 italic">
              Cara pakai: buka source → cari icon → "Copy SVG" atau download .svg → buka dengan text editor → copy markup → paste di bawah.
              Phase 7+ akan ada Lottie animation support.
            </p>
          </details>

          <AddLayerForm
            onAdd={(layer) => {
              addLayer(layer);
              setShowAddForm(false);
            }}
            onCancel={() => setShowAddForm(false)}
            bannerWidth={bannerWidth}
            bannerHeight={bannerHeight}
          />
        </>
      )}

      {/* Empty state */}
      {layers.length === 0 && !showAddForm && (
        <div className="p-3 rounded-md border-2 border-dashed border-gray-300 dark:border-gray-600 text-center">
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Belum ada SVG layer. Klik <span className="font-bold text-emerald-600">+ Tambah Layer</span> untuk paste markup dari Inkscape/Figma.
          </p>
        </div>
      )}

      {/* Layer cards */}
      {layers.length > 0 && (
        <div className="space-y-2">
          {layers.map((layer, idx) => (
            <LayerCard
              key={layer.id}
              layer={layer}
              index={idx}
              total={layers.length}
              onUpdate={(patch) => updateLayer(layer.id, patch)}
              onDelete={() => deleteLayer(layer.id)}
              onMove={(dir) => moveLayer(layer.id, dir)}
              bannerWidth={bannerWidth}
              bannerHeight={bannerHeight}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENT: AddLayerForm
// ════════════════════════════════════════════════════════════════

interface AddLayerFormProps {
  onAdd:    (layer: SVGLayer) => void;
  onCancel: () => void;
  bannerWidth:  number;
  bannerHeight: number;
}

function AddLayerForm({ onAdd, onCancel, bannerWidth, bannerHeight }: AddLayerFormProps) {
  const [markup, setMarkup] = useState('');
  const [name, setName] = useState(DEFAULT_NEW_LAYER_NAME);

  // Process markup live (sanitize + validate + extract)
  const processed = useMemo(() => {
    if (!markup.trim()) return null;
    return processSvg(markup);
  }, [markup]);

  const canSubmit = !!processed?.validation.valid && !!processed.sanitized && name.trim().length > 0;

  const handleAdd = () => {
    if (!processed || !processed.validation.valid) return;
    const newLayer: SVGLayer = {
      id:          generateLayerId(),
      name:        name.trim() || DEFAULT_NEW_LAYER_NAME,
      svg_markup:  processed.sanitized,
      position:    { ...DEFAULT_ABSOLUTE_POSITION },
      width:       processed.dimensions.width,
      height:      processed.dimensions.height,
      animation:   'fade_in',
      delay_ms:    0,
      duration_ms: 800,
      z_index:     5,
      visible:     true,
    };
    onAdd(newLayer);
  };

  return (
    <div className="p-3 rounded-md border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/15 space-y-2">
      {/* Name input */}
      <div>
        <label className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-300 mb-0.5">
          Nama Layer
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          placeholder="e.g. Burst icon, Logo accent"
          className="w-full px-2 py-1 text-[11px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
        />
      </div>

      {/* Markup textarea */}
      <div>
        <label className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-300 mb-0.5">
          SVG Markup <span className="font-normal text-gray-500">(paste dari Inkscape/Figma — File → Save As Plain SVG)</span>
        </label>
        <textarea
          value={markup}
          onChange={(e) => setMarkup(e.target.value)}
          placeholder={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n  <circle cx="50" cy="50" r="40" fill="#1B6B4A" />\n</svg>`}
          rows={6}
          className="w-full px-2 py-1 text-[10px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono resize-y"
        />
        <p className="mt-0.5 text-[9px] text-gray-500 dark:text-gray-400">
          Max {(MAX_SVG_BYTES / 1024)} KB · Optimize via <a href="https://jakearchibald.github.io/svgomg/" target="_blank" rel="noreferrer" className="underline text-emerald-600">SVGOMG</a>
        </p>
      </div>

      {/* Validation feedback */}
      {processed && !processed.validation.valid && (
        <div className="flex items-start gap-1.5 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700">
          <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-red-700 dark:text-red-300">{processed.validation.error}</p>
        </div>
      )}
      {processed && processed.validation.valid && processed.validation.warning && (
        <div className="flex items-start gap-1.5 p-2 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-700 dark:text-amber-300">{processed.validation.warning}</p>
        </div>
      )}
      {processed && processed.validation.valid && (
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-300">
          <CheckCircle className="w-3.5 h-3.5" />
          <span className="font-bold">Valid</span>
          <span className="text-gray-500">·</span>
          <span className="font-mono">{processed.dimensions.width}×{processed.dimensions.height}px</span>
          <span className="text-gray-500">({processed.dimensions.source})</span>
        </div>
      )}

      {/* Live sanitized preview */}
      {processed && processed.sanitized && (
        <div>
          <label className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-300 mb-0.5">
            Preview (sanitized)
          </label>
          <div
            className="inline-block p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 max-w-[200px] max-h-[120px] overflow-hidden"
            dangerouslySetInnerHTML={{ __html: processed.sanitized }}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1 border-t border-emerald-200 dark:border-emerald-800">
        <button
          type="button"
          onClick={onCancel}
          className="px-2.5 py-1 text-[10px] font-bold rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canSubmit}
          className="px-3 py-1 text-[10px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Tambah Layer
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENT: LayerCard (per-layer edit)
// ════════════════════════════════════════════════════════════════

interface LayerCardProps {
  layer:        SVGLayer;
  index:        number;
  total:        number;
  onUpdate:     (patch: Partial<SVGLayer>) => void;
  onDelete:     () => void;
  onMove:       (direction: 'up' | 'down') => void;
  bannerWidth:  number;
  bannerHeight: number;
}

function LayerCard({
  layer, index, total, onUpdate, onDelete, onMove,
  bannerWidth, bannerHeight,
}: LayerCardProps) {
  const [expanded, setExpanded] = useState(false);
  const reactId = useId();

  const visible = layer.visible !== false;

  return (
    <div className={cn(
      'rounded-md border-2 p-2 transition',
      visible
        ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-900/10'
        : 'border-gray-300 dark:border-gray-600 bg-gray-50/30 dark:bg-gray-800/30 opacity-70'
    )}>
      {/* Card header (always visible) */}
      <div className="flex items-center gap-2">
        {/* Thumbnail */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden flex items-center justify-center"
          dangerouslySetInnerHTML={{ __html: layer.svg_markup }}
        />

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={layer.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            maxLength={50}
            className="w-full px-1.5 py-0.5 text-[11px] rounded border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-emerald-500 bg-transparent text-gray-900 dark:text-gray-100 font-bold focus:outline-none"
          />
          <div className="flex items-center gap-1.5 px-1.5 text-[9px] text-gray-500 dark:text-gray-400 font-mono">
            <span>{layer.width}×{layer.height}px</span>
            <span>·</span>
            <span>({layer.position.x}, {layer.position.y})</span>
            <span>·</span>
            <span>{layer.animation} {layer.delay_ms}+{layer.duration_ms}ms</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5">
          {/* Visible toggle */}
          <button
            type="button"
            onClick={() => onUpdate({ visible: !visible })}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title={visible ? 'Hide layer' : 'Show layer'}
          >
            {visible
              ? <Eye  className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
          </button>

          {/* Move up */}
          <button
            type="button"
            onClick={() => onMove('up')}
            disabled={index === 0}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move up (z-index lower)"
          >
            <ChevronUp className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
          </button>

          {/* Move down */}
          <button
            type="button"
            onClick={() => onMove('down')}
            disabled={index === total - 1}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move down (z-index higher)"
          >
            <ChevronDown className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
          </button>

          {/* Expand / Collapse */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="px-1.5 py-0.5 text-[10px] rounded font-bold bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {expanded ? '−' : '+'}
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
            title="Delete layer"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
          </button>
        </div>
      </div>

      {/* Expanded controls */}
      {expanded && (
        <div className="mt-2.5 pt-2.5 border-t border-emerald-200 dark:border-emerald-800 space-y-2.5">
          {/* Position canvas */}
          <PositionCanvas
            bannerWidth={bannerWidth}
            bannerHeight={bannerHeight}
            position={layer.position}
            elementLabel="SVG"
            elementSize={{ width: layer.width, height: layer.height }}
            onChange={(pos) => onUpdate({ position: pos })}
            snapGrid={5}
          />

          {/* Width/Height + Z-index */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor={`${reactId}-w`} className="block text-[9px] font-bold text-emerald-700 dark:text-emerald-300 mb-0.5">
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
                className="w-full px-2 py-1 text-[11px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label htmlFor={`${reactId}-h`} className="block text-[9px] font-bold text-emerald-700 dark:text-emerald-300 mb-0.5">
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
                className="w-full px-2 py-1 text-[11px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label htmlFor={`${reactId}-z`} className="block text-[9px] font-bold text-emerald-700 dark:text-emerald-300 mb-0.5">
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
                className="w-full px-2 py-1 text-[11px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Animation + Delay/Duration */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor={`${reactId}-anim`} className="block text-[9px] font-bold text-emerald-700 dark:text-emerald-300 mb-0.5">
                Animation
              </label>
              <select
                id={`${reactId}-anim`}
                value={layer.animation}
                onChange={(e) => onUpdate({ animation: e.target.value as SVGLayerAnimation })}
                className="w-full px-2 py-1 text-[11px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                {ANIMATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.emoji} {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${reactId}-delay`} className="block text-[9px] font-bold text-emerald-700 dark:text-emerald-300 mb-0.5">
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
                className="w-full px-2 py-1 text-[11px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono disabled:opacity-50"
              />
            </div>
            <div>
              <label htmlFor={`${reactId}-dur`} className="block text-[9px] font-bold text-emerald-700 dark:text-emerald-300 mb-0.5">
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
                className="w-full px-2 py-1 text-[11px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono disabled:opacity-50"
              />
            </div>
          </div>

          {/* Reset position button */}
          <button
            type="button"
            onClick={() => onUpdate({ position: { ...DEFAULT_ABSOLUTE_POSITION } })}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 font-bold"
          >
            <RotateCcw className="w-3 h-3" />
            Reset position
          </button>
        </div>
      )}
    </div>
  );
}
