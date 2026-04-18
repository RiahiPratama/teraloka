'use client';

/**
 * TeraLoka — SidebarTeamLive
 * Phase 2 · Batch 5c — Layout Shell (Footer)
 * ------------------------------------------------------------
 * Avatar stack menunjukkan tim admin yang sedang online.
 * Pre-launch reality: 1 admin (Riahi) — card tetap tampil dengan
 * current user sebagai "online" (visual vitality).
 *
 * Features:
 * - Overlapping avatars (max 5 visible, +N overflow)
 * - Pulse green dot di avatar pertama (kalau ada yang online)
 * - Auto-hide kalau members empty + no currentUser
 *
 * Contoh:
 *   <SidebarTeamLive
 *     currentUser={{ name: 'Riahi' }}
 *     members={[]}
 *   />
 *
 *   // Multi-admin mode
 *   <SidebarTeamLive
 *     currentUser={{ name: 'Riahi' }}
 *     members={[
 *       { id: '1', name: 'Budi',  online: true },
 *       { id: '2', name: 'Ani',   online: false },
 *     ]}
 *   />
 */

import { cn } from '@/lib/utils';

export interface TeamMember {
  id: string;
  name: string;
  online?: boolean;
  /** Optional avatar URL (fallback ke inisial kalau gak ada) */
  avatarUrl?: string;
}

export interface SidebarTeamLiveProps {
  /** Current logged-in user — ditampilkan paling kiri + "you" marker */
  currentUser?: { name?: string | null };
  /** Member lain */
  members?: TeamMember[];
  /** Max avatars visible sebelum +N overflow (default 4 karena 1 slot untuk currentUser) */
  maxVisible?: number;
  className?: string;
}

/* ─── Generate consistent color per member via name hash ─── */

const AVATAR_GRADIENTS = [
  'from-brand-teal-lighter to-brand-blue',
  'from-analytics to-bakabar',
  'from-bakos to-baantar',
  'from-users to-bapasiar',
  'from-badonasi to-balapor',
];

function gradientForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx];
}

function initialOf(name?: string | null): string {
  return (name?.charAt(0) ?? '?').toUpperCase();
}

/* ─── Single avatar bubble ─── */

function Avatar({
  name,
  avatarUrl,
  online,
  isFirst,
}: {
  name: string;
  avatarUrl?: string;
  online?: boolean;
  isFirst?: boolean;
}) {
  return (
    <div
      className="relative inline-flex shrink-0 group"
      title={`${name}${online ? ' · online' : ''}`}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          className={cn(
            'h-7 w-7 rounded-full object-cover',
            'ring-2 ring-brand-sidebar'
          )}
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center',
            'h-7 w-7 rounded-full',
            'bg-gradient-to-br',
            gradientForName(name),
            'text-white text-[10px] font-bold leading-none',
            'ring-2 ring-brand-sidebar'
          )}
          aria-hidden="true"
        >
          {initialOf(name)}
        </div>
      )}
      {online && isFirst && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute -bottom-0.5 -right-0.5',
            'h-2 w-2 rounded-full bg-status-healthy',
            'ring-[1.5px] ring-brand-sidebar',
            'animate-pulse'
          )}
        />
      )}
    </div>
  );
}

/* ─── Component ─── */

export function SidebarTeamLive({
  currentUser,
  members = [],
  maxVisible = 4,
  className,
}: SidebarTeamLiveProps) {
  // Normalize current user ke format TeamMember
  const hasCurrentUser = Boolean(currentUser?.name);
  const onlineMembers = members.filter((m) => m.online);
  const totalOnline = onlineMembers.length + (hasCurrentUser ? 1 : 0);

  // Kalau gak ada siapa-siapa, hide component
  if (!hasCurrentUser && members.length === 0) return null;

  // Build display list: current user first, then others (online before offline)
  const displayList: Array<{ key: string; name: string; avatarUrl?: string; online: boolean; isYou: boolean }> = [];
  if (hasCurrentUser) {
    displayList.push({
      key: 'you',
      name: currentUser!.name!,
      online: true,
      isYou: true,
    });
  }
  [...onlineMembers, ...members.filter((m) => !m.online)].forEach((m) => {
    displayList.push({
      key: m.id,
      name: m.name,
      avatarUrl: m.avatarUrl,
      online: !!m.online,
      isYou: false,
    });
  });

  const visible = displayList.slice(0, maxVisible);
  const overflow = displayList.length - visible.length;

  return (
    <div className={cn('shrink-0 px-3 pt-3', className)}>
      <div
        className={cn(
          'flex items-center gap-2.5 px-2.5 py-2 rounded-lg',
          'bg-white/[0.03] border border-white/[0.05]'
        )}
      >
        {/* Eyebrow label */}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/40">
            Tim Live
          </span>
          <span className="text-[10.5px] text-brand-teal-mint font-semibold tabular-nums mt-0.5">
            {totalOnline} online
          </span>
        </div>

        {/* Avatar stack */}
        <div className="flex items-center -space-x-2">
          {visible.map((m, idx) => (
            <Avatar
              key={m.key}
              name={m.name}
              avatarUrl={m.avatarUrl}
              online={m.online}
              isFirst={idx === 0}
            />
          ))}
          {overflow > 0 && (
            <div
              className={cn(
                'flex items-center justify-center shrink-0',
                'h-7 w-7 rounded-full',
                'bg-white/[0.08] text-white/60',
                'text-[10px] font-bold leading-none',
                'ring-2 ring-brand-sidebar'
              )}
              aria-label={`${overflow} anggota tim lain`}
              title={`+${overflow} anggota lain`}
            >
              +{overflow}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
