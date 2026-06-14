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
  TRIASE_FRAMEWORK,
  isEnriched,
  formatVolume,
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
  // Centang panduan = keyed `${lens.key}-${i}` (nested, no index math). DISPLAY-ONLY
  // — TIDAK dihitung jadi skor/verdict. Cuma catat centang manusia.
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const willMarkLayak = status === 'layak';
  const checklistIncomplete =
    willMarkLayak &&
    TRIASE_FRAMEWORK.some((lens) => lens.items.some((_, i) => !checked[`${lens.key}-${i}`]));

  function toggle(key: string) {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
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

          {/* Detail Paket (SIRUP) — read-only, NETRAL. Cuma render kalau ter-enrich;
              baris null disembunyiin. 🛡️ unit_price = fakta apa adanya, NO alarm/merah,
              NO interpretasi. */}
          {isEnriched(lead) ? (
            (() => {
              const volume = formatVolume(lead);
              const rows: Array<{ label: string; value: string }> = [];
              if (lead.uraian_pekerjaan) rows.push({ label: 'Uraian', value: lead.uraian_pekerjaan });
              if (volume) rows.push({ label: 'Volume', value: volume });
              if (lead.nama_klpd) rows.push({ label: 'K/L/PD', value: lead.nama_klpd });
              if (lead.lokasi_detail) rows.push({ label: 'Lokasi', value: lead.lokasi_detail });
              if (rows.length === 0) return null;
              return (
                <div className="rounded-lg bg-status-info/5 border border-status-info/20 px-3 py-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted mb-1.5">
                    Detail Paket (SIRUP)
                  </p>
                  <dl className="space-y-1">
                    {rows.map((r) => (
                      <div key={r.label} className="flex gap-2 text-xs">
                        <dt className="text-text-muted shrink-0 w-16">{r.label}</dt>
                        <dd className="text-text flex-1 min-w-0 break-words">{r.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })()
          ) : (
            <p className="text-[11px] text-text-subtle">Detail SIRUP belum ter-enrich.</p>
          )}

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

          {/* 🛡️ Framework triase 3-lensa — muncul saat mau tandai 'layak'.
              PANDUAN keputusan manusia, BUKAN scoring/verdict. No angka, no blocker. */}
          {willMarkLayak && (
            <div className="rounded-lg bg-status-warning/8 border border-status-warning/30 px-3 py-2.5">
              <p className="text-xs font-bold text-status-warning mb-1">
                Pengingat sebelum tandai “Layak Telusur”
              </p>
              <p className="text-[11px] text-text-muted mb-3 leading-snug">
                Ini panduan keputusan, bukan vonis. Kamu yang putuskan.
              </p>

              <div className="space-y-3">
                {TRIASE_FRAMEWORK.map((lens, li) => (
                  <div
                    key={lens.key}
                    className={
                      // Lensa pertama (newsworthiness) sedikit ditekankan — netral, no merah.
                      li === 0
                        ? 'rounded-md bg-status-info/8 border border-status-info/25 px-2.5 py-2'
                        : 'px-0.5'
                    }
                  >
                    <p className="text-[11px] font-bold text-text">{lens.title}</p>
                    <p className="text-[10px] text-text-muted mb-1.5 leading-snug">{lens.hint}</p>
                    <div className="space-y-1.5">
                      {lens.items.map((item, i) => {
                        const key = `${lens.key}-${i}`;
                        return (
                          <label key={key} className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!checked[key]}
                              onChange={() => toggle(key)}
                              className="mt-0.5 accent-status-warning shrink-0"
                            />
                            <span className="text-[11px] text-text leading-snug">{item}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {checklistIncomplete && (
                <p className="text-[11px] text-status-warning/90 mt-2.5">
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
