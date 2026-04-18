'use client';

/**
 * TeraLoka — Card
 * Phase 2 · Batch 3a — UI Primitives Core
 * ------------------------------------------------------------
 * Card wrapper + compositional sub-components. Pakai semantic tokens
 * jadi auto-switch light/dark.
 *
 * Variants:
 * - default  → bg-surface + border (standar, paling banyak dipakai)
 * - elevated → bg-surface-elevated + shadow (modal, floating panel)
 * - muted    → bg-surface-muted tanpa border (inline/nested section)
 *
 * Komposisi:
 *   <Card>
 *     <CardHeader>
 *       <CardTitle>Judul</CardTitle>
 *       <CardDescription>Subjudul opsional</CardDescription>
 *     </CardHeader>
 *     <CardContent>
 *       konten utama
 *     </CardContent>
 *     <CardFooter>
 *       <Button>Aksi</Button>
 *     </CardFooter>
 *   </Card>
 *
 * Semua sub-component optional — bisa pakai <Card> polos aja isinya apa aja.
 */

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/* ─── Card ─── */

type CardVariant = 'default' | 'elevated' | 'muted';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /** Padding default dalam card. Set false kalau mau full custom padding. */
  padded?: boolean;
}

const CARD_VARIANTS: Record<CardVariant, string> = {
  default: 'bg-surface border border-border',
  elevated:
    'bg-surface-elevated border border-border shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)]',
  muted: 'bg-surface-muted',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'default', padded = true, className, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl',
        CARD_VARIANTS[variant],
        padded && 'p-5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

/* ─── CardHeader ─── */

export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(function CardHeader({ className, children, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn('flex flex-col gap-1 mb-4', className)}
      {...props}
    >
      {children}
    </div>
  );
});

/* ─── CardTitle ─── */

export const CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(function CardTitle({ className, children, ...props }, ref) {
  return (
    <h3
      ref={ref}
      className={cn(
        'text-base font-bold text-text leading-tight',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
});

/* ─── CardDescription ─── */

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(function CardDescription({ className, children, ...props }, ref) {
  return (
    <p
      ref={ref}
      className={cn('text-sm text-text-muted leading-relaxed', className)}
      {...props}
    >
      {children}
    </p>
  );
});

/* ─── CardContent ─── */

export const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(function CardContent({ className, children, ...props }, ref) {
  return (
    <div ref={ref} className={cn('text-sm text-text-secondary', className)} {...props}>
      {children}
    </div>
  );
});

/* ─── CardFooter ─── */

export const CardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(function CardFooter({ className, children, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-2 mt-4 pt-4 border-t border-border',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
