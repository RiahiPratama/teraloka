'use client';

// ════════════════════════════════════════════════════════════════
// Radar Anggaran — Modal triase lead (PATCH status/priority/catatan)
// PATH: src/components/admin/radar/lead-triase-modal.tsx
// ────────────────────────────────────────────────────────────────
// 🛡️ Checklist pengingat anti-pidana MUNCUL saat status diarahkan ke
// 'layak' — reminder kerja internal sebelum lead dianggap layak telusur.
// NO tombol "jadiin artikel" (human gap pelindung hukum).
// ════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useApi, ApiError } from '@/lib/api/client';
import {
  WATCHDOG_API,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  VERIFICATION_CHECKLIST,
  formatPagu,
  type WatchdogLead,
  type WatchdogStatus,
  type WatchdogPriority,
} from './radar-types';

interface Props {
  lead: WatchdogLead;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export function LeadTriaseModal({ lead, onClose, onSuccess }: Props) {
  const api = useApi();
  const [status, setStatus] = useState<WatchdogStatus>(lead.status);
  const [priority, setPriority] = useState<WatchdogPriority>(lead.priority);
  const [catatan, setCatatan] = useState(lead.catatan_verifikasi ?? '');
  const [checked, setChecked] = useState<boolean[]>(VERIFICATION_CHECKLIST.map(() => false));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const willMarkLayak = status === 'layak';
  const checklistIncomplete = willMarkLayak && checked.some((c) => !c);

  function toggle(i: number) {
    setChecked((prev) => prev.map((c, idx) => (idx === i ? !c : c)));
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      await api.patch(`${WATCHDOG_API}/${lead.id}`, {
        status,
        priority,
        catatan_verifikasi: catatan.trim() || null,
      });
      onSuccess('Triase tersimpan.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menyimpan triase. Coba lagi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={saving ? () => {} : onClose} size="lg">
      <DialogHeader
        title="Triase Lead"
        description="Pengawasan internal — update status & catatan telusur."
      />
      <DialogBody>
        <div className="space-y-3">
          {/* Ringkasan lead (read-only) */}
          <div className="rounded-lg bg-surface-muted border border-border px-3 py-2">
            <p className="text-sm font-bold text-text leading-tight">{lead.paket_name}</p>
            <p className="text-xs text-text-muted mt-0.5">
              {lead.satker} · {formatPagu(lead.pagu)}
            </p>
            {lead.sumber_url && (
              <a
                href={lead.sumber_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-brand-teal hover:underline break-all"
              >
                {lead.sumber_url}
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => setStatus(e.target.value as WatchdogStatus)}
            />
            <Select
              label="Prioritas"
              options={PRIORITY_OPTIONS}
              value={priority}
              onChange={(e) => setPriority(e.target.value as WatchdogPriority)}
            />
          </div>

          {/* 🛡️ Checklist pengingat — muncul saat mau tandai 'layak' */}
          {willMarkLayak && (
            <div className="rounded-lg bg-status-warning/8 border border-status-warning/30 px-3 py-2.5">
              <p className="text-xs font-bold text-status-warning mb-2">
                Pengingat sebelum tandai “Layak Telusur”
              </p>
              <div className="space-y-1.5">
                {VERIFICATION_CHECKLIST.map((item, i) => (
                  <label key={i} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked[i]}
                      onChange={() => toggle(i)}
                      className="mt-0.5 accent-status-warning shrink-0"
                    />
                    <span className="text-[11px] text-text leading-snug">{item}</span>
                  </label>
                ))}
              </div>
              {checklistIncomplete && (
                <p className="text-[11px] text-status-warning/90 mt-2">
                  Belum semua poin dicek — pastikan dulu sebelum lanjut (pengingat, bukan blokir).
                </p>
              )}
            </div>
          )}

          <Textarea
            label="Catatan Verifikasi"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Hasil telusur, dokumen yang dicek, langkah berikutnya."
            rows={4}
          />

          {error && <p className="text-xs font-semibold text-status-critical">✗ {error}</p>}
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose} disabled={saving}>Batal</Button>
        <Button variant="primary" onClick={save} loading={saving}>Simpan Triase</Button>
      </DialogFooter>
    </Dialog>
  );
}
