'use client';

// ═══════════════════════════════════════════════════════════════
// BALAJU Command Center — Pengaturan Tarif (FARE-V2)
// Path: /admin/balaju/tarif   Route guard: admin/layout.tsx (auth + role)
//
// READ: semua boleh lihat (GET admin_transport). EDIT: super_admin ONLY (PUT super_admin).
//   → tombol Edit cuma muncul kalau user.role === 'super_admin' (selaras guard backend).
//
// 🛡️ 4 GUARDRAIL (money-sensitive):
//   1. Frozen-at-order: reminder di UI (perubahan cuma kena order BARU).
//   2. Validasi bounds: backend otoritas; frontend mirror buat feedback cepat.
//   3. Preview→Apply: form → tinjau diff lama→baru → konfirmasi → PUT.
//   4. Audit: backend catat otomatis (transport.fare_config_audit).
//
// Konsumsi: GET /admin/balaju/fare-config · PUT /admin/balaju/fare-config/:service
// ═══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal, Lock, AlertTriangle, Pencil, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApi, ApiError } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FareConfig {
  service_type: string;
  tarif_minimum: number;
  threshold_km: number;
  per_km: number;
  per_km_long: number;
  long_threshold_km: number;
  komisi_minimal: number;
  komisi_persen: number;
  road_factor: number;
  is_active: boolean;
}
interface FareResponse { configs: FareConfig[]; meta: { model: string } }

const SERVICE_LABELS: Record<string, string> = { ride_bike: 'Ojek', courier: 'Kurir', ride_car: 'Mobil' };

// field editable + meta tampilan (label, unit, tipe)
type FieldKey =
  | 'tarif_minimum' | 'threshold_km' | 'per_km' | 'per_km_long'
  | 'long_threshold_km' | 'komisi_minimal' | 'komisi_persen' | 'road_factor';
const FIELDS: { key: FieldKey; label: string; unit: string; hint?: string }[] = [
  { key: 'tarif_minimum', label: 'Tarif Minimum', unit: 'Rp' },
  { key: 'threshold_km', label: 'Jarak Termasuk', unit: 'km', hint: 'gratis sampai jarak ini' },
  { key: 'per_km', label: 'Per KM', unit: 'Rp/km' },
  { key: 'per_km_long', label: 'Per KM (jauh)', unit: 'Rp/km', hint: '≥ batas jauh' },
  { key: 'long_threshold_km', label: 'Batas Jauh', unit: 'km' },
  { key: 'komisi_minimal', label: 'Komisi Minimal', unit: 'Rp' },
  { key: 'komisi_persen', label: 'Komisi', unit: '%' },
  { key: 'road_factor', label: 'Faktor Jalan', unit: '×', hint: 'jarak jalan ÷ garis lurus' },
];

const fmt = (n: number, unit: string) =>
  unit === 'Rp' || unit === 'Rp/km' ? 'Rp ' + n.toLocaleString('id-ID') : `${n}${unit === '%' ? '%' : unit === '×' ? '×' : ' ' + unit}`;

// validasi mirror backend (feedback cepat; backend tetap otoritas)
function validate(c: Record<FieldKey, number>): string[] {
  const e: string[] = [];
  if (!(c.tarif_minimum > 0)) e.push('Tarif minimum harus > 0');
  if (!(c.threshold_km >= 0)) e.push('Jarak termasuk harus ≥ 0');
  if (!(c.per_km > 0)) e.push('Per km harus > 0');
  if (!(c.komisi_minimal >= 0)) e.push('Komisi minimal harus ≥ 0');
  if (!(c.komisi_persen >= 0 && c.komisi_persen <= 100)) e.push('Komisi harus 0–100%');
  if (!(c.road_factor >= 1)) e.push('Faktor jalan harus ≥ 1');
  if (!(c.per_km_long >= c.per_km)) e.push('Per km (jauh) harus ≥ per km');
  if (!(c.long_threshold_km > c.threshold_km)) e.push('Batas jauh harus > jarak termasuk');
  return e;
}

