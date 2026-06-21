'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS — Modal "Filter Fasilitas" (publik, hero + /cari)
// PATH: src/components/bakos/public/FacilityFilterModal.tsx
// Pola industri (MamiKos/Airbnb): SEMUA fasilitas, 2 grup (Kamar/Bersama),
// pill-toggle, draft + "Terapkan" (bukan live-apply). Pakai Dialog existing
// (ESC/backdrop/scroll-lock/tombol-X sudah ada di primitive). Sumber kebenaran
// tetap `value` di parent → deep-link ?facilities= & quick-chip sinkron (1 array).
//
// PEMISAH HEADER ↔ ISI:
//   Deskripsi dirender DI BODY (bukan DialogHeader) → jarak header→konten dikontrol
//   di file ini. Hairline pakai rgba eksplisit (mid-gray translucent) — DIJAMIN
//   keliatan di modal gelap, gak gantung token yg nama var-nya gak pasti.
//   Jarak deskripsi→grup dirapetin (pb14/mb14) — gak numpuk, gak kejauhan.
// ════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { FAC_GROUPS, facLabel } from './bakos-links';

interface FacilityFilterModalProps {
  open: boolean;
  onClose: () => void;
  value: string[];                    // facilities aktif (sumber kebenaran di parent)
  onApply: (keys: string[]) => void;  // commit draft (set facilities di parent)
}

export function FacilityFilterModal({ open, onClose, value, onApply }: FacilityFilterModalProps) {
  // draft lokal — commit HANYA saat "Terapkan". Re-sync tiap modal dibuka
  // (tutup tanpa apply = batal, draft dibuang).
  const [draft, setDraft] = useState<string[]>(value);
  useEffect(() => { if (open) setDraft(value); }, [open, value]);

  const toggle = (key: string) =>
    setDraft((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));

  const pill = (key: string) => {
    const on = draft.includes(key);
    return (
      <button
        key={key}
        type="button"
        aria-pressed={on}
        onClick={() => toggle(key)}
        // chip single-source: class CSS `.bk-fac-chip` (bakos-landing.css) — BUKAN Tailwind
        // utility (kestrip `.bakos-lp button`). Centang muncul HANYA saat .on (diatur CSS).
        className={cn('bk-fac-chip', on && 'on')}
      >
        <span className="check material-symbols-outlined">check</span>
        {facLabel(key)}
      </button>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} size="lg" ariaLabel="Filter fasilitas">
      {/* header = JUDUL doang. Deskripsi turun ke body (lihat catatan di atas). */}
      <DialogHeader tone="primary" title="Filter Fasilitas" />

      <DialogBody>
        {/* INTRO + hairline. rgba eksplisit = dijamin keliatan. pb14/mb14 = jarak pas. */}
        <p
          className="text-sm leading-relaxed text-text-secondary"
          style={{
            paddingBottom: 14,
            marginBottom: 14,
            borderBottom: '1px solid rgba(148, 163, 184, 0.22)',
          }}
        >
          Pilih fasilitas yang kamu butuhkan. Hasil mencakup kos yang punya SEMUA fasilitas terpilih.
        </p>

        <div className="flex flex-col gap-6">
          {FAC_GROUPS.map((g) => (
            <div key={g.title}>
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-muted">
                {g.title}
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(g.dict).map((key) => pill(key))}
              </div>
            </div>
          ))}
        </div>
      </DialogBody>

      <DialogFooter>
        <button type="button" className="bk-fac-btn ghost" onClick={() => setDraft([])}>
          Reset
        </button>
        <button type="button" className="bk-fac-btn fill" onClick={() => { onApply(draft); onClose(); }}>
          Terapkan{draft.length ? ` (${draft.length})` : ''}
        </button>
      </DialogFooter>
    </Dialog>
  );
}
