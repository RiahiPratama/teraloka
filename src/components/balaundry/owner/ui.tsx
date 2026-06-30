'use client';

// ════════════════════════════════════════════════════════════════
// BALAUNDRY Owner — UI primitives (owner-scoped, shared antar halaman owner)
// PATH: src/components/balaundry/owner/ui.tsx
// ────────────────────────────────────────────────────────────────
// Material Symbols (no emoji/lucide). Royal blue var(--color-balaundry).
// Tone badge order pakai ORDER_STATUS dari balaundry-links (read-only).
// ════════════════════════════════════════════════════════════════

import { useRouter } from 'next/navigation';
import { ORDER_STATUS } from '@/lib/balaundry-links';

/** Material Symbols icon — satu pintu (no emoji, no lucide). */
export function Icon({
  name, size = 20, className, style,
}: { name: string; size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`material-symbols-outlined${className ? ` ${className}` : ''}`} style={{ fontSize: size, ...style }}>
      {name}
    </span>
  );
}

export function Spinner({ size = 28 }: { size?: number }) {
  return <Icon name="progress_activity" size={size} className="animate-spin" style={{ color: 'var(--color-balaundry)' }} />;
}

export function FullScreen({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center bg-slate-50">{children}</div>;
}

/** Auth gate inline (mirror owner/bakos — BUKAN auto-redirect). */
export function AuthGate({ redirect, message }: { redirect: string; message: string }) {
  const router = useRouter();
  return (
    <FullScreen>
      <div className="text-center px-6">
        <div
          className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4"
          style={{ background: 'var(--color-balaundry-muted)' }}
        >
          <Icon name="login" size={26} style={{ color: 'var(--color-balaundry)' }} />
        </div>
        <p className="text-sm font-semibold text-slate-800">{message}</p>
        <p className="text-xs mt-1 mb-4 text-slate-500">Kelola outlet laundry kamu dari sini.</p>
        <button
          onClick={() => router.push(`/login?redirect=${redirect}`)}
          className="text-xs font-semibold px-5 py-2.5 rounded-xl text-white active:scale-95 transition-transform"
          style={{ background: 'var(--color-balaundry)' }}
        >
          Masuk
        </button>
      </div>
    </FullScreen>
  );
}

/** Tone → kelas warna badge (pakai ORDER_STATUS.tone dari links.ts). */
const TONE_CLASS: Record<string, string> = {
  wait:   'bg-amber-50 text-amber-700',
  go:     'bg-sky-50 text-sky-700',
  ready:  'bg-indigo-50 text-indigo-700',
  done:   'bg-emerald-50 text-emerald-700',
  cancel: 'bg-red-50 text-red-700',
};
export function statusToneClass(status: string): string {
  return TONE_CLASS[ORDER_STATUS[status]?.tone ?? ''] ?? 'bg-slate-100 text-slate-600';
}

/** Tanggal lokal WIT (Asia/Jayapura). */
export function formatTanggalWIT(iso: string, withTime = false): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
      timeZone: 'Asia/Jayapura',
    });
  } catch {
    return iso;
  }
}
