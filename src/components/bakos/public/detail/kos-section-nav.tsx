'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS Detail — Tab-nav section sticky (scroll-spy)
// PATH: src/components/bakos/public/detail/kos-section-nav.tsx
// Controlled: active + onGo dari composer.
// ════════════════════════════════════════════════════════════════
import { SECTIONS } from './types';

export function KosSectionNav({ active, onGo }: { active: string; onGo: (id: string) => void }) {
  return (
    <nav className="bkd-nav">
      {SECTIONS.map((s) => (
        <button key={s.id} className={active === s.id ? 'on' : ''} onClick={() => onGo(s.id)}>
          {s.label}
        </button>
      ))}
    </nav>
  );
}
