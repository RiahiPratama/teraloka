'use client';
// ════════════════════════════════════════════════════════════════
// BALAUNDRY Admin — BulkResultModal (partial-failure bulk-verify)
// PATH: src/components/balaundry/admin/BulkResultModal.tsx
// Tampilkan BulkVerifyResult apa adanya: processed/succeeded/failed +
// daftar gagal (id + kode error → label Indonesia). 🔴 jangan sembunyiin gagal.
// ════════════════════════════════════════════════════════════════
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface BulkVerifyResult {
  processed: number;
  succeeded: number;
  failed: number;
  results: { id: string; ok: boolean; error?: string }[];
}

interface BulkResultModalProps {
  open: boolean;
  onClose: () => void;
  result: BulkVerifyResult;
  /** id → nama laundry, buat baris gagal lebih kebaca. */
  nameById?: Record<string, string>;
}

// Kode error BE → label Indonesia (fallback: kode mentah).
const ERROR_LABEL: Record<string, string> = {
  NOT_FOUND: 'Tidak ditemukan',
  VALIDATION_ERROR: 'Data tidak valid',
  FORBIDDEN: 'Tidak diizinkan',
  CONFLICT: 'Konflik status',
  INTERNAL_ERROR: 'Kesalahan server',
};

function Stat({ icon, label, value, className }: { icon: string; label: string; value: number; className: string }) {
  return (
    <div className={cn('flex-1 rounded-lg border p-3 text-center', className)}>
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
      <div className="mt-0.5 text-xl font-bold tabular-nums">{value}</div>
      <div className="text-[11px] font-medium">{label}</div>
    </div>
  );
}

export function BulkResultModal({ open, onClose, result, nameById = {} }: BulkResultModalProps) {
  const failures = result.results.filter((r) => !r.ok);
  const allOk = result.failed === 0;

  return (
    <Dialog open={open} onClose={onClose} size="md" ariaLabel="Hasil verifikasi massal">
      <DialogHeader
        icon={
          <span className="material-symbols-outlined text-[22px]">
            {allOk ? 'task_alt' : 'rule'}
          </span>
        }
        title="Hasil verifikasi massal"
        description={allOk ? 'Semua laundry berhasil diverifikasi.' : 'Sebagian berhasil, sebagian gagal.'}
        tone={allOk ? 'primary' : 'warning'}
      />
      <DialogBody>
        <div className="flex gap-2">
          <Stat icon="inventory_2" label="Diproses" value={result.processed} className="border-border bg-surface-muted text-text" />
          <Stat icon="check_circle" label="Sukses" value={result.succeeded} className="border-status-healthy/30 bg-status-healthy/10 text-status-healthy" />
          <Stat icon="error" label="Gagal" value={result.failed} className="border-status-critical/30 bg-status-critical/10 text-status-critical" />
        </div>

        {failures.length > 0 && (
          <div className="mt-1">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-subtle">
              Gagal ({failures.length})
            </p>
            <ul className="max-h-52 space-y-1.5 overflow-y-auto">
              {failures.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-status-critical/20 bg-status-critical/5 px-3 py-2"
                >
                  <span className="min-w-0 truncate text-sm text-text">
                    {nameById[f.id] ?? <span className="font-mono text-xs">{f.id.slice(0, 8)}</span>}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-status-critical">
                    {f.error ? (ERROR_LABEL[f.error] ?? f.error) : 'Gagal'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogBody>
      <DialogFooter>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-balaundry px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Tutup
        </button>
      </DialogFooter>
    </Dialog>
  );
}
