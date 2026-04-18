'use client';

/**
 * TeraLoka — SearchInput
 * Phase 2 · Batch 3b — Form & Input
 * ------------------------------------------------------------
 * Input khusus untuk search — icon magnifying glass di kiri + clear
 * button X di kanan (muncul otomatis kalau ada value).
 *
 * Controlled component:
 *   const [q, setQ] = useState('');
 *   <SearchInput
 *     value={q}
 *     onChange={(val) => setQ(val)}
 *     placeholder="Cari laporan..."
 *   />
 *
 * onSearch optional — dipanggil saat Enter ditekan (buat explicit search
 * terpisah dari debounced typing).
 *   <SearchInput
 *     value={q}
 *     onChange={setQ}
 *     onSearch={(val) => fetchResults(val)}
 *   />
 *
 * Note: onChange di sini bukan event-based tapi terima string langsung
 * — beda dari native input untuk simplify usage.
 */

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type SearchSize = 'sm' | 'md' | 'lg';

export interface SearchInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'size' | 'onChange' | 'value' | 'type'
  > {
  value: string;
  onChange: (value: string) => void;
  /** Dipanggil saat user tekan Enter (untuk explicit submit) */
  onSearch?: (value: string) => void;
  onClear?: () => void;
  searchSize?: SearchSize;
  containerClassName?: string;
}

const SIZES: Record<SearchSize, { height: string; text: string; padL: string; padR: string }> = {
  sm: { height: 'h-8', text: 'text-xs', padL: 'pl-8', padR: 'pr-8' },
  md: { height: 'h-[38px]', text: 'text-sm', padL: 'pl-9', padR: 'pr-9' },
  lg: { height: 'h-11', text: 'text-base', padL: 'pl-10', padR: 'pr-10' },
};

const ICON_POS: Record<SearchSize, { left: string; right: string }> = {
  sm: { left: 'left-2.5', right: 'right-2' },
  md: { left: 'left-3', right: 'right-2.5' },
  lg: { left: 'left-3.5', right: 'right-3' },
};

const ICON_SIZE: Record<SearchSize, number> = {
  sm: 12,
  md: 14,
  lg: 16,
};

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    {
      value,
      onChange,
      onSearch,
      onClear,
      searchSize = 'md',
      containerClassName,
      className,
      placeholder = 'Cari...',
      id,
      disabled,
      ...props
    },
    ref
  ) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const sizeStyles = SIZES[searchSize];
    const iconPos = ICON_POS[searchSize];
    const iconSize = ICON_SIZE[searchSize];
    const hasValue = value.length > 0;

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSearch) {
        onSearch(value);
      }
    };

    const handleClear = () => {
      onChange('');
      onClear?.();
    };

    return (
      <div className={cn('relative', containerClassName)}>
        <Search
          size={iconSize}
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute top-1/2 -translate-y-1/2',
            'text-text-muted',
            iconPos.left
          )}
        />

        <input
          ref={ref}
          id={inputId}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full rounded-lg border bg-surface outline-none transition-colors',
            'text-text placeholder:text-text-subtle',
            'border-border focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/15',
            'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-surface-muted',
            sizeStyles.height,
            sizeStyles.text,
            sizeStyles.padL,
            sizeStyles.padR,
            // Hilangkan bawaan browser untuk type="search" (X native di Chrome)
            '[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden',
            className
          )}
          {...props}
        />

        {hasValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Hapus pencarian"
            className={cn(
              'absolute top-1/2 -translate-y-1/2 flex items-center justify-center',
              'rounded-full text-text-muted hover:text-text hover:bg-surface-muted',
              'transition-colors',
              iconPos.right,
              searchSize === 'sm' ? 'h-5 w-5' : searchSize === 'lg' ? 'h-7 w-7' : 'h-6 w-6'
            )}
          >
            <X size={iconSize} />
          </button>
        )}
      </div>
    );
  }
);
