'use client';

/**
 * TeraLoka — UserRow
 * Phase 2 · Batch 7a1 — Users Page Migration
 * ------------------------------------------------------------
 * Single user row di tabel /admin/users.
 *
 * Layout (grid):
 * [Avatar 48px][Name flex][Portal 160px][Status 100px][Role 130px][Last 110px][Actions 100px]
 *
 * Batch 7a1 scope:
 * - Full row rendering (avatar, info, portal badges, status, role, last seen)
 * - Dropdown menu SHELL dengan placeholder items (Edit, Ganti WA, Nonaktifkan, Hapus)
 *   dengan label "Segera hadir" — tidak functional di 7a1
 * - Current user indicator ("KAMU" badge)
 *
 * Batch 7a2 scope (future):
 * - Wire up actions ke modals (onEditName, onEditPhone, onToggleActive, onDelete, onChangeRole)
 * - Avatar upload flow
 */

import Link from 'next/link';
import { useState, useRef, useEffect, type MouseEvent } from 'react';
import { MoreHorizontal, Edit3, Phone, Ban, CheckCircle2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from './user-avatar';
import {
  ROLE_CONFIG,
  formatPhone,
  lastSeen,
  timeAgo,
  userDisplayName,
  type User,
  type UserRole,
} from '@/types/users';

export interface UserRowProps {
  user: User;
  /** ID user yang sedang login (untuk "KAMU" indicator + guard) */
  currentUserId?: string;
  /** Apakah row ini lagi action loading (disable interactions) */
  loading?: boolean;
  /** Callback slots — akan di-wire di Batch 7a2 */
  onEditName?: (user: User) => void;
  onEditPhone?: (user: User) => void;
  onToggleActive?: (user: User) => void;
  onDelete?: (user: User) => void;
  onChangeRole?: (user: User, newRole: UserRole) => void;
}

/* ─── Role Badge ─── */

function RoleBadge({ role }: { role: UserRole }) {
  const config = ROLE_CONFIG[role];

  // Special cases untuk role yang service=null (super_admin, service_user)
  if (role === 'super_admin') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded-md',
          'text-[11px] font-bold whitespace-nowrap',
          'bg-brand-teal/10 text-brand-teal border border-brand-teal/20'
        )}
      >
        {config.label}
      </span>
    );
  }

  if (role === 'service_user') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded-md',
          'text-[11px] font-bold whitespace-nowrap',
          'bg-surface-muted text-text-muted border border-border'
        )}
      >
        {config.label}
      </span>
    );
  }

  // Admin + operator + owner — pakai Badge service variant
  return (
    <Badge
      variant="service"
      service={config.service!}
      style_="soft"
      size="sm"
    >
      {config.label}
    </Badge>
  );
}

/* ─── Portal Group Pills ─── */

function PortalPills({ role }: { role: UserRole }) {
  const config = ROLE_CONFIG[role];
  return (
    <div className="flex flex-wrap gap-1">
      {config.portals.map((p) => (
        <Badge
          key={p.label}
          variant="service"
          service={p.service}
          style_="soft"
          size="xs"
        >
          {p.label}
        </Badge>
      ))}
    </div>
  );
}

/* ─── Status Badge ─── */

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
        'text-[11px] font-semibold whitespace-nowrap',
        isActive
          ? 'bg-status-healthy/10 text-status-healthy'
          : 'bg-status-critical/10 text-status-critical'
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          isActive ? 'bg-status-healthy' : 'bg-status-critical'
        )}
      />
      {isActive ? 'Aktif' : 'Nonaktif'}
    </span>
  );
}

/* ─── Actions Dropdown Menu ─── */

interface ActionMenuProps {
  user: User;
  isActive: boolean;
  /** Callback slots — kalau undefined, item di-disable dengan "Segera hadir" label */
  onEditPhone?: (user: User) => void;
  onToggleActive?: (user: User) => void;
  onDelete?: (user: User) => void;
}

