'use client';

/**
 * TeraLoka — Textarea
 * Phase 2 · Batch 3b — Form & Input
 * ------------------------------------------------------------
 * Multi-line text input dengan optional auto-resize + character counter.
 *
 * Auto-resize:
 * Set `autoResize` prop — textarea tumbuh sesuai konten, dengan
 * `minRows` dan `maxRows` sebagai batas.
 *
 * Character counter:
 * Set `maxLength` + `showCount` — tampilkan "120/500" di pojok kanan.
 * Counter berubah warna kuning saat 90% dan merah saat full.
 *
 * Contoh:
 *   <Textarea
 *     label="Deskripsi listing"
 *     value={desc}
 *     onChange={(e) => setDesc(e.target.value)}
 *     placeholder="Tuliskan deskripsi properti..."
 *     autoResize
 *     minRows={3}
 *     maxRows={10}
 *     maxLength={1000}
 *     showCount
 *   />
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  /** Auto-resize sesuai konten */
  autoResize?: boolean;
  /** Min rows saat autoResize aktif (default 3) */
  minRows?: number;
  /** Max rows saat autoResize aktif (default 10). Lebih dari ini → scroll. */
  maxRows?: number;
  /** Tampilkan character count "X / maxLength" */
  showCount?: boolean;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      label,
      error,
      helperText,
      required,
      autoResize = false,
      minRows = 3,
      maxRows = 10,
      showCount = false,
      maxLength,
      containerClassName,
      className,
      id,
      value,
      onChange,
      disabled,
      ...props
    },
    ref
  ) {
    const autoId = useId();
    const textareaId = id ?? autoId;
    const helperId = `${textareaId}-helper`;
    const errorId = `${textareaId}-error`;
    const innerRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement, []);

    const hasError = Boolean(error);
    const describedBy = hasError
      ? errorId
      : helperText
        ? helperId
        : undefined;

    const currentLength = typeof value === 'string' ? value.length : 0;
    const countWarning = maxLength
      ? currentLength >= maxLength * 0.9
      : false;
    const countCritical = maxLength ? currentLength >= maxLength : false;

    // Auto-resize logic
    const adjustHeight = useCallback(() => {
      const el = innerRef.current;
      if (!el || !autoResize) return;
      // Reset dulu supaya scrollHeight akurat
      el.style.height = 'auto';
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
      const paddingY =
        parseFloat(getComputedStyle(el).paddingTop) +
        parseFloat(getComputedStyle(el).paddingBottom);
      const minHeight = lineHeight * minRows + paddingY;
      const maxHeight = lineHeight * maxRows + paddingY;
      const scrollHeight = el.scrollHeight;

      if (scrollHeight <= maxHeight) {
        el.style.height = `${Math.max(scrollHeight, minHeight)}px`;
        el.style.overflowY = 'hidden';
      } else {
        el.style.height = `${maxHeight}px`;
        el.style.overflowY = 'auto';
      }
    }, [autoResize, minRows, maxRows]);

    // Resize on value change
    useEffect(() => {
      if (autoResize) adjustHeight();
    }, [value, adjustHeight, autoResize]);

    // Initial resize on mount
    useEffect(() => {
      if (autoResize) adjustHeight();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div className={cn('flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label
            htmlFor={textareaId}
            className="text-xs font-semibold text-text-secondary"
          >
            {label}
            {required && (
              <span
                className="ml-0.5 text-status-critical"
                aria-hidden="true"
              >
                *
              </span>
            )}
          </label>
        )}

        <textarea
          ref={innerRef}
          id={textareaId}
          value={value}
          onChange={onChange}
          disabled={disabled}
          maxLength={maxLength}
          rows={autoResize ? minRows : props.rows ?? minRows}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className={cn(
            'w-full rounded-lg border bg-surface px-3 py-2.5',
            'text-sm text-text placeholder:text-text-subtle',
            'outline-none transition-colors resize-y',
            hasError
              ? 'border-status-critical focus:border-status-critical focus:ring-2 focus:ring-status-critical/20'
              : 'border-border focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/15',
            'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-surface-muted',
            autoResize && 'resize-none',
            className
          )}
          {...props}
        />

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {hasError ? (
              <p id={errorId} className="text-xs text-status-critical">
                {error}
              </p>
            ) : helperText ? (
              <p id={helperId} className="text-xs text-text-muted">
                {helperText}
              </p>
            ) : null}
          </div>

          {showCount && maxLength ? (
            <p
              className={cn(
                'text-xs tabular-nums shrink-0',
                countCritical
                  ? 'text-status-critical font-semibold'
                  : countWarning
                    ? 'text-status-warning'
                    : 'text-text-muted'
              )}
              aria-live="polite"
            >
              {currentLength} / {maxLength}
            </p>
          ) : null}
        </div>
      </div>
    );
  }
);
