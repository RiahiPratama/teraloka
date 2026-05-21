'use client';

// ════════════════════════════════════════════════════════════════
// TeraLoka Ads — PositionCanvas (Drag-Drop Pixel Positioning)
// PATH: src/components/admin/ads/PositionCanvas.tsx
// ────────────────────────────────────────────────────────────────
// SESI 6 Sub-Phase 6C Batch 6C.2 (22 Mei 2026) — TD-ANIM-103 NEW.
//
// WHAT:
//   Interactive canvas mini-banner yang user bisa drag element box
//   untuk atur posisi absolute. Pengganti X/Y number input (yang masih
//   available di precision section).
//
// FEATURES (Batch 6C.2 MVP):
//   ✅ Banner outline + center crosshair guide
//   ✅ Active element box draggable (mouse only)
//   ✅ Snap-to-grid 5px default (configurable)
//   ✅ Shift held = skip snap (free-form precision drag)
//   ✅ Real-time coord display saat dragging
//   ✅ Reset button to default position
//   ✅ Backward compat: pure UI component, gak touch DB / persistence
//
// DEFER (Phase 6D):
//   ⏸ Ghost outlines elemen lain (spatial context multi-element)
//   ⏸ Rule-of-thirds dashed grid
//   ⏸ Touch drag handlers (mobile = read-only via Custom XY inputs)
//   ⏸ Smart alignment snap (snap ke center elemen lain)
//
// PERSONA: Admin power user (founder). Mouse drag-drop pattern standard.
//
// Patterns: KEKE-2 (admin power user explicit mode), AAS (admin folder),
//           TTT (React 19 native typed CSS).
// ════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, Move } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type AbsolutePosition,
  DEFAULT_ABSOLUTE_POSITION,
} from '@/components/public/ads/AdAnimatedBanner';

// ─── Types ──────────────────────────────────────────────────────

export interface PositionCanvasProps {
  /** Banner real width in px (from previewWidth prop) */
  bannerWidth:  number;
  /** Banner real height in px (from previewHeight prop) */
  bannerHeight: number;
  /** Current absolute position to render + edit */
  position:     AbsolutePosition;
  /** Short label di element box: 'L', 'H', 'B', 'C' */
  elementLabel: string;
  /** Approximate element box size untuk visual placeholder
   *  (engine gak hard-set element width — gunakan ini sebagai indikator) */
  elementSize?: { width: number; height: number };
  /** Callback saat posisi berubah (drag atau reset) */
  onChange:     (pos: AbsolutePosition) => void;
  /** Snap grid in px. Default 5. Set 1 untuk no-snap. */
  snapGrid?:    number;
  /** Max canvas display width. Default 280px (fit Advanced Editor column). */
  canvasMaxWidth?: number;
}

// ─── Component ──────────────────────────────────────────────────