function ActionMenu({
  user,
  isActive,
  onEditPhone,
  onToggleActive,
  onDelete,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<'down' | 'up'>('down');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | Event) => {
      const target = e.target as HTMLElement;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleTrigger = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDirection(spaceBelow < 200 ? 'up' : 'down');
    }
    setOpen((o) => !o);
  };

  // Items config — disabled kalau callback tidak disediakan
  const items = [
    {
      icon: <Phone size={13} />,
      label: 'Ganti Nomor WA',
      onClick: onEditPhone ? () => { onEditPhone(user); setOpen(false); } : undefined,
      color: 'text-text-secondary',
      hoverBg: 'hover:bg-surface-muted',
    },
    {
      icon: isActive ? <Ban size={13} /> : <CheckCircle2 size={13} />,
      label: isActive ? 'Nonaktifkan' : 'Aktifkan',
      onClick: onToggleActive ? () => { onToggleActive(user); setOpen(false); } : undefined,
      color: isActive ? 'text-status-warning' : 'text-status-healthy',
      hoverBg: isActive
        ? 'hover:bg-status-warning/8'
        : 'hover:bg-status-healthy/8',
      divider: true,
    },
    {
      icon: <Trash2 size={13} />,
      label: 'Hapus Permanen',
      onClick: onDelete ? () => { onDelete(user); setOpen(false); } : undefined,
      color: 'text-status-critical',
      hoverBg: 'hover:bg-status-critical/8',
      divider: true,
    },
  ];

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTrigger}
        className={cn(
          'inline-flex items-center justify-center',
          'h-7 w-7 rounded-md',
          'border border-border bg-surface',
          'text-text-muted hover:text-text hover:bg-surface-muted',
          'transition-colors',
          open && 'bg-surface-muted text-text'
        )}
        aria-label="Aksi lainnya"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreHorizontal size={14} />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          className={cn(
            'absolute right-0 z-50',
            'min-w-[180px] rounded-lg overflow-hidden',
            'bg-surface border border-border',
            'shadow-lg',
            direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
          )}
          style={{ animation: 'fadeIn 0.15s ease' }}
        >
          {items.map((item, idx) => {
            const disabled = !item.onClick;
            return (
              <div key={item.label}>
                {item.divider && (
                  <div className="h-px bg-border-muted" aria-hidden="true" />
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={item.onClick}
                  disabled={disabled}
                  className={cn(
                    'w-full flex items-center gap-2 px-3.5 py-2.5',
                    'text-left text-[12px] font-semibold',
                    'transition-colors',
                    disabled
                      ? 'text-text-subtle cursor-not-allowed opacity-60'
                      : cn(item.color, item.hoverBg, 'cursor-pointer')
                  )}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {disabled && (
                    <span className="text-[9px] font-medium uppercase tracking-wide text-text-subtle">
                      Segera
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Main UserRow component ─── */

export function UserRow({
  user,
  currentUserId,
  loading = false,
  onEditName,
  onEditPhone,
  onToggleActive,
  onDelete,
}: UserRowProps) {
  const isCurrentUser = user.id === currentUserId;
  const isActive = user.is_active !== false;

  return (
    <div
      className={cn(
        'grid items-center gap-3 px-4 py-3',
        'border-b border-border last:border-b-0',
        'transition-colors',
        loading && 'opacity-50 pointer-events-none',
        !isActive && 'bg-status-critical/[0.015]',
        'hover:bg-surface-muted/40'
      )}
      style={{
        gridTemplateColumns:
          '48px minmax(0, 1fr) 180px 110px 130px 110px 80px',
      }}
    >
      {/* Avatar */}
      <UserAvatar user={user} size={36} />

      {/* Name + Phone */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-bold text-[13px] text-text truncate">
            {user.name || (
              <span className="italic text-text-muted font-medium">
                Belum isi nama
              </span>
            )}
          </span>
          {isCurrentUser && (
            <span
              className={cn(
                'shrink-0 px-1.5 py-0.5 rounded',
                'text-[9px] font-extrabold uppercase tracking-wide',
                'bg-brand-teal/12 text-brand-teal'
              )}
            >
              Kamu
            </span>
          )}
        </div>
        <div className="text-[11px] text-text-muted tabular-nums">
          {formatPhone(user.phone)}
        </div>
      </div>

      {/* Portal Groups */}
      <PortalPills role={user.role} />

      {/* Status */}
      <StatusBadge isActive={isActive} />

      {/* Role */}
      <div className="min-w-0">
        <RoleBadge role={user.role} />
      </div>

      {/* Last Seen */}
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-text leading-tight">
          {lastSeen(user.last_login)}
        </div>
        <div className="text-[10px] text-text-muted leading-tight mt-0.5">
          Gabung {timeAgo(user.created_at)}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 justify-end">
        <button
          type="button"
          onClick={onEditName ? () => onEditName(user) : undefined}
          disabled={!onEditName}
          className={cn(
            'inline-flex items-center justify-center',
            'h-7 px-2.5 rounded-md',
            'text-[11px] font-semibold',
            'border border-border bg-surface',
            'transition-colors',
            onEditName
              ? 'text-text-secondary hover:bg-surface-muted hover:text-text cursor-pointer'
              : 'text-text-subtle cursor-not-allowed opacity-60'
          )}
          title={onEditName ? 'Edit nama' : 'Edit (segera hadir)'}
        >
          <Edit3 size={11} />
        </button>

        {!isCurrentUser && (
          <ActionMenu
            user={user}
            isActive={isActive}
            onEditPhone={onEditPhone}
            onToggleActive={onToggleActive}
            onDelete={onDelete}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Table header (convenience export) ───
 * Dipakai di page.tsx atas tabel.
 */
export function UserTableHeader() {
  return (
    <div
      className={cn(
        'grid items-center gap-3 px-4 py-3',
        'bg-surface-muted/50 border-b border-border',
        'text-[10px] font-bold uppercase tracking-wider text-text-muted'
      )}
      style={{
        gridTemplateColumns:
          '48px minmax(0, 1fr) 180px 110px 130px 110px 80px',
      }}
    >
      <span />
      <span>Nama</span>
      <span>Portal</span>
      <span>Status</span>
      <span>Role</span>
      <span>Aktivitas</span>
      <span className="text-right">Aksi</span>
    </div>
  );
}
