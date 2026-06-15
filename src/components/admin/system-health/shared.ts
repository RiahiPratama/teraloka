/**
 * TeraLoka — System Health shared meta
 * ------------------------------------------------------------
 * Metadata + tone helper dipakai bersama Level 1 (kartu real-time) dan
 * Level 2 (section historis) supaya konsisten (label, grouping, warna).
 * Pure data/util — tanpa state.
 */

import {
  Server,
  Database,
  KeyRound,
  MessageCircle,
  Layers,
  type LucideIcon,
} from 'lucide-react';
import type { HealthServiceKey } from '@/types/health';

/* ─── Service metadata (label + deskripsi fungsi + ikon) ─── */
export const SERVICE_META: Record<
  HealthServiceKey,
  { label: string; desc: string; Icon: LucideIcon }
> = {
  self: { label: 'API', desc: 'Backend TeraLoka', Icon: Server },
  supabase: { label: 'Supabase', desc: 'Database', Icon: Database },
  fonnte: { label: 'Fonnte', desc: 'WhatsApp OTP', Icon: KeyRound },
  waha: { label: 'WAHA', desc: 'WhatsApp Notifikasi', Icon: MessageCircle },
};

/* ─── Grouping (hierarki, bukan 4 kartu flat) ─── */
export const GROUPS: {
  title: string;
  desc: string;
  Icon: LucideIcon;
  keys: HealthServiceKey[];
}[] = [
  { title: 'Core', desc: 'Inti sistem', Icon: Layers, keys: ['self', 'supabase'] },
  {
    title: 'Notifikasi WA',
    desc: 'Kanal WhatsApp',
    Icon: MessageCircle,
    keys: ['fonnte', 'waha'],
  },
];

/* ─── Tone helpers ─── */
export type StatusTone = 'healthy' | 'warning' | 'critical' | 'neutral';

export const TONE_TEXT: Record<StatusTone, string> = {
  healthy: 'text-status-healthy',
  warning: 'text-status-warning',
  critical: 'text-status-critical',
  neutral: 'text-text-muted',
};
export const TONE_BG: Record<StatusTone, string> = {
  healthy: 'bg-status-healthy',
  warning: 'bg-status-warning',
  critical: 'bg-status-critical',
  neutral: 'bg-text-muted',
};

/** Latency → tone by threshold: <100 ijo, 100–500 kuning, >500 merah. */
export function latencyTone(ms: number): StatusTone {
  if (ms < 100) return 'healthy';
  if (ms <= 500) return 'warning';
  return 'critical';
}

/** Uptime % → tone: ≥99.5 ijo, ≥97 kuning, <97 merah, null netral. */
export function uptimeTone(pct: number | null): StatusTone {
  if (pct === null) return 'neutral';
  if (pct >= 99.5) return 'healthy';
  if (pct >= 97) return 'warning';
  return 'critical';
}
