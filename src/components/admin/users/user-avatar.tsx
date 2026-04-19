'use client';

/**
 * TeraLoka — UserAvatar
 * Phase 2 · Batch 7a3 — Avatar Upload Integration
 * ------------------------------------------------------------
 * Avatar component dengan fallback gradient initial.
 * Support status indicator (red X di corner kalau inactive).
 *
 * Batch 7a3 additions:
 * - `editable` prop → shows camera icon overlay on hover
 * - `onClick` prop → triggered saat avatar di-klik (buka upload modal)
 *
 * Color strategy: pakai role-based gradient.
 * - Admin roles → service color (bakabar purple, bakos amber, dll)
 * - super_admin → brand-teal
 * - Non-admin → neutral gradient (slate)
 *
 * Contoh:
 *   <UserAvatar user={user} />                  // static display
 *   <UserAvatar user={user} size={48} />        // larger
 *   <UserAvatar user={user} editable onClick={openModal} />  // clickable + hover camera
 */

import { useState, type CSSProperties } from 'react';
import { Camera } from 'lucide-react';
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
  /** Allow editing — shows camera overlay on hover + makes clickable */
  editable?: boolean;
  /** Click handler (biasanya buka avatar upload modal) */
  onClick?: () => void;
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
  editable = false,
  onClick,
  className,
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const isActive = user.is_active !== false;

  const gradient = ROLE_GRADIENT[user.role] ?? ROLE_GRADIENT.service_user;

  // Size calculations
  const fontSize = Math.max(11, size * 0.38);
  const statusSize = Math.max(10, size * 0.3);
  const cameraIconSize = Math.max(12, size * 0.4);

  const containerStyle: CSSProperties = {
    width: size,
    height: size,
  };

  const isClickable = editable && Boolean(onClick);

  // Camera overlay (muncul saat hover kalau editable)
  const cameraOverlay = editable ? (
    <div
      className={cn(
        'absolute inset-0 rounded-full',
        'bg-black/50 backdrop-blur-[1px]',
        'flex items-center justify-center',
        'opacity-0 group-hover:opacity-100',
        'transition-opacity duration-150',
        'pointer-events-none'
      )}
      aria-hidden="true"
    >
      <Camera size={cameraIconSize} className="text-white" strokeWidth={2} />
    </div>
  ) : null;

  // Inner content (image atau gradient initial)
  const innerContent =
    user.avatar_url && !imgError ? (
      <>
        <img
          src={user.avatar_url}
          onError={() => setImgError(true)}
          alt={user.name || 'Avatar'}
          className="rounded-full object-cover w-full h-full"
          style={{
            border: `2px solid ${gradient.border}`,
          }}
        />
        {cameraOverlay}
        {showStatus && !isActive && <InactiveIndicator size={statusSize} />}
      </>
    ) : (
      <>
        <div
          className="w-full h-full rounded-full flex items-center justify-center font-extrabold select-none"
          style={{
            background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
            color: gradient.text,
            fontSize,
            border: `2px solid ${gradient.border}`,
          }}
        >
          {userInitial(user)}
        </div>
        {cameraOverlay}
        {showStatus && !isActive && <InactiveIndicator size={statusSize} />}
      </>
    );

  const commonClasses = cn(
    'group relative shrink-0',
    isClickable && 'cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2',
    className
  );

  // Clickable → render sebagai button untuk accessibility
  if (isClickable) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={commonClasses}
        style={containerStyle}
        aria-label={`Ganti foto ${user.name || 'user'}`}
        title="Klik untuk ganti foto"
      >
        {innerContent}
      </button>
    );
  }

  // Display only
  return (
    <div
      className={commonClasses}
      style={containerStyle}
      aria-label={user.name || 'User avatar'}
    >
      {innerContent}
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
