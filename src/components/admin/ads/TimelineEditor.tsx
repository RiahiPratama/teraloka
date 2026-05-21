'use client';

// ════════════════════════════════════════════════════════════════
// TeraLoka Ads — TimelineEditor (Multi-Element Timing Visualizer)
// PATH: src/components/admin/ads/TimelineEditor.tsx
// ────────────────────────────────────────────────────────────────
// SESI 6 Sub-Phase 6D Batch 6D.1 (22 Mei 2026) — TD-ANIM-106 NEW.
//
// WHAT:
//   Horizontal timeline editor 4-element (logo/headline/body/cta) untuk
//   atur delay_ms + duration_ms via drag-drop visual. Mirror UX pattern
//   PositionCanvas (TD-103) tapi domain berbeda (waktu vs ruang).
//
// FEATURES (Batch 6D.1 MVP):
//   ✅ Time ruler atas (0s, 1s, 2s, dst tiap 1000ms gridline)
//   ✅ 4 track rows per element dengan colored bar segment
//   ✅ Bar position = delay_ms, length = duration_ms (linear scale)
//   ✅ 3 drag zones per bar:
//      - Left edge → resize start (adjust delay, duration inversely)
//      - Middle → move whole bar (delay shifts, duration stays)
//      - Right edge → resize end (duration changes, delay stays)
//   ✅ Snap-to-grid 100ms default + Shift = skip snap
//   ✅ "Over" warning badge kalau bar extend past variantDurationMs
//   ✅ Real-time tooltip saat drag: delay/duration/end values
//   ✅ Click-to-focus highlight active element
//   ✅ Visual mute kalau element animation='none' atau visible=false
//
// DEFER (Phase 7+):
//   ⏸ Touch drag handlers (admin desktop primary)
//   ⏸ Keyboard nudge arrow keys
//   ⏸ Stagger presets ("Auto-stagger 200ms", "All sync")
//   ⏸ Multi-select drag (drag multiple bars in sync)
//
// PERSONA: Admin power user (founder). Visual sync coordination antar 4 element.
//
// Patterns: KEKE-2 (admin power user explicit), AAS (admin folder), TTT (React 19).
// ════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ElementKey } from '@/components/public/ads/AdAnimatedBanner';

// ─── Types ──────────────────────────────────────────────────────

export interface TimelineElementData {
  key:         ElementKey;
  label:       string;       // Display: 'Logo', 'Headline', 'Body', 'CTA'
  visible:     boolean;
  animated:    boolean;       // false jika animation === 'none' (visual mute)
  delay_ms:    number;
  duration_ms: number;
}

export interface TimelineEditorProps {
  /** Total variant cycle duration in ms (default 4000) */
  variantDurationMs: number;
  /** Per-element timing data, 4 elements order: logo/headline/body/cta */
  elements:          TimelineElementData[];
  /** Callback patch per element */
  onChange:          (key: ElementKey, patch: { delay_ms?: number; duration_ms?: number }) => void;
  /** Snap grid ms (default 100). Set 1 untuk no-snap. */
  snapMs?:           number;
  /** Max display width (default 460px fit Advanced editor column) */
  maxWidth?:         number;
}

// ─── Constants ──────────────────────────────────────────────────

const TRACK_HEIGHT_PX = 28;
const RULER_HEIGHT_PX = 18;
const EDGE_HANDLE_PX  = 8;    // hit zone for left/right edge resize
const MIN_DURATION_MS = 100;  // engine constraint
const MAX_DELAY_MS    = 10_000; // safety upper bound (engine soft)
const MAX_DURATION_MS = 10_000;

// Color per element key (visual differentiate)
const ELEMENT_COLOR: Record<ElementKey, { bg: string; bgActive: string; border: string; text: string }> = {
  logo:     { bg: 'bg-amber-500/80',  bgActive: 'bg-amber-500',  border: 'border-amber-600',  text: 'text-amber-50' },
  headline: { bg: 'bg-purple-500/80', bgActive: 'bg-purple-500', border: 'border-purple-600', text: 'text-purple-50' },
  body:     { bg: 'bg-blue-500/80',   bgActive: 'bg-blue-500',   border: 'border-blue-600',   text: 'text-blue-50' },
  cta:      { bg: 'bg-green-500/80',  bgActive: 'bg-green-500',  border: 'border-green-600',  text: 'text-green-50' },
};

// ─── Drag state machine ─────────────────────────────────────────

type DragMode = 'move' | 'resize_left' | 'resize_right' | null;

interface DragState {
  key:               ElementKey;
  mode:              DragMode;
  startMouseX:       number;
  startDelay:        number;
  startDuration:     number;
}

// ─── Component ──────────────────────────────────────────────────