export default function AdminBalajuTarifPage() {
  const api = useApi();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [configs, setConfigs] = useState<FareConfig[]>([]);
  const [model, setModel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // edit state
  const [editing, setEditing] = useState<string | null>(null); // service_type
  const [draft, setDraft] = useState<Record<FieldKey, string>>({} as Record<FieldKey, string>);
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<FareResponse>('/admin/balaju/fare-config');
      setConfigs(data.configs ?? []);
      setModel(data.meta?.model ?? '');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memuat konfigurasi tarif');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const startEdit = (c: FareConfig) => {
    setEditing(c.service_type);
    setConfirm(false);
    setDraft({
      tarif_minimum: String(c.tarif_minimum),
      threshold_km: String(c.threshold_km),
      per_km: String(c.per_km),
      per_km_long: String(c.per_km_long),
      long_threshold_km: String(c.long_threshold_km),
      komisi_minimal: String(c.komisi_minimal),
      komisi_persen: String(c.komisi_persen),
      road_factor: String(c.road_factor),
    });
  };
  const cancelEdit = () => { setEditing(null); setConfirm(false); };

  const editingConfig = useMemo(
    () => configs.find((c) => c.service_type === editing) ?? null,
    [configs, editing],
  );

  // parse draft → numbers
  const draftNums = useMemo(() => {
    const o = {} as Record<FieldKey, number>;
    (Object.keys(draft) as FieldKey[]).forEach((k) => { o[k] = Number(draft[k]); });
    return o;
  }, [draft]);

  // diff lama→baru
  const diff = useMemo(() => {
    if (!editingConfig) return [] as { key: FieldKey; label: string; unit: string; old: number; next: number }[];
    return FIELDS.filter((f) => draftNums[f.key] !== (editingConfig as unknown as Record<string, number>)[f.key])
      .map((f) => ({
        key: f.key, label: f.label, unit: f.unit,
        old: (editingConfig as unknown as Record<string, number>)[f.key],
        next: draftNums[f.key],
      }));
  }, [editingConfig, draftNums]);

  const validationErrors = useMemo(() => {
    const anyNaN = (Object.keys(draftNums) as FieldKey[]).some((k) => !Number.isFinite(draftNums[k]));
    if (anyNaN) return ['Semua kolom harus diisi angka valid'];
    return validate(draftNums);
  }, [draftNums]);

  const applyChanges = async () => {
    if (!editing || diff.length === 0) return;
    setSaving(true);
    try {
      const body: Record<string, number> = {};
      diff.forEach((d) => { body[d.key] = d.next; });
      const res = await api.put<{ changed: boolean }>(`/admin/balaju/fare-config/${editing}`, body);
      setToast(res.changed ? `Tarif ${SERVICE_LABELS[editing] ?? editing} diperbarui` : 'Tidak ada perubahan');
      cancelEdit();
      fetchConfigs();
    } catch (e) {
      setToast(e instanceof ApiError ? e.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 py-4 sm:px-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="flex items-center gap-2 text-xl font-bold text-text">
          <SlidersHorizontal size={22} className="text-bapasiar" /> Pengaturan Tarif
          <Badge variant="status" status="info"><Lock size={11} className="mr-1" /> FARE-V2</Badge>
        </h1>
        <p className="mt-1 text-sm text-text-muted">{model}</p>
      </div>

      {/* Reminder frozen-at-order */}
      <div className="mb-5 flex items-start gap-2 rounded-lg border border-border-light bg-surface-muted px-3 py-2.5 text-xs text-text-muted">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-status-warning" />
        <span>
          Perubahan tarif <span className="font-semibold text-text">hanya berlaku untuk order BARU</span>. Order berjalan/selesai tarifnya sudah beku, tidak terpengaruh.
          {!isSuperAdmin && ' Hanya Super Admin yang dapat mengedit.'}
        </span>
      </div>

      {/* States */}
      {loading && <div className="py-16 text-center text-sm text-text-muted">Memuat konfigurasi tarif…</div>}
      {!loading && error && (
        <Card variant="muted" className="py-12 text-center">
          <p className="text-sm font-semibold text-status-critical">{error}</p>
          <button onClick={fetchConfigs} className="mt-3 text-sm text-bapasiar hover:underline">Coba lagi</button>
        </Card>
      )}

      {/* Cards per layanan */}
      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {configs.map((c) => (
            <Card key={c.service_type} className="flex flex-col">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-text">{SERVICE_LABELS[c.service_type] ?? c.service_type}</h2>
                  <Badge variant="status" status={c.is_active ? 'healthy' : 'neutral'}>
                    {c.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
                {isSuperAdmin && (
                  <button
                    onClick={() => startEdit(c)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-text-muted hover:bg-surface-muted"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                )}
              </div>
              <dl className="space-y-1.5">
                {FIELDS.map((f) => (
                  <div key={f.key} className="flex items-baseline justify-between gap-2 text-sm">
                    <dt className="text-text-muted">{f.label}</dt>
                    <dd className="font-semibold tabular-nums text-text">
                      {fmt((c as unknown as Record<string, number>)[f.key], f.unit)}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          ))}
        </div>
      )}

      {/* ── Edit modal (super_admin) ── */}
      {editing && editingConfig && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 p-4" onClick={cancelEdit}>
          <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-text">
                Edit Tarif — {SERVICE_LABELS[editing] ?? editing}
              </h3>
              <button onClick={cancelEdit} className="text-text-light hover:text-text"><X size={18} /></button>
            </div>

            {!confirm ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {FIELDS.map((f) => (
                    <label key={f.key} className="block">
                      <span className="text-xs font-medium text-text-muted">{f.label} <span className="text-text-light">({f.unit})</span></span>
                      <input
                        type="number"
                        value={draft[f.key] ?? ''}
                        onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-bapasiar"
                      />
                      {f.hint && <span className="mt-0.5 block text-[10px] text-text-light">{f.hint}</span>}
                    </label>
                  ))}
                </div>

                {validationErrors.length > 0 && (
                  <ul className="mt-3 space-y-0.5 text-xs text-status-critical">
                    {validationErrors.map((e, i) => <li key={i}>• {e}</li>)}
                  </ul>
                )}

                <div className="mt-5 flex items-center justify-end gap-2">
                  <button onClick={cancelEdit} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-muted hover:bg-surface-muted">Batal</button>
                  <button
                    onClick={() => setConfirm(true)}
                    disabled={validationErrors.length > 0 || diff.length === 0}
                    className="rounded-lg bg-bapasiar px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Tinjau Perubahan{diff.length > 0 ? ` (${diff.length})` : ''}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mb-3 text-sm text-text-muted">Konfirmasi perubahan tarif <span className="font-semibold text-text">{SERVICE_LABELS[editing] ?? editing}</span>:</p>
                <div className="space-y-2">
                  {diff.map((d) => (
                    <div key={d.key} className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2 text-sm">
                      <span className="text-text-muted">{d.label}</span>
                      <span className="flex items-center gap-2 font-semibold tabular-nums">
                        <span className="text-status-critical line-through">{fmt(d.old, d.unit)}</span>
                        <span className="text-text-light">→</span>
                        <span className="text-status-healthy">{fmt(d.next, d.unit)}</span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-border-light bg-surface-muted px-3 py-2 text-[11px] text-text-muted">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0 text-status-warning" />
                  Berlaku untuk order BARU saja. Perubahan tercatat di audit.
                </div>
                <div className="mt-5 flex items-center justify-end gap-2">
                  <button onClick={() => setConfirm(false)} disabled={saving} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-muted hover:bg-surface-muted disabled:opacity-50">← Ubah lagi</button>
                  <button onClick={applyChanges} disabled={saving} className="rounded-lg bg-bapasiar px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                    {saving ? 'Menyimpan…' : 'Terapkan'}
                  </button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-text px-4 py-2.5 text-sm font-medium text-surface shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
