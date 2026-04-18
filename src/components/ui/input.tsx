'use client';

/**
 * TeraLoka — Input
 * Phase 2 · Batch 3b — Form & Input
 * ------------------------------------------------------------
 * Text input primitive dengan optional label + error state + helper text.
 * Support prefix/suffix slot untuk icon atau satuan (Rp, %, dll).
 *
 * Contoh:
 *   <Input
 *     label="Nomor WhatsApp"
 *     type="tel"
 *     value={phone}
 *     onChange={(e) => setPhone(e.target.value)}
 *     placeholder="081234567890"
 *     helperText="Format: 628xxxxxx tanpa spasi"
 *   />
 *
 *   <Input
 *     label="Email"
 *     type="email"
 *     error="Format email tidak valid"
 *   />
 *
 *   <Input
 *     prefix="Rp"
 *     type="number"
 *     placeholder="0"
 *   />
 */

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  label?: string;
  /** Error message — kalau ada, border jadi merah + tampilin di bawah */
  error?: string;
  /** Helper text di bawah input (hidden kalau ada error) */
  helperText?: string;
  /** Required indicator (asterisk merah) */
  required?: boolean;
  /** Konten kiri input (icon, satuan "Rp", dll) */
  prefix?: ReactNode;
  /** Konten kanan input (icon, unit "km", dll) */
  suffix?: ReactNode;
  inputSize?: InputSize;
  /** Wrapper className (container) */
  containerClassName?: string;
}

const INPUT_SIZES: Record<InputSize, string> = {
  sm: 'h-8 text-xs px-2.5',
  md: 'h-[38px] text-sm px-3',
  lg: 'h-11 text-base px-4',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    helperText,
    required,
    prefix,
    suffix,
    inputSize = 'md',
    containerClassName,
    className,
    id,
    disabled,
    ...props
  },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  const hasError = Boolean(error);
  const describedBy = hasError
    ? errorId
    : helperText
      ? helperId
      : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
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

      <div
        className={cn(
          'flex items-center rounded-lg border transition-colors',
          'bg-surface',
          hasError
            ? 'border-status-critical focus-within:border-status-critical focus-within:ring-2 focus-within:ring-status-critical/20'
            : 'border-border focus-within:border-brand-teal focus-within:ring-2 focus-within:ring-brand-teal/15',
          disabled && 'opacity-60 cursor-not-allowed bg-surface-muted'
        )}
      >
        {prefix && (
          <span className="flex items-center pl-3 text-text-muted text-sm shrink-0">
            {prefix}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className={cn(
            'flex-1 bg-transparent outline-none text-text',
            'placeholder:text-text-subtle',
            'disabled:cursor-not-allowed',
            INPUT_SIZES[inputSize],
            prefix && 'pl-2',
            suffix && 'pr-2',
            className
          )}
          {...props}
        />

        {suffix && (
          <span className="flex items-center pr-3 text-text-muted text-sm shrink-0">
            {suffix}
          </span>
        )}
      </div>

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
  );
});