export default function TimelineEditor({
  variantDurationMs,
  elements,
  onChange,
  snapMs   = 100,
  maxWidth = 460,
}: TimelineEditorProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  // ── Local state ────────────────────────────────────────────────
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [activeKey, setActiveKey] = useState<ElementKey | null>(null);

  // ── Scale: ms → px ─────────────────────────────────────────────
  const pxPerMs = maxWidth / variantDurationMs;

  // ── Snap helper ────────────────────────────────────────────────
  const snap = useCallback(
    (ms: number): number => {
      if (shiftHeld || snapMs <= 1) return Math.round(ms);
      return Math.round(ms / snapMs) * snapMs;
    },
    [shiftHeld, snapMs]
  );

  // ── Drag listeners (global mousemove/up while dragging) ────────
  useEffect(() => {
    if (!dragState) return;

    const handleMove = (e: MouseEvent) => {
      const deltaPx = e.clientX - dragState.startMouseX;
      const deltaMs = deltaPx / pxPerMs;

      const el = elements.find((x) => x.key === dragState.key);
      if (!el) return;

      if (dragState.mode === 'move') {
        // Shift whole bar: delay changes, duration stays
        const newDelay = Math.max(0, Math.min(MAX_DELAY_MS, dragState.startDelay + deltaMs));
        onChange(dragState.key, { delay_ms: snap(newDelay) });
      } else if (dragState.mode === 'resize_left') {
        // Drag left edge: delay shifts forward, duration shrinks (end stays)
        const endMs       = dragState.startDelay + dragState.startDuration;
        const newDelay    = Math.max(0, Math.min(endMs - MIN_DURATION_MS, dragState.startDelay + deltaMs));
        const newDuration = endMs - newDelay;
        onChange(dragState.key, {
          delay_ms:    snap(newDelay),
          duration_ms: snap(Math.max(MIN_DURATION_MS, newDuration)),
        });
      } else if (dragState.mode === 'resize_right') {
        // Drag right edge: duration changes only (start stays)
        const newDuration = Math.max(MIN_DURATION_MS, Math.min(MAX_DURATION_MS, dragState.startDuration + deltaMs));
        onChange(dragState.key, { duration_ms: snap(newDuration) });
      }
    };

    const handleUp = () => setDragState(null);

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

    // Cursor global override
    document.body.style.cursor =
      dragState.mode === 'move'         ? 'grabbing' :
      dragState.mode === 'resize_left'  ? 'w-resize' :
      dragState.mode === 'resize_right' ? 'e-resize' : '';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup',   handleUp);
      document.removeEventListener('keydown',   handleKeyDown);
      document.removeEventListener('keyup',     handleKeyUp);
      document.body.style.cursor    = '';
      document.body.style.userSelect = '';
    };
  }, [dragState, pxPerMs, snap, elements, onChange]);

  // ── Drag start handler ─────────────────────────────────────────
  const handleDragStart = (
    e:    React.MouseEvent,
    key:  ElementKey,
    mode: 'move' | 'resize_left' | 'resize_right'
  ) => {
    const el = elements.find((x) => x.key === key);
    if (!el) return;
    setActiveKey(key);
    setShiftHeld(e.shiftKey);
    setDragState({
      key,
      mode,
      startMouseX:   e.clientX,
      startDelay:    el.delay_ms,
      startDuration: el.duration_ms,
    });
    e.preventDefault();
    e.stopPropagation();
  };

  // ── Ruler gridline positions ───────────────────────────────────
  // 1000ms gridlines kalau total >= 2s, atau 500ms gridlines kalau < 2s
  const gridStepMs = variantDurationMs >= 2000 ? 1000 : 500;
  const gridLines: number[] = [];
  for (let ms = 0; ms <= variantDurationMs; ms += gridStepMs) {
    gridLines.push(ms);
  }

  return (
    <div className="space-y-1.5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
          <Clock className="w-3 h-3" />
          Timeline Editor
        </div>
        <div className={cn(
          'text-[10px] italic transition-colors',
          dragState
            ? shiftHeld
              ? 'text-purple-700 dark:text-purple-300 font-bold'
              : 'text-amber-700 dark:text-amber-300 font-bold'
            : 'text-gray-500 dark:text-gray-400'
        )}>
          {dragState
            ? shiftHeld
              ? '⇧ Free drag'
              : `Snap ${snapMs}ms`
            : `Hold ⇧ skip snap · ${variantDurationMs / 1000}s cycle`}
        </div>
      </div>

      {/* ── Timeline canvas ── */}
      <div
        ref={trackRef}
        className="relative rounded-md border-2 border-gray-300 dark:border-gray-600 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 overflow-hidden select-none"
        style={{ width: maxWidth }}
      >
        {/* Time ruler */}
        <div
          className="relative border-b border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-900/50"
          style={{ height: RULER_HEIGHT_PX }}
        >
          {gridLines.map((ms) => (
            <div
              key={ms}
              className="absolute top-0 bottom-0 flex items-center"
              style={{ left: ms * pxPerMs }}
            >
              <div className="w-px h-2 bg-gray-400 dark:bg-gray-500" />
              <span className="ml-0.5 text-[8px] font-mono text-gray-500 dark:text-gray-400">
                {ms === 0 ? '0' : ms >= 1000 ? `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s` : `${ms}`}
              </span>
            </div>
          ))}
        </div>

        {/* Element tracks */}
        {elements.map((el) => {
          const colors    = ELEMENT_COLOR[el.key];
          const isActive  = activeKey === el.key;
          const isDragging = dragState?.key === el.key;
          const muted     = !el.visible || !el.animated;

          const barLeftPx  = Math.max(0, el.delay_ms * pxPerMs);
          const barWidthPx = Math.max(EDGE_HANDLE_PX * 2 + 4, el.duration_ms * pxPerMs);
          const endMs      = el.delay_ms + el.duration_ms;
          const isOver     = endMs > variantDurationMs;

          return (
            <div
              key={el.key}
              onClick={() => setActiveKey(el.key)}
              className={cn(
                'relative border-b border-gray-200 dark:border-gray-700 last:border-b-0',
                isActive && 'bg-purple-50/30 dark:bg-purple-900/10'
              )}
              style={{ height: TRACK_HEIGHT_PX }}
            >
              {/* Track label (left side) */}
              <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-600 dark:text-gray-300 z-10 pointer-events-none">
                {el.label}
              </div>

              {/* Bar segment */}
              <div
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 rounded transition-all border-2 flex items-center',
                  colors.bg,
                  isActive && colors.bgActive,
                  colors.border,
                  isDragging && 'ring-2 ring-purple-400 shadow-lg z-20',
                  muted && 'opacity-30',
                )}
                style={{
                  left:   barLeftPx,
                  width:  barWidthPx,
                  height: TRACK_HEIGHT_PX - 8,
                }}
              >
                {/* Left edge resize handle */}
                <div
                  onMouseDown={(e) => handleDragStart(e, el.key, 'resize_left')}
                  className={cn(
                    'absolute left-0 top-0 bottom-0 cursor-w-resize',
                    'hover:bg-white/40 transition-colors'
                  )}
                  style={{ width: EDGE_HANDLE_PX }}
                  title={`Drag kiri = resize start (delay ${el.delay_ms}ms)`}
                />

                {/* Middle (move) handle */}
                <div
                  onMouseDown={(e) => handleDragStart(e, el.key, 'move')}
                  className={cn(
                    'absolute top-0 bottom-0 cursor-grab active:cursor-grabbing',
                    'flex items-center justify-center font-bold text-[9px]',
                    colors.text
                  )}
                  style={{
                    left:  EDGE_HANDLE_PX,
                    right: EDGE_HANDLE_PX,
                  }}
                  title={`Drag tengah = pindah (delay ${el.delay_ms}ms · duration ${el.duration_ms}ms)`}
                >
                  {/* Show timing inside bar kalau cukup space */}
                  {barWidthPx > 70 && (
                    <span className="font-mono">{el.delay_ms}+{el.duration_ms}ms</span>
                  )}
                </div>

                {/* Right edge resize handle */}
                <div
                  onMouseDown={(e) => handleDragStart(e, el.key, 'resize_right')}
                  className={cn(
                    'absolute right-0 top-0 bottom-0 cursor-e-resize',
                    'hover:bg-white/40 transition-colors'
                  )}
                  style={{ width: EDGE_HANDLE_PX }}
                  title={`Drag kanan = resize end (duration ${el.duration_ms}ms)`}
                />
              </div>

              {/* Over-cycle warning */}
              {isOver && !muted && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1 rounded bg-orange-500 text-white text-[8px] font-bold pointer-events-none z-10"
                  style={{
                    left: Math.min(barLeftPx + barWidthPx + 2, maxWidth - 50),
                  }}
                >
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Over
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Per-element summary (compact, color-coded) ── */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] font-mono">
        {elements.map((el) => {
          const colors = ELEMENT_COLOR[el.key];
          const muted = !el.visible || !el.animated;
          return (
            <div
              key={el.key}
              className={cn('flex items-center gap-1', muted && 'opacity-50')}
            >
              <span className={cn('w-2 h-2 rounded', colors.bg.replace('/80', ''))} />
              <span className="font-bold text-gray-700 dark:text-gray-300">{el.label}:</span>
              <span className="text-purple-700 dark:text-purple-300">
                {el.delay_ms}+{el.duration_ms}={el.delay_ms + el.duration_ms}ms
              </span>
              {muted && <span className="text-gray-400 italic ml-1">muted</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
