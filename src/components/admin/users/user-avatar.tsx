'use client';

/**
 * TeraLoka — UserAvatar
 * Phase 2 · Batch 7a1 — Users Page Migration
 * ------------------------------------------------------------
 * Avatar component dengan fallback gradient initial.
 * Support status indicator (red X di corner kalau inactive).
 *
 * Batch 7a1 scope: DISPLAY ONLY.
 * Upload flow akan dihandle di Batch 7a2 via <UserAvatarUpload>
 * component terpisah.
 *
 * Color strategy: pakai role-based gradient.
 * - Admin roles → service color (bakabar purple, bakos amber, dll)
 * - super_admin → brand-teal
 * - Non-admin → neutral gradient (slate)
 *
 * Contoh:
 *   <UserAvatar user={user} />              // default 36px
 *   <UserAvatar user={user} size={48} />    // larger
 *   <UserAvatar user={user} size={24} showStatus={false} /> // no status dot
 */

import { useState, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import {
  ROLE_CONFIG,
  userInitial,
  type User,
} from '@/types/users';

export interface UserAvatarProps {
  user: Pick<User, 'name' | 'role' | 'avatar_url' | 'is_active'>;
  /** Size in px. Default 36. */
  size?: number;
  /** Show inactive indicator (red X di corner). Default true. */
  showStatus?: boolean;
  /** Optional additional className */
  className?: string;
}

/* ─── Role → Tailwind color class mapping untuk gradient ───
 * Karena gradient butuh 2 color stops, pakai Tailwind color utility
 * yang resolve ke CSS var.
 *
 * Format: { main: hex, light: hex } — cukup 2 kode hex.
 * Fallback ke neutral kalau role tidak ada di mapping.
 */

const ROLE_GRADIENT: Record<
  string,
  { from: string; to: string; text: string; border: string }
> = {
  super_admin: {
    from: 'var(--color-brand-teal)',
    to: 'var(--color-brand-teal-light)',
    text: '#fff',
    border: 'var(--color-brand-teal)',
  },
  admin_content: {
    from: 'var(--color-bakabar)',
    to: 'var(--color-bakabar-strong)',
    text: '#fff',
    border: 'var(--color-bakabar)',
  },
  admin_transport: {
    from: 'var(--color-bapasiar)',
    to: 'var(--color-bapasiar-strong)',
    text: '#fff',
    border: 'var(--color-bapasiar)',
  },
  admin_listing: {
    from: 'var(--color-bakos)',
    to: 'var(--color-bakos-strong)',
    text: '#fff',
    border: 'var(--color-bakos)',
  },
  admin_funding: {
    from: 'var(--color-badonasi)',
    to: 'var(--color-badonasi-strong)',
    text: '#fff',
    border: 'var(--color-badonasi)',
  },
  owner_listing: {
    from: 'var(--color-properti)',
    to: 'var(--color-properti-strong)',
    text: '#fff',
    border: 'var(--color-properti)',
  },
  operator_speed: {
    from: 'var(--color-bapasiar)',
    to: 'var(--color-bapasiar-strong)',
    text: '#fff',
    border: 'var(--color-bapasiar)',
  },
  operator_ship: {
    from: 'var(--color-bapasiar)',
    to: 'var(--color-bapasiar-strong)',
    text: '#fff',
    border: 'var(--color-bapasiar)',
  },
  service_user: {
    from: 'var(--color-kendaraan)',
    to: 'var(--color-kendaraan-strong)',
    text: '#fff',
    border: 'var(--color-kendaraan)',
  },
};

export function UserAvatar({
  user,
  size = 36,
  showStatus = true,
  className,
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const isActive = user.is_active !== false;

  const gradient = ROLE_GRADIENT[user.role] ?? ROLE_GRADIENT.service_user;

  // Size calculations
  const fontSize = Math.max(11, size * 0.38);
  const statusSize = Math.max(10, size * 0.3);

  const containerStyle: CSSProperties = {
    width: size,
    height: size,
  };

  // Show uploaded avatar image if available + not errored
  if (user.avatar_url && !imgError) {
    return (
      <div
        className={cn('relative shrink-0', className)}
        style={containerStyle}
      >
        <img
          src={user.avatar_url}
          onError={() => setImgError(true)}
          alt={user.name || 'Avatar'}
          className="rounded-full object-cover w-full h-full"
          style={{
            border: `2px solid ${gradient.border}`,
          }}
        />
        {showStatus && !isActive && (
          <InactiveIndicator size={statusSize} />
        )}
      </div>
    );
  }

  // Fallback: gradient initial
  return (
    <div
      className={cn(
        'relative shrink-0 flex items-center justify-center rounded-full',
        'font-extrabold select-none',
        className
      )}
      style={{
        ...containerStyle,
        background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
        color: gradient.text,
        fontSize,
        border: `2px solid ${gradient.border}`,
      }}
      aria-label={user.name || 'User avatar'}
    >
      {userInitial(user)}
      {showStatus && !isActive && <InactiveIndicator size={statusSize} />}
    </div>
  );
}

/* ─── Inactive indicator — red circle with X ─── */

function InactiveIndicator({ size }: { size: number }) {
  return (
    <div
      className="absolute -bottom-0.5 -right-0.5 rounded-full bg-status-critical flex items-center justify-center font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.55,
        border: '2px solid var(--color-surface)',
      }}
      aria-label="Akun nonaktif"
    >
      ✕
    </div>
  );
}