export default function PositionCanvas({
  bannerWidth,
  bannerHeight,
  position,
  elementLabel,
  elementSize    = { width: 60, height: 24 },
  onChange,
  snapGrid       = 5,
  canvasMaxWidth = 280,
}: PositionCanvasProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // ── Local state ────────────────────────────────────────────────
  const [dragging, setDragging] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);

  // dragOffset: jarak dari titik klik ke top-left element box (untuk drag akurat)
  const dragOffset = useRef({ x: 0, y: 0 });

  // ── Scale calculation ──────────────────────────────────────────
  // Canvas display width fit max, banner width scaled accordingly.
  const scale          = canvasMaxWidth / bannerWidth;
  const canvasHeight   = Math.round(bannerHeight * scale);
  const boxWidthPx     = Math.max(20, Math.round(elementSize.width  * scale));
  const boxHeightPx    = Math.max(16, Math.round(elementSize.height * scale));

  // ── Snap helper ────────────────────────────────────────────────
  const snap = useCallback(
    (value: number): number => {
      if (shiftHeld || snapGrid <= 1) return Math.round(value);
      return Math.round(value / snapGrid) * snapGrid;
    },
    [shiftHeld, snapGrid]
  );

  // ── Drag handlers (global mousemove/mouseup while dragging) ────
  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();

      // Mouse relative to canvas top-left, minus drag offset, divided by scale
      const xPx = (e.clientX - rect.left - dragOffset.current.x) / scale;
      const yPx = (e.clientY - rect.top  - dragOffset.current.y) / scale;

      onChange({
        x:    snap(xPx),
        y:    snap(yPx),
        unit: 'px',
      });
    };

    const handleUp = () => setDragging(false);

    // Shift key tracking — global listener (active hanya saat dragging)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(false);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup',   handleUp);
    document.addEventListener('keydown',   handleKeyDown);
    document.addEventListener('keyup',     handleKeyUp);

    // Cursor global override saat dragging
    document.body.style.cursor    = 'grabbing';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup',   handleUp);
      document.removeEventListener('keydown',   handleKeyDown);
      document.removeEventListener('keyup',     handleKeyUp);
      document.body.style.cursor    = '';
      document.body.style.userSelect = '';
    };
  }, [dragging, scale, snap, onChange]);

  // ── Mouse down on element box → start drag ────────────────────
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setShiftHeld(e.shiftKey);
    setDragging(true);
    e.preventDefault();
  };

  // ── Reset button handler ───────────────────────────────────────
  const handleReset = useCallback(() => {
    onChange({ ...DEFAULT_ABSOLUTE_POSITION });
  }, [onChange]);

  // ── Out-of-bounds detection (visual warning) ───────────────────
  const isOutOfBounds =
    position.x < 0 ||
    position.y < 0 ||
    position.x > bannerWidth  ||
    position.y > bannerHeight;

  // ── Visual coord in canvas (scaled) ────────────────────────────
  const canvasBoxLeft = Math.round(position.x * scale);
  const canvasBoxTop  = Math.round(position.y * scale);

  return (
    <div className="space-y-1.5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
          <Move className="w-3 h-3" />
          Drag-Drop Canvas
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 font-bold"
          title={`Reset ke default (${DEFAULT_ABSOLUTE_POSITION.x}, ${DEFAULT_ABSOLUTE_POSITION.y})`}
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* ── Canvas ── */}
      <div
        ref={canvasRef}
        className={cn(
          'relative rounded-md border-2 overflow-hidden select-none',
          'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900',
          isOutOfBounds
            ? 'border-orange-400 dark:border-orange-600'
            : 'border-gray-400 dark:border-gray-600'
        )}
        style={{
          width:  canvasMaxWidth,
          height: canvasHeight,
        }}
      >
        {/* Center crosshair (guide lines) */}
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-400/30 dark:bg-gray-500/30 pointer-events-none" />
        <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-400/30 dark:bg-gray-500/30 pointer-events-none" />

        {/* Corner markers untuk visual reference */}
        <div className="absolute top-1 left-1 text-[8px] text-gray-400 dark:text-gray-500 font-mono pointer-events-none">0,0</div>
        <div className="absolute bottom-1 right-1 text-[8px] text-gray-400 dark:text-gray-500 font-mono pointer-events-none">
          {bannerWidth},{bannerHeight}
        </div>

        {/* Active element box (draggable) */}
        <div
          onMouseDown={handleMouseDown}
          className={cn(
            'absolute flex items-center justify-center rounded transition-shadow font-bold text-[10px]',
            'border-2 border-purple-600 bg-purple-200/90 dark:bg-purple-800/60',
            'text-purple-900 dark:text-purple-100',
            dragging
              ? 'cursor-grabbing shadow-lg ring-2 ring-purple-400 dark:ring-purple-500 z-10'
              : 'cursor-grab hover:bg-purple-300/90 dark:hover:bg-purple-700/70'
          )}
          style={{
            left:   canvasBoxLeft,
            top:    canvasBoxTop,
            width:  boxWidthPx,
            height: boxHeightPx,
            // Subtle visual hint: element box centered on coord
            // (real engine renders dari top-left, so this matches)
          }}
          title={`Drag untuk pindah · Shift = skip snap · current (${position.x}, ${position.y})`}
        >
          {elementLabel}
        </div>

        {/* Out-of-bounds warning overlay */}
        {isOutOfBounds && (
          <div className="absolute top-1 right-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-orange-500 text-white pointer-events-none">
            Off-canvas
          </div>
        )}
      </div>

      {/* ── Coord display + Shift hint ── */}
      <div className="flex items-center justify-between text-[10px]">
        <div className="font-mono text-amber-700 dark:text-amber-300">
          X: <span className="font-bold text-[12px]">{position.x}</span>
          <span className="mx-1 text-gray-400">·</span>
          Y: <span className="font-bold text-[12px]">{position.y}</span>
          <span className="ml-1 text-gray-500">px</span>
        </div>
        <div className={cn(
          'italic transition-colors',
          dragging
            ? shiftHeld
              ? 'text-purple-700 dark:text-purple-300 font-bold'
              : 'text-amber-700 dark:text-amber-300 font-bold'
            : 'text-gray-500 dark:text-gray-400'
        )}>
          {dragging
            ? shiftHeld
              ? '⇧ Free drag'
              : `Snap ${snapGrid}px`
            : 'Hold ⇧ skip snap'}
        </div>
      </div>
    </div>
  );
}
