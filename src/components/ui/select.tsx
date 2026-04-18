'use client';

/**
 * TeraLoka — Select
 * Phase 2 · Batch 3b — Form & Input
 * ------------------------------------------------------------
 * Styled native <select>. Kita sengaja pakai native (bukan custom
 * dropdown) karena:
 * - Zero bundle cost (no headless-ui, no radix)
 * - Native keyboard + search-by-type jalan otomatis
 * - Mobile-friendly (pakai native picker OS)
 * - Accessibility built-in
 *
 * Contoh:
 *   <Select
 *     label="Status"
 *     value={status}
 *     onChange={(e) => setStatus(e.target.value)}
 *     options={[
 *       { value: 'all',      label: 'Semua' },
 *       { value: 'pending',  label: 'Pending' },
 *       { value: 'approved', label: 'Approved' },
 *     ]}
 *   />
 *
 *   // Atau pakai children <option> manual kalau butuh grouping:
 *   <Select label="Kota">
 *     <optgroup label="Maluku Utara">
 *       <option value="ternate">Ternate</option>
 *       <option value="tidore">Tidore</option>
 *     </optgroup>
 *   </Select>
 */

import {
  forwardRef,
  useId,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  /** Options array — alternatif dari children */
  options?: SelectOption[];
  /** Placeholder option (value="") — ditampilkan paling atas */
  placeholder?: string;
  selectSize?: SelectSize;
  containerClassName?: string;
  children?: ReactNode;
}

const SELECT_SIZES: Record<SelectSize, string> = {
  sm: 'h-8 text-xs pl-2.5 pr-8',
  md: 'h-[38px] text-sm pl-3 pr-9',
  lg: 'h-11 text-base pl-4 pr-10',
};

const CHEVRON_POSITION: Record<SelectSize, string> = {
  sm: 'right-2',
  md: 'right-2.5',
  lg: 'right-3',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      label,
      error,
      helperText,
      required,
      options,
      placeholder,
      selectSize = 'md',
      containerClassName,
      className,
      id,
      disabled,
      children,
      ...props
    },
    ref
  ) {
    const autoId = useId();
    const selectId = id ?? autoId;
    const helperId = `${selectId}-helper`;
    const errorId = `${selectId}-error`;

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
            htmlFor={selectId}
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

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={hasError || undefined}
            aria-describedby={describedBy}
            aria-required={required || undefined}
            className={cn(
              'w-full appearance-none rounded-lg border bg-surface',
              'text-text transition-colors outline-none',
              'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-surface-muted',
              hasError
                ? 'border-status-critical focus:border-status-critical focus:ring-2 focus:ring-status-critical/20'
                : 'border-border focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/15',
              SELECT_SIZES[selectSize],
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options
              ? options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <ChevronDown
            size={14}
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute top-1/2 -translate-y-1/2',
              'text-text-muted',
              CHEVRON_POSITION[selectSize]
            )}
          />
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
  }
);
