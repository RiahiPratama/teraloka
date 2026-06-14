'use client';

// ════════════════════════════════════════════════════════════════
// Radar Anggaran — Modal tambah lead (create)
// PATH: src/components/admin/radar/lead-form-modal.tsx
// ────────────────────────────────────────────────────────────────
// POST /admin/watchdog. Reuse Dialog/Input/Select/Textarea/Button +
// GeographicScopePicker (region-level). useApi (auth + res.ok).
// ════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { GeographicScopePicker, type LocationScope } from '@/components/shared/locations';
import { useApi, ApiError } from '@/lib/api/client';
import { WATCHDOG_API, PRIORITY_OPTIONS, type WatchdogPriority } from './radar-types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export function LeadFormModal({ open, onClose, onSuccess }: Props) {
  const api = useApi();
  const [paketName, setPaketName] = useState('');
  const [satker, setSatker] = useState('');
  const [pagu, setPagu] = useState('');
  const [scope, setScope] = useState<LocationScope | null>(null);
  const [source, setSource] = useState('');
  const [sumberUrl, setSumberUrl] = useState('');
  const [priority, setPriority] = useState<WatchdogPriority>('sedang');
  const [klasifikasi, setKlasifikasi] = useState('');
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setPaketName(''); setSatker(''); setPagu(''); setScope(null);
    setSource(''); setSumberUrl(''); setPriority('sedang');
    setKlasifikasi(''); setCatatan(''); setError('');
  }

  function close() {
    if (saving) return;
    reset();
    onClose();
  }

  async function submit() {
    if (!paketName.trim() || !satker.trim()) {
      setError('Nama paket & satker wajib diisi.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post(WATCHDOG_API, {
        paket_name:           paketName.trim(),
        satker:               satker.trim(),
        pagu:                 pagu.trim() ? Number(pagu.replace(/[^\d]/g, '')) || null : null,
        location_id:          scope?.id ?? null,
        source:               source.trim() || null,
        sumber_url:           sumberUrl.trim() || null,
        priority,
        klasifikasi_internal: klasifikasi.trim() || null,
        catatan_verifikasi:   catatan.trim() || null,
      });
      reset();
      onSuccess('Lead ditambahkan.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menambah lead. Coba lagi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={close} size="lg">
      <DialogHeader
        title="Tambah Lead Pengawasan"
        description="Catatan internal — lead 'perlu ditelusuri', bukan vonis."
      />
      <DialogBody>
        <div className="space-y-3">
          <Input
            label="Nama Paket / Proyek"
            required
            value={paketName}
            onChange={(e) => setPaketName(e.target.value)}
            placeholder="mis. Pembangunan Jalan Lingkar Ternate"
          />
          <Input
            label="Satker (Satuan Kerja)"
            required
            value={satker}
            onChange={(e) => setSatker(e.target.value)}
            placeholder="mis. Dinas PUPR Kota Ternate"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Pagu (Rp)"
              value={pagu}
              onChange={(e) => setPagu(e.target.value)}
              placeholder="mis. 1500000000"
              inputMode="numeric"
            />
            <Select
              label="Prioritas"
              options={PRIORITY_OPTIONS}
              value={priority}
              onChange={(e) => setPriority(e.target.value as WatchdogPriority)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Daerah</label>
            <GeographicScopePicker
              value={scope}
              onChange={(s: LocationScope | null) => setScope(s)}
              allowedTypes={['kota', 'kabupaten']}
              storageKey="radar_lead_scope"
              placeholder="Pilih daerah (kab/kota)"
              size="full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Sumber"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="mis. SIRUP, LPSE, laporan warga"
            />
            <Input
              label="URL Sumber"
              value={sumberUrl}
              onChange={(e) => setSumberUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>

          <Input
            label="Klasifikasi Internal"
            value={klasifikasi}
            onChange={(e) => setKlasifikasi(e.target.value)}
            placeholder="mis. nilai besar, satker berulang (catatan kerja)"
          />
          <Textarea
            label="Catatan Verifikasi"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Catatan awal — apa yang perlu ditelusuri."
            rows={3}
          />

          {error && <p className="text-xs font-semibold text-status-critical">✗ {error}</p>}
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={close} disabled={saving}>Batal</Button>
        <Button variant="primary" onClick={submit} loading={saving}>Simpan Lead</Button>
      </DialogFooter>
    </Dialog>
  );
}
